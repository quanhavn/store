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

// Bank account interfaces
interface ListBankAccountsRequest {
  action: 'list_bank_accounts'
}

interface CreateBankAccountRequest {
  action: 'create_bank_account'
  bank_name: string
  account_number: string
  account_name: string
  branch?: string
  is_default?: boolean
  initial_balance?: number
}

interface UpdateBankAccountRequest {
  action: 'update_bank_account'
  id: string
  bank_name?: string
  account_number?: string
  account_name?: string
  branch?: string
  is_default?: boolean
}

interface BankInRequest {
  action: 'bank_in'
  bank_account_id: string
  amount: number
  description: string
  bank_ref?: string
  reference_type?: 'sale' | 'transfer' | 'other'
  reference_id?: string
}

interface BankOutRequest {
  action: 'bank_out'
  bank_account_id: string
  amount: number
  description: string
  bank_ref?: string
  reference_type?: 'expense' | 'transfer' | 'other'
  reference_id?: string
}

interface BankTransactionsRequest {
  action: 'bank_transactions'
  bank_account_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

// Expense categories interfaces
interface ListExpenseCategoriesRequest {
  action: 'list_expense_categories'
}

interface CreateExpenseCategoryRequest {
  action: 'create_expense_category'
  name: string
  code?: string
  is_deductible?: boolean
}

type FinanceRequest =
  | CashInRequest
  | CashOutRequest
  | GetCashBalanceRequest
  | GetCashTransactionsRequest
  | CreateExpenseRequest
  | ListExpensesRequest
  | GetFinanceSummaryRequest
  | ListBankAccountsRequest
  | CreateBankAccountRequest
  | UpdateBankAccountRequest
  | BankInRequest
  | BankOutRequest
  | BankTransactionsRequest
  | ListExpenseCategoriesRequest
  | CreateExpenseCategoryRequest

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

      // Bank account operations
      case 'list_bank_accounts': {
        const { data, error } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('store_id', store_id)
          .order('is_default', { ascending: false })
          .order('bank_name')

        if (error) throw error

        return successResponse({ bank_accounts: data })
      }

      case 'create_bank_account': {
        const { bank_name, account_number, account_name, branch, is_default, initial_balance = 0 } = body

        // If this is set as default, unset other defaults
        if (is_default) {
          await supabase
            .from('bank_accounts')
            .update({ is_default: false })
            .eq('store_id', store_id)
        }

        const { data, error } = await supabase
          .from('bank_accounts')
          .insert({
            store_id,
            bank_name,
            account_number,
            account_name,
            branch,
            is_default: is_default || false,
            balance: initial_balance,
          })
          .select()
          .single()

        if (error) throw error

        // If initial balance, create bank book entry
        if (initial_balance > 0) {
          await supabase.from('bank_book').insert({
            store_id,
            bank_account_id: data.id,
            description: 'Số dư đầu kỳ',
            reference_type: 'opening',
            debit: initial_balance,
            credit: 0,
          })
        }

        return successResponse({ bank_account: data })
      }

      case 'update_bank_account': {
        const { id, bank_name, account_number, account_name, branch, is_default } = body

        // If this is set as default, unset other defaults
        if (is_default) {
          await supabase
            .from('bank_accounts')
            .update({ is_default: false })
            .eq('store_id', store_id)
        }

        const updateData: Record<string, unknown> = {}
        if (bank_name !== undefined) updateData.bank_name = bank_name
        if (account_number !== undefined) updateData.account_number = account_number
        if (account_name !== undefined) updateData.account_name = account_name
        if (branch !== undefined) updateData.branch = branch
        if (is_default !== undefined) updateData.is_default = is_default

        const { data, error } = await supabase
          .from('bank_accounts')
          .update(updateData)
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ bank_account: data })
      }

      case 'bank_in': {
        const { bank_account_id, amount, description, bank_ref, reference_type, reference_id } = body

        // Update bank account balance
        const { data: account, error: accountError } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', bank_account_id)
          .eq('store_id', store_id)
          .single()

        if (accountError) throw accountError

        const newBalance = (account.balance || 0) + amount

        await supabase
          .from('bank_accounts')
          .update({ balance: newBalance })
          .eq('id', bank_account_id)

        // Create bank book entry
        const { data, error } = await supabase
          .from('bank_book')
          .insert({
            store_id,
            bank_account_id,
            description,
            bank_ref,
            reference_type,
            reference_id,
            debit: amount,
            credit: 0,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ transaction: data, balance: newBalance })
      }

      case 'bank_out': {
        const { bank_account_id, amount, description, bank_ref, reference_type, reference_id } = body

        // Get and validate bank account balance
        const { data: account, error: accountError } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', bank_account_id)
          .eq('store_id', store_id)
          .single()

        if (accountError) throw accountError

        if ((account.balance || 0) < amount) {
          return errorResponse('Không đủ số dư trong tài khoản', 400)
        }

        const newBalance = (account.balance || 0) - amount

        await supabase
          .from('bank_accounts')
          .update({ balance: newBalance })
          .eq('id', bank_account_id)

        // Create bank book entry
        const { data, error } = await supabase
          .from('bank_book')
          .insert({
            store_id,
            bank_account_id,
            description,
            bank_ref,
            reference_type,
            reference_id,
            debit: 0,
            credit: amount,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ transaction: data, balance: newBalance })
      }

      case 'bank_transactions': {
        const { bank_account_id, date_from, date_to, page = 1, limit = 20 } = body

        let query = supabase
          .from('bank_book')
          .select('*, bank_accounts(id, bank_name, account_number)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (bank_account_id) {
          query = query.eq('bank_account_id', bank_account_id)
        }

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

      // Expense categories
      case 'list_expense_categories': {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('store_id', store_id)
          .order('sort_order')
          .order('name')

        if (error) throw error

        return successResponse({ categories: data })
      }

      case 'create_expense_category': {
        const { name, code, is_deductible = true } = body

        const { data, error } = await supabase
          .from('expense_categories')
          .insert({
            store_id,
            name,
            code,
            is_deductible,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ category: data })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Finance function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
