import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount: number
}

interface PaymentInfo {
  method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
  amount: number
  bank_account_id?: string
  bank_ref?: string
}

interface DebtOptions {
  due_date?: string
  installments?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  first_due_date?: string
}

interface DebtPaymentRequest {
  amount: number
}

interface CreateSaleRequest {
  action: 'create'
  items: CartItem[]
  payments: PaymentInfo[]
  // Existing customer fields
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
  // Link to registered customer
  customer_id?: string
  // Debt options
  create_debt?: boolean
  debt_type?: 'credit' | 'installment'
  debt_options?: DebtOptions
  // Debt payment (pay extra to reduce existing debt)
  debt_payment?: DebtPaymentRequest
  discount?: number
  note?: string
}

interface GetSaleRequest {
  action: 'get'
  id: string
}

interface ListSalesRequest {
  action: 'list'
  page?: number
  limit?: number
  status?: string
  date_from?: string
  date_to?: string
}

type POSRequest = CreateSaleRequest | GetSaleRequest | ListSalesRequest

// ============================================================================
// Helper Functions for Debt Calculation
// ============================================================================

/**
 * Calculates due dates for installments based on frequency
 */
function calculateInstallmentDueDates(
  firstDueDate: string,
  count: number,
  frequency: 'weekly' | 'biweekly' | 'monthly'
): string[] {
  const dates: string[] = []
  const startDate = new Date(firstDueDate)

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(startDate)

    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + i * 7)
        break
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + i * 14)
        break
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + i)
        break
    }

    dates.push(dueDate.toISOString().split('T')[0])
  }

  return dates
}

/**
 * Calculates installment amounts (divide evenly, last takes remainder)
 */
function calculateInstallmentAmounts(totalAmount: number, count: number): number[] {
  const baseAmount = Math.floor(totalAmount / count)
  const remainder = totalAmount - baseAmount * count

  const amounts: number[] = []
  for (let i = 0; i < count; i++) {
    // Last installment takes the remainder
    amounts.push(i === count - 1 ? baseAmount + remainder : baseAmount)
  }

  return amounts
}

/**
 * Gets the default due date (30 days from now)
 */
function getDefaultDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split('T')[0]
}

// ============================================================================
// Invoice Number Generation
// ============================================================================

