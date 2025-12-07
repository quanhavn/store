import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
  isOwnerOrManager,
} from '../_shared/supabase.ts'

// ============================================================================
// Request Interfaces
// ============================================================================

interface CreateCreditDebtRequest {
  action: 'create_credit'
  customer_id: string
  sale_id?: string
  amount: number
  due_date?: string  // Defaults to 30 days from now
  notes?: string
}

interface CreateInstallmentDebtRequest {
  action: 'create_installment'
  customer_id: string
  sale_id?: string
  amount: number
  installments: number  // 2-12
  first_due_date: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  notes?: string
}

interface RecordPaymentRequest {
  action: 'record_payment'
  debt_id: string
  installment_id?: string
  amount: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id?: string
  bank_ref?: string
  notes?: string
}

interface ListDebtsRequest {
  action: 'list'
  customer_id?: string
  status?: 'active' | 'paid' | 'overdue' | 'all'
  page?: number
  limit?: number
}

interface GetDebtRequest {
  action: 'get'
  id: string
}

interface GetCustomerDebtsRequest {
  action: 'get_customer_debts'
  customer_id: string
}

interface CancelDebtRequest {
  action: 'cancel'
  id: string
  reason: string
}

interface DebtSummaryRequest {
  action: 'summary'
}

type DebtRequest =
  | CreateCreditDebtRequest
  | CreateInstallmentDebtRequest
  | RecordPaymentRequest
  | ListDebtsRequest
  | GetDebtRequest
  | GetCustomerDebtsRequest
  | CancelDebtRequest
  | DebtSummaryRequest

