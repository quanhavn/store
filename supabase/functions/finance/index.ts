import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface CashInRequest {
  action: 'cash_in'
  amount: number
  description: string
  reference_type?: 'sale' | 'adjustment'
  reference_id?: string
}

interface CashOutRequest {
  action: 'cash_out'
  amount: number
  description: string
  reference_type?: 'expense' | 'salary' | 'adjustment'
  reference_id?: string
}

interface GetCashBalanceRequest {
  action: 'cash_balance'
}

interface GetCashTransactionsRequest {
  action: 'cash_transactions'
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

interface CreateExpenseRequest {
  action: 'create_expense'
  category_id?: string
  description: string
  amount: number
  vat_amount?: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id?: string
  invoice_no?: string
  supplier_name?: string
  supplier_tax_code?: string
  expense_date?: string
}

interface ListExpensesRequest {
  action: 'list_expenses'
  category_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

interface GetFinanceSummaryRequest {
  action: 'summary'
  period?: 'day' | 'week' | 'month' | 'year'
}

type FinanceRequest =
  | CashInRequest
  | CashOutRequest
  | GetCashBalanceRequest
  | GetCashTransactionsRequest
  | CreateExpenseRequest
  | ListExpensesRequest
  | GetFinanceSummaryRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: FinanceRequest = await req.json()

    switch (body.action) {
      case 'cash_in': {
        const { amount, description, reference_type, reference_id } = body

        // Get current balance
        const { data: lastEntry } = await supabase
          .from('cash_book')
          .select('balance')
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const currentBalance = lastEntry?.balance || 0
        const newBalance = currentBalance + amount

        const { data, error } = await supabase
          .from('cash_book')
          .insert({
            store_id,
            description,
            reference_type,
            reference_id,
            debit: amount,
            credit: 0,
            balance: newBalance,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ transaction: data, balance: newBalance })
      }

      case 'cash_out': {
        const { amount, description, reference_type, reference_id } = body

        // Get current balance
        const { data: lastEntry } = await supabase
          .from('cash_book')
          .select('balance')
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const currentBalance = lastEntry?.balance || 0

        if (currentBalance < amount) {
          return errorResponse('Không đủ tiền mặt trong quỹ', 400)
        }

        const newBalance = currentBalance - amount

        const { data, error } = await supabase
          .from('cash_book')
          .insert({
            store_id,
            description,
            reference_type,
            reference_id,
            debit: 0,
            credit: amount,
            balance: newBalance,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ transaction: data, balance: newBalance })
      }

      case 'cash_balance': {
        const { data } = await supabase
          .from('cash_book')
          .select('balance')
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return successResponse({ balance: data?.balance || 0 })
      }

      case 'cash_transactions': {
        const { date_from, date_to, page = 1, limit = 20 } = body

        let query = supabase
          .from('cash_book')
          .select('*', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (date_from) {
          query = query.gte('transaction_date', date_from)
        }

        if (date_to) {
          query = query.lte('transaction_date', date_to)
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          transactions: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      case 'create_expense': {
        const {
          category_id,
          description,
          amount,
          vat_amount = 0,
          payment_method,
          bank_account_id,
          invoice_no,
          supplier_name,
          supplier_tax_code,
          expense_date,
        } = body

        // Create expense record
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            store_id,
            category_id,
            description,
            amount,
            vat_amount,
            payment_method,
            bank_account_id,
            invoice_no,
            supplier_name,
            supplier_tax_code,
            expense_date: expense_date || new Date().toISOString().split('T')[0],
            created_by: user.id,
          })
          .select()
          .single()

        if (expenseError) throw expenseError

        // Record to cash/bank book
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
          const newBalance = currentBalance - amount

          await supabase.from('cash_book').insert({
            store_id,
            description: `Chi phí: ${description}`,
            reference_type: 'expense',
            reference_id: expense.id,
            debit: 0,
            credit: amount,
            balance: newBalance,
            created_by: user.id,
          })
        } else if (payment_method === 'bank_transfer' && bank_account_id) {
          await supabase.from('bank_book').insert({
            store_id,
            bank_account_id,
            description: `Chi phí: ${description}`,
            reference_type: 'expense',
            reference_id: expense.id,
            debit: 0,
            credit: amount,
          })
        }

        return successResponse({ expense })
      }

      case 'list_expenses': {
        const { category_id, date_from, date_to, page = 1, limit = 20 } = body

        let query = supabase
          .from('expenses')
          .select('*, expense_categories(id, name)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('expense_date', { ascending: false })

        if (category_id) {
          query = query.eq('category_id', category_id)
        }

        if (date_from) {
          query = query.gte('expense_date', date_from)
        }

        if (date_to) {
          query = query.lte('expense_date', date_to)
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          expenses: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      case 'summary': {
        const { period = 'month' } = body

        // Calculate date range
        const now = new Date()
        let startDate: Date

        switch (period) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
        }

        // Get sales total
        const { data: sales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', startDate.toISOString())

        const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0

        // Get expenses total
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('store_id', store_id)
          .gte('expense_date', startDate.toISOString().split('T')[0])

        const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

        // Get cash balance
        const { data: cashEntry } = await supabase
          .from('cash_book')
          .select('balance')
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return successResponse({
          summary: {
            period,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            net_profit: totalRevenue - totalExpenses,
            cash_balance: cashEntry?.balance || 0,
          },
        })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Finance function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