// Generate invoice number: HD{YYYYMM}{SEQ}
async function generateInvoiceNo(supabase: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>, storeId: string): Promise<string> {
  const now = new Date()
  const prefix = `HD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

  // Get the last invoice number for this month
  const { data } = await supabase
    .from('sales')
    .select('invoice_no')
    .eq('store_id', storeId)
    .like('invoice_no', `${prefix}%`)
    .order('invoice_no', { ascending: false })
    .limit(1)
    .single()

  let seq = 1
  if (data?.invoice_no) {
    const lastSeq = parseInt(data.invoice_no.slice(-4), 10)
    seq = lastSeq + 1
  }

  return `${prefix}${String(seq).padStart(4, '0')}`
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: POSRequest = await req.json()

    switch (body.action) {
      case 'create': {
        const {
          items,
          payments,
          customer_name,
          customer_phone,
          customer_tax_code,
          customer_id,
          create_debt,
          debt_type,
          debt_options,
          debt_payment,
          discount = 0,
          note,
        } = body

        if (!items || items.length === 0) {
          return errorResponse('Gio hang trong', 400)
        }

        // Allow empty payments if creating debt (unpaid sale)
        if ((!payments || payments.length === 0) && !create_debt) {
          return errorResponse('Chua chon phuong thuc thanh toan', 400)
        }

        // Calculate totals
        let subtotal = 0
        let vat_amount = 0

        for (const item of items) {
          const itemTotal = item.quantity * item.unit_price - item.discount
          const itemVat = itemTotal * (item.vat_rate / 100)
          subtotal += itemTotal
          vat_amount += itemVat
        }

        const total = subtotal + vat_amount - discount

        // Calculate payment total
        const paymentTotal = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const amountDue = total - paymentTotal

        // Validate payment and debt creation logic
        if (paymentTotal < total) {
          // Partial payment or no payment - require debt creation
          if (!create_debt) {
            return errorResponse(
              `So tien thanh toan khong du. Con thieu ${amountDue.toLocaleString('vi-VN')} VND. Vui long tao cong no hoac thanh toan du.`,
              400
            )
          }

          // Debt creation requires customer_id
          if (!customer_id) {
            return errorResponse('Can chon khach hang de tao cong no', 400)
          }

          // Validate debt type
          if (!debt_type || !['credit', 'installment'].includes(debt_type)) {
            return errorResponse('Loai cong no khong hop le', 400)
          }

          // Validate installment-specific requirements
          if (debt_type === 'installment') {
            if (!debt_options?.installments || debt_options.installments < 2 || debt_options.installments > 12) {
              return errorResponse('So ky tra gop phai tu 2 den 12', 400)
            }
            if (!debt_options?.frequency || !['weekly', 'biweekly', 'monthly'].includes(debt_options.frequency)) {
              return errorResponse('Tan suat tra gop khong hop le', 400)
            }
            if (!debt_options?.first_due_date) {
              return errorResponse('Vui long chon ngay tra gop dau tien', 400)
            }
          }

          // Verify customer exists and belongs to this store
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, name')
            .eq('id', customer_id)
            .eq('store_id', store_id)
            .single()

          if (customerError || !customer) {
            return errorResponse('Khong tim thay khach hang', 404)
          }
        }

        // Check stock availability
        for (const item of items) {
          const { data: product } = await supabase
            .from('products')
            .select('id, name, quantity')
            .eq('id', item.product_id)
            .eq('store_id', store_id)
            .single()

          if (!product) {
            return errorResponse(`San pham khong ton tai: ${item.product_name}`, 400)
          }

          if (product.quantity < item.quantity) {
            return errorResponse(`Khong du ton kho: ${item.product_name} (con ${product.quantity})`, 400)
          }
        }

        // Generate invoice number
        const invoice_no = await generateInvoiceNo(supabase, store_id)

        // Determine payment status
        let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid'
        if (paymentTotal === 0) {
          payment_status = 'unpaid'
        } else if (paymentTotal < total) {
          payment_status = 'partial'
        }

        // Create sale record with payment status and amounts
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            store_id,
            user_id: user.id,
            invoice_no,
            subtotal,
            vat_amount,
            discount,
            total,
            status: 'completed',
            payment_status,
            amount_paid: paymentTotal,
            amount_due: amountDue > 0 ? amountDue : 0,
            customer_id: customer_id || null,
            customer_name,
            customer_phone,
            customer_tax_code,
            note,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (saleError) throw saleError

        // Create sale items
        const saleItems = items.map((item) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          vat_amount: (item.quantity * item.unit_price - item.discount) * (item.vat_rate / 100),
          discount: item.discount,
          total: item.quantity * item.unit_price - item.discount,
        }))

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
        if (itemsError) throw itemsError

        // Create payments (only if there are payments)
        let paymentRecords: Array<{
          sale_id: string
          method: string
          amount: number
          bank_account_id?: string
          bank_ref?: string
        }> = []
        if (payments && payments.length > 0) {
          paymentRecords = payments.map((p) => ({
            sale_id: sale.id,
            method: p.method,
            amount: p.amount,
            bank_account_id: p.bank_account_id,
            bank_ref: p.bank_ref,
          }))

          const { error: paymentsError } = await supabase.from('payments').insert(paymentRecords)
          if (paymentsError) throw paymentsError
        }

        // Update product quantities and create inventory logs
        for (const item of items) {
          // Get current quantity and update
          const { data: product } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', item.product_id)
            .single()

          if (product) {
            const newQuantity = product.quantity - item.quantity
            await supabase
              .from('products')
              .update({ quantity: newQuantity })
              .eq('id', item.product_id)
          }

          // Create inventory log
          await supabase.from('inventory_logs').insert({
            store_id,
            product_id: item.product_id,
            type: 'sale',
            quantity: -item.quantity,
            reference_type: 'sale',
            reference_id: sale.id,
            created_by: user.id,
          })
        }

        // Record to cash/bank book (only for actual payments received)
        if (payments && payments.length > 0) {
          for (const payment of payments) {
            if (payment.method === 'cash') {
              await supabase.from('cash_book').insert({
                store_id,
                description: `Ban hang - ${invoice_no}`,
                reference_type: 'sale',
                reference_id: sale.id,
                debit: payment.amount,
                credit: 0,
                created_by: user.id,
              })
            } else if (payment.method === 'bank_transfer' && payment.bank_account_id) {
              // Atomically update bank account balance
              const { error: balanceError } = await supabase.rpc('increment_bank_balance', {
                p_bank_account_id: payment.bank_account_id,
                p_store_id: store_id,
                p_amount: payment.amount,
              })

              if (balanceError) throw balanceError

              // Create bank book entry
              await supabase.from('bank_book').insert({
                store_id,
                bank_account_id: payment.bank_account_id,
                description: `Ban hang - ${invoice_no}`,
                reference_type: 'sale',
                reference_id: sale.id,
                debit: payment.amount,
                credit: 0,
                bank_ref: payment.bank_ref,
              })
            }
          }
        }

        // Create debt record if needed
        let debtInfo: {
          debt: Record<string, unknown>
          installments?: Array<Record<string, unknown>>
        } | null = null

        if (create_debt && amountDue > 0 && customer_id) {
          if (debt_type === 'credit') {
            // Create credit debt
            const { data: debt, error: debtError } = await supabase
              .from('customer_debts')
              .insert({
                store_id,
                customer_id,
                sale_id: sale.id,
                debt_type: 'credit',
                original_amount: amountDue,
                remaining_amount: amountDue,
                due_date: debt_options?.due_date || getDefaultDueDate(),
                notes: `Cong no tu don hang ${invoice_no}`,
                status: 'active',
                created_by: user.id,
              })
              .select()
              .single()

            if (debtError) throw debtError

            debtInfo = { debt }
          } else if (debt_type === 'installment') {
            // Create installment debt
            const { data: debt, error: debtError } = await supabase
              .from('customer_debts')
              .insert({
                store_id,
                customer_id,
                sale_id: sale.id,
                debt_type: 'installment',
                original_amount: amountDue,
                remaining_amount: amountDue,
                due_date: null, // Installments have their own due dates
                notes: `Cong no tra gop tu don hang ${invoice_no}`,
                status: 'active',
                created_by: user.id,
              })
              .select()
              .single()

            if (debtError) throw debtError

            // Calculate installment amounts and due dates
            const installmentAmounts = calculateInstallmentAmounts(amountDue, debt_options!.installments!)
            const installmentDates = calculateInstallmentDueDates(
              debt_options!.first_due_date!,
              debt_options!.installments!,
              debt_options!.frequency!
            )

            // Create installment records
            const installmentRecords = installmentAmounts.map((amt, index) => ({
              debt_id: debt.id,
              installment_number: index + 1,
              amount: amt,
              due_date: installmentDates[index],
              paid_amount: 0,
              status: 'pending',
            }))

            const { data: installmentsData, error: installmentsError } = await supabase
              .from('debt_installments')
              .insert(installmentRecords)
              .select()

            if (installmentsError) throw installmentsError

            debtInfo = {
              debt,
              installments: installmentsData || [],
            }
          }
        }

        // Handle debt payment (pay extra to reduce existing debt)
        let debtPaymentResult: { amount: number; debts_paid: string[] } | null = null

        if (debt_payment && debt_payment.amount > 0 && customer_id) {
          const paymentAmount = debt_payment.amount
          let remainingPayment = paymentAmount
          const debtsPaid: string[] = []

          // Get oldest active debts for this customer
          const { data: activeDebts, error: debtsError } = await supabase
            .from('customer_debts')
            .select('id, remaining_amount, debt_type')
            .eq('customer_id', customer_id)
            .eq('store_id', store_id)
            .in('status', ['active', 'overdue'])
            .order('created_at', { ascending: true })

          if (debtsError) throw debtsError

          // Apply payment to debts in order (oldest first)
          for (const debt of activeDebts || []) {
            if (remainingPayment <= 0) break

            const amountToApply = Math.min(remainingPayment, debt.remaining_amount)

            // Create debt payment record
            const { data: debtPaymentRecord, error: paymentError } = await supabase
              .from('debt_payments')
              .insert({
                store_id,
                debt_id: debt.id,
                amount: amountToApply,
                payment_method: 'cash',
                notes: `Thanh toan khi mua hang - ${invoice_no}`,
                created_by: user.id,
              })
              .select()
              .single()

            if (paymentError) throw paymentError

            // Record to cash_book
            await supabase.from('cash_book').insert({
              store_id,
              description: `Thu no tai quay - ${invoice_no}`,
              reference_type: 'debt_payment',
              reference_id: debtPaymentRecord.id,
              debit: amountToApply,
              credit: 0,
              created_by: user.id,
            })

            debtsPaid.push(debt.id)
            remainingPayment -= amountToApply
          }

          debtPaymentResult = {
            amount: paymentAmount - remainingPayment,
            debts_paid: debtsPaid,
          }
        }

        // Build response
        const response: {
          sale: Record<string, unknown>
          debt?: {
            debt: Record<string, unknown>
            installments?: Array<Record<string, unknown>>
          }
          debt_payment?: { amount: number; debts_paid: string[] }
        } = {
          sale: {
            ...sale,
            items: saleItems,
            payments: paymentRecords,
          },
        }

        if (debtInfo) {
          response.debt = debtInfo
        }

        if (debtPaymentResult) {
          response.debt_payment = debtPaymentResult
        }

        return successResponse(response)
      }

      case 'get': {
        const { id } = body

        const { data: sale, error } = await supabase
          .from('sales')
          .select(`
            *,
            sale_items(*),
            payments(*)
          `)
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (error) throw error

        return successResponse({ sale })
      }

      case 'list': {
        const { page = 1, limit = 20, status, date_from, date_to } = body

        let query = supabase
          .from('sales')
          .select('*, sale_items(count), payments(*)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (status) {
          query = query.eq('status', status)
        }

        if (date_from) {
          query = query.gte('created_at', date_from)
        }

        if (date_to) {
          query = query.lte('created_at', date_to)
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          sales: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('POS function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
