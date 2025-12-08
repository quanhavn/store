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
  due_date?: string
  notes?: string
}

interface CreateInstallmentDebtRequest {
  action: 'create_installment'
  customer_id: string
  sale_id?: string
  amount: number
  installments: number
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

function calculateInstallmentAmounts(totalAmount: number, count: number): number[] {
  const baseAmount = Math.floor(totalAmount / count)
  const remainder = totalAmount - baseAmount * count

  const amounts: number[] = []
  for (let i = 0; i < count; i++) {
    amounts.push(i === count - 1 ? baseAmount + remainder : baseAmount)
  }

  return amounts
}

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
      // CREATE CREDIT DEBT - Simple insert via client
      // ========================================================================
      case 'create_credit': {
        const { customer_id, sale_id, amount, due_date, notes } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        // Verify customer exists
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', customer_id)
          .eq('store_id', store_id)
          .single()

        if (customerError || !customer) {
          return errorResponse('Khong tim thay khach hang', 404)
        }

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

        if (sale_id) {
          await supabase
            .from('sales')
            .update({ payment_status: 'unpaid', amount_due: amount })
            .eq('id', sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({
          debt,
          customer: { id: customer.id, name: customer.name },
        })
      }

      // ========================================================================
      // CREATE INSTALLMENT DEBT - Simple inserts via client
      // ========================================================================
      case 'create_installment': {
        const { customer_id, sale_id, amount, installments, first_due_date, frequency, notes } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        if (installments < 2 || installments > 12) {
          return errorResponse('So ky tra gop phai tu 2 den 12', 400)
        }

        if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
          return errorResponse('Tan suat tra gop khong hop le', 400)
        }

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', customer_id)
          .eq('store_id', store_id)
          .single()

        if (customerError || !customer) {
          return errorResponse('Khong tim thay khach hang', 404)
        }

        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .insert({
            store_id,
            customer_id,
            sale_id,
            debt_type: 'installment',
            original_amount: amount,
            remaining_amount: amount,
            due_date: null,
            notes,
            status: 'active',
            created_by: user.id,
          })
          .select()
          .single()

        if (debtError) throw debtError

        const installmentAmounts = calculateInstallmentAmounts(amount, installments)
        const installmentDates = calculateInstallmentDueDates(first_due_date, installments, frequency)

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

        if (sale_id) {
          await supabase
            .from('sales')
            .update({ payment_status: 'unpaid', amount_due: amount })
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
      // RECORD PAYMENT - Uses RPC for atomic transaction
      // ========================================================================
      case 'record_payment': {
        const { debt_id, installment_id, amount, payment_method, bank_account_id, bank_ref, notes } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        if (payment_method === 'bank_transfer' && !bank_account_id) {
          return errorResponse('Vui long chon tai khoan ngan hang', 400)
        }

        // Call RPC for atomic transaction
        const { data, error } = await supabase.rpc('record_debt_payment', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_debt_id: debt_id,
          p_amount: amount,
          p_payment_method: payment_method,
          p_installment_id: installment_id || null,
          p_bank_account_id: bank_account_id || null,
          p_bank_ref: bank_ref || null,
          p_notes: notes || null,
        })

        if (error) {
          const message = error.message || 'Loi ghi nhan thanh toan'
          if (message.includes('Debt not found')) {
            return errorResponse('Khong tim thay cong no', 404)
          }
          if (message.includes('already fully paid')) {
            return errorResponse('Cong no da thanh toan het', 400)
          }
          if (message.includes('has been cancelled')) {
            return errorResponse('Cong no da bi huy', 400)
          }
          if (message.includes('exceeds remaining debt')) {
            return errorResponse(message.replace('Payment amount exceeds remaining debt', 'So tien vuot qua so con lai'), 400)
          }
          if (message.includes('Installment not found')) {
            return errorResponse('Khong tim thay ky tra gop', 404)
          }
          if (message.includes('exceeds installment remaining')) {
            return errorResponse(message.replace('Payment exceeds installment remaining', 'So tien vuot qua so con lai cua ky'), 400)
          }
          throw error
        }

        // Get updated debt info for response
        const { data: updatedDebt } = await supabase
          .from('customer_debts')
          .select('*, customers(id, name, total_debt)')
          .eq('id', debt_id)
          .single()

        return successResponse({
          payment: { id: data.payment_id, amount: data.amount },
          debt: updatedDebt,
          is_fully_paid: data.is_fully_paid,
        })
      }

      // ========================================================================
      // LIST DEBTS - Simple query via client
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
      // GET DEBT DETAIL - Simple query via client
      // ========================================================================
      case 'get': {
        const { id } = body

        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .select('*, customers(id, name, phone, address)')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (debtError || !debt) {
          return errorResponse('Khong tim thay cong no', 404)
        }

        let installments = null
        if (debt.debt_type === 'installment') {
          const { data: installmentsData } = await supabase
            .from('debt_installments')
            .select('*')
            .eq('debt_id', id)
            .order('installment_number')

          installments = installmentsData
        }

        const { data: payments } = await supabase
          .from('debt_payments')
          .select('*, debt_installments(installment_number)')
          .eq('debt_id', id)
          .order('paid_at', { ascending: false })

        return successResponse({ debt, installments, payments })
      }

      // ========================================================================
      // GET CUSTOMER DEBTS - Simple query via client
      // ========================================================================
      case 'get_customer_debts': {
        const { customer_id } = body

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name, phone, address, total_debt')
          .eq('id', customer_id)
          .eq('store_id', store_id)
          .single()

        if (customerError || !customer) {
          return errorResponse('Khong tim thay khach hang', 404)
        }

        const { data: debts, error: debtsError } = await supabase
          .from('customer_debts')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (debtsError) throw debtsError

        const installmentDebtIds = debts.filter((d) => d.debt_type === 'installment').map((d) => d.id)

        let installmentsMap: Record<string, unknown[]> = {}
        if (installmentDebtIds.length > 0) {
          const { data: installments } = await supabase
            .from('debt_installments')
            .select('*')
            .in('debt_id', installmentDebtIds)
            .order('installment_number')

          if (installments) {
            installmentsMap = installments.reduce(
              (acc, inst) => {
                if (!acc[inst.debt_id]) acc[inst.debt_id] = []
                acc[inst.debt_id].push(inst)
                return acc
              },
              {} as Record<string, unknown[]>
            )
          }
        }

        const debtsWithInstallments = debts.map((debt) => ({
          ...debt,
          installments: debt.debt_type === 'installment' ? installmentsMap[debt.id] || [] : null,
        }))

        const summary = {
          total_debt: customer.total_debt,
          active_debts: debts.filter((d) => d.status === 'active').length,
          overdue_debts: debts.filter((d) => d.status === 'overdue').length,
          paid_debts: debts.filter((d) => d.status === 'paid').length,
        }

        return successResponse({ customer, debts: debtsWithInstallments, summary })
      }

      // ========================================================================
      // CANCEL DEBT - Simple update via client
      // ========================================================================
      case 'cancel': {
        const { id, reason } = body

        if (!isOwnerOrManager(role)) {
          return errorResponse('Chi quan ly moi co quyen huy cong no', 403)
        }

        if (!reason || reason.trim().length < 5) {
          return errorResponse('Vui long nhap ly do huy (it nhat 5 ky tu)', 400)
        }

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

        const { data: updatedDebt, error: updateError } = await supabase
          .from('customer_debts')
          .update({
            status: 'cancelled',
            notes: debt.notes ? `${debt.notes}\n\n[HUY: ${reason}]` : `[HUY: ${reason}]`,
          })
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError

        if (debt.sale_id) {
          await supabase
            .from('sales')
            .update({ payment_status: 'paid', amount_due: 0 })
            .eq('id', debt.sale_id)
            .eq('store_id', store_id)
        }

        return successResponse({ debt: updatedDebt, message: 'Cong no da duoc huy' })
      }

      // ========================================================================
      // DEBT SUMMARY - Simple queries via client
      // ========================================================================
      case 'summary': {
        const { data: activeDebts } = await supabase
          .from('customer_debts')
          .select('remaining_amount, status, customer_id')
          .eq('store_id', store_id)
          .in('status', ['active', 'overdue'])

        const totalOutstanding = activeDebts?.reduce((sum, d) => sum + d.remaining_amount, 0) || 0
        const activeCount = activeDebts?.filter((d) => d.status === 'active').length || 0
        const overdueDebts = activeDebts?.filter((d) => d.status === 'overdue') || []
        const overdueCount = overdueDebts.length
        const overdueAmount = overdueDebts.reduce((sum, d) => sum + d.remaining_amount, 0)

        const uniqueCustomers = new Set(activeDebts?.map((d) => d.customer_id) || [])
        const totalCustomersWithDebt = uniqueCustomers.size

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

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Debt function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