// ============================================================================
// Helper Functions
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
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id, role } = await getUserStore(supabase, user.id)

    const body: DebtRequest = await req.json()

    switch (body.action) {
      // ========================================================================
      // CREATE CREDIT DEBT
      // ========================================================================
      case 'create_credit': {
        const { customer_id, sale_id, amount, due_date, notes } = body

        // Validate amount
        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
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

        // Create the credit debt
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .insert({
            store_id,
            customer_id,
            sale_id,
            debt_type: 'credit',
            original_amount: amount,
            remaining_amount: amount,
            due_date: due_date || getDefaultDueDate(),
            notes,
            status: 'active',
            created_by: user.id,
          })
          .select()
          .single()

        if (debtError) throw debtError

        // If linked to a sale, update sale payment status
        if (sale_id) {
          await supabase
            .from('sales')
            .update({
              payment_status: 'unpaid',
              amount_due: amount,
            })
            .eq('id', sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({
          debt,
          customer: { id: customer.id, name: customer.name },
        })
      }

      // ========================================================================
      // CREATE INSTALLMENT DEBT
      // ========================================================================
      case 'create_installment': {
        const {
          customer_id,
          sale_id,
          amount,
          installments,
          first_due_date,
          frequency,
          notes,
        } = body

        // Validate amount
        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        // Validate installments count (2-12)
        if (installments < 2 || installments > 12) {
          return errorResponse('So ky tra gop phai tu 2 den 12', 400)
        }

        // Validate frequency
        if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
          return errorResponse('Tan suat tra gop khong hop le', 400)
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

        // Create the installment debt
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .insert({
            store_id,
            customer_id,
            sale_id,
            debt_type: 'installment',
            original_amount: amount,
            remaining_amount: amount,
            due_date: null, // Installments have their own due dates
            notes,
            status: 'active',
            created_by: user.id,
          })
          .select()
          .single()

        if (debtError) throw debtError

        // Calculate installment amounts and due dates
        const installmentAmounts = calculateInstallmentAmounts(amount, installments)
        const installmentDates = calculateInstallmentDueDates(first_due_date, installments, frequency)

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

        // If linked to a sale, update sale payment status
        if (sale_id) {
          await supabase
            .from('sales')
            .update({
              payment_status: 'unpaid',
              amount_due: amount,
            })
            .eq('id', sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({
          debt,
          installments: installmentsData,
          customer: { id: customer.id, name: customer.name },
        })
      }

      // ========================================================================
      // RECORD PAYMENT
      // ========================================================================
      case 'record_payment': {
        const {
          debt_id,
          installment_id,
          amount,
          payment_method,
          bank_account_id,
          bank_ref,
          notes,
        } = body

        // Validate amount
        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        // Validate payment method
        if (payment_method === 'bank_transfer' && !bank_account_id) {
          return errorResponse('Vui long chon tai khoan ngan hang', 400)
        }

        // Get debt details
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .select('*, customers(id, name, total_debt)')
          .eq('id', debt_id)
          .eq('store_id', store_id)
          .single()

        if (debtError || !debt) {
          return errorResponse('Khong tim thay cong no', 404)
        }

        if (debt.status === 'paid') {
          return errorResponse('Cong no da thanh toan het', 400)
        }

        if (debt.status === 'cancelled') {
          return errorResponse('Cong no da bi huy', 400)
        }

        // Validate payment amount against remaining
        if (amount > debt.remaining_amount) {
          return errorResponse(
            `So tien thanh toan vuot qua so tien con lai (${debt.remaining_amount.toLocaleString('vi-VN')} VND)`,
            400
          )
        }

        // If installment payment, validate installment
        if (installment_id) {
          const { data: installment, error: installmentError } = await supabase
            .from('debt_installments')
            .select('*')
            .eq('id', installment_id)
            .eq('debt_id', debt_id)
            .single()

          if (installmentError || !installment) {
            return errorResponse('Khong tim thay ky tra gop', 404)
          }

          const installmentRemaining = installment.amount - installment.paid_amount
          if (amount > installmentRemaining) {
            return errorResponse(
              `So tien vuot qua so tien con lai cua ky (${installmentRemaining.toLocaleString('vi-VN')} VND)`,
              400
            )
          }
        }

        // Create debt payment record
        const { data: payment, error: paymentError } = await supabase
          .from('debt_payments')
          .insert({
            store_id,
            debt_id,
            installment_id,
            amount,
            payment_method,
            bank_account_id,
            bank_ref,
            notes,
            created_by: user.id,
          })
          .select()
          .single()

        if (paymentError) throw paymentError

        // Note: The database trigger 'update_debt_on_payment' handles:
        // - Updating remaining_amount on customer_debts
        // - Updating paid_amount on debt_installments
        // - Updating status on debt and installments
        // And the trigger 'update_customer_debt_on_debt_change' handles:
        // - Updating total_debt on customers table

        // Record to cash_book or bank_book
        const customerName = debt.customers?.name || 'Khach hang'
        const description = `Thu no: ${customerName}`

        if (payment_method === 'cash') {
          // Get current cash balance
          const { data: lastEntry } = await supabase
            .from('cash_book')
            .select('balance')
            .eq('store_id', store_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const currentBalance = lastEntry?.balance || 0
          const newBalance = currentBalance + amount

          await supabase.from('cash_book').insert({
            store_id,
            description,
            reference_type: 'debt_payment',
            reference_id: payment.id,
            debit: amount,
            credit: 0,
            balance: newBalance,
            created_by: user.id,
          })
        } else if (payment_method === 'bank_transfer' && bank_account_id) {
          // Atomically update bank account balance
          const { error: balanceError } = await supabase.rpc('increment_bank_balance', {
            p_bank_account_id: bank_account_id,
            p_store_id: store_id,
            p_amount: amount,
          })

          if (balanceError) throw balanceError

          await supabase.from('bank_book').insert({
            store_id,
            bank_account_id,
            description,
            bank_ref,
            reference_type: 'debt_payment',
            reference_id: payment.id,
            debit: amount,
            credit: 0,
          })
        }

        // Get updated debt info
        const { data: updatedDebt } = await supabase
          .from('customer_debts')
          .select('*, customers(id, name, total_debt)')
          .eq('id', debt_id)
          .single()

        // If linked to a sale, update sale payment status
        if (debt.sale_id) {
          const newAmountDue = updatedDebt?.remaining_amount || 0
          const amountPaid = debt.original_amount - newAmountDue

          await supabase
            .from('sales')
            .update({
              payment_status: newAmountDue === 0 ? 'paid' : 'partial',
              amount_paid: amountPaid,
              amount_due: newAmountDue,
            })
            .eq('id', debt.sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({
          payment,
          debt: updatedDebt,
          is_fully_paid: updatedDebt?.remaining_amount === 0,
        })
      }

      // ========================================================================
      // LIST DEBTS
      // ========================================================================
      case 'list': {
        const { customer_id, status = 'all', page = 1, limit = 20 } = body

        let query = supabase
          .from('customer_debts')
          .select('*, customers(id, name, phone)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (customer_id) {
          query = query.eq('customer_id', customer_id)
        }

        if (status !== 'all') {
          query = query.eq('status', status)
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          debts: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      // ========================================================================
      // GET DEBT DETAIL
      // ========================================================================
      case 'get': {
        const { id } = body

        // Get debt with customer info
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .select('*, customers(id, name, phone, address)')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (debtError || !debt) {
          return errorResponse('Khong tim thay cong no', 404)
        }

        // Get installments if installment debt
        let installments = null
        if (debt.debt_type === 'installment') {
          const { data: installmentsData } = await supabase
            .from('debt_installments')
            .select('*')
            .eq('debt_id', id)
            .order('installment_number')

          installments = installmentsData
        }

        // Get payment history
        const { data: payments } = await supabase
          .from('debt_payments')
          .select('*, debt_installments(installment_number)')
          .eq('debt_id', id)
          .order('paid_at', { ascending: false })

        return successResponse({
          debt,
          installments,
          payments,
        })
      }

      // ========================================================================
      // GET CUSTOMER DEBTS
      // ========================================================================
      case 'get_customer_debts': {
        const { customer_id } = body

        // Verify customer exists
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name, phone, address, total_debt')
          .eq('id', customer_id)
          .eq('store_id', store_id)
          .single()

        if (customerError || !customer) {
          return errorResponse('Khong tim thay khach hang', 404)
        }

        // Get all debts for this customer
        const { data: debts, error: debtsError } = await supabase
          .from('customer_debts')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (debtsError) throw debtsError

        // Get installments for installment debts
        const installmentDebtIds = debts
          .filter(d => d.debt_type === 'installment')
          .map(d => d.id)

        let installmentsMap: Record<string, unknown[]> = {}
        if (installmentDebtIds.length > 0) {
          const { data: installments } = await supabase
            .from('debt_installments')
            .select('*')
            .in('debt_id', installmentDebtIds)
            .order('installment_number')

          if (installments) {
            installmentsMap = installments.reduce((acc, inst) => {
              if (!acc[inst.debt_id]) acc[inst.debt_id] = []
              acc[inst.debt_id].push(inst)
              return acc
            }, {} as Record<string, unknown[]>)
          }
        }

        // Attach installments to debts
        const debtsWithInstallments = debts.map(debt => ({
          ...debt,
          installments: debt.debt_type === 'installment' ? installmentsMap[debt.id] || [] : null,
        }))

        // Calculate summary
        const summary = {
          total_debt: customer.total_debt,
          active_debts: debts.filter(d => d.status === 'active').length,
          overdue_debts: debts.filter(d => d.status === 'overdue').length,
          paid_debts: debts.filter(d => d.status === 'paid').length,
        }

        return successResponse({
          customer,
          debts: debtsWithInstallments,
          summary,
        })
      }

      // ========================================================================
      // CANCEL DEBT
      // ========================================================================
      case 'cancel': {
        const { id, reason } = body

        // Manager only
        if (!isOwnerOrManager(role)) {
          return errorResponse('Chi quan ly moi co quyen huy cong no', 403)
        }

        if (!reason || reason.trim().length < 5) {
          return errorResponse('Vui long nhap ly do huy (it nhat 5 ky tu)', 400)
        }

        // Get debt
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .select('*, customers(id)')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (debtError || !debt) {
          return errorResponse('Khong tim thay cong no', 404)
        }

        if (debt.status === 'paid') {
          return errorResponse('Khong the huy cong no da thanh toan', 400)
        }

        if (debt.status === 'cancelled') {
          return errorResponse('Cong no da bi huy truoc do', 400)
        }

        // Update debt status
        const { data: updatedDebt, error: updateError } = await supabase
          .from('customer_debts')
          .update({
            status: 'cancelled',
            notes: debt.notes
              ? `${debt.notes}\n\n[HUY: ${reason}]`
              : `[HUY: ${reason}]`,
          })
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError

        // Note: The trigger 'update_customer_debt_on_debt_change' will
        // automatically update the customer's total_debt

        // If linked to a sale, update sale payment status
        if (debt.sale_id) {
          await supabase
            .from('sales')
            .update({
              payment_status: 'paid', // Cancelled debt = no longer due
              amount_due: 0,
            })
            .eq('id', debt.sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({
          debt: updatedDebt,
          message: 'Cong no da duoc huy',
        })
      }

      // ========================================================================
      // DEBT SUMMARY
      // ========================================================================
      case 'summary': {
        // Get total outstanding debt
        const { data: activeDebts } = await supabase
          .from('customer_debts')
          .select('remaining_amount, status, customer_id')
          .eq('store_id', store_id)
          .in('status', ['active', 'overdue'])

        const totalOutstanding = activeDebts?.reduce((sum, d) => sum + d.remaining_amount, 0) || 0
        const activeCount = activeDebts?.filter(d => d.status === 'active').length || 0
        const overdueDebts = activeDebts?.filter(d => d.status === 'overdue') || []
        const overdueCount = overdueDebts.length
        const overdueAmount = overdueDebts.reduce((sum, d) => sum + d.remaining_amount, 0)

        // Count unique customers with debt
        const uniqueCustomers = new Set(activeDebts?.map(d => d.customer_id) || [])
        const totalCustomersWithDebt = uniqueCustomers.size

        // Get collected this month
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        firstDayOfMonth.setHours(0, 0, 0, 0)

        const { data: monthPayments } = await supabase
          .from('debt_payments')
          .select('amount')
          .eq('store_id', store_id)
          .gte('paid_at', firstDayOfMonth.toISOString())

        const collectedThisMonth = monthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

        return successResponse({
          summary: {
            total_outstanding: totalOutstanding,
            total_customers_with_debt: totalCustomersWithDebt,
            active_debts: activeCount,
            overdue_debts: overdueCount,
            overdue_amount: overdueAmount,
            collected_this_month: collectedThisMonth,
          },
        })
      }

      // ========================================================================
      // DEFAULT
      // ========================================================================
      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Debt function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
