import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

// ============================================================================
// Request Interfaces
// ============================================================================

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

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: FinanceRequest = await req.json()

    switch (body.action) {
      // ========================================================================
      // CASH IN - Uses RPC for atomic transaction
      // ========================================================================
      case 'cash_in': {
        const { amount, description, reference_type, reference_id } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        const { data, error } = await supabase.rpc('cash_in', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_amount: amount,
          p_description: description,
          p_reference_type: reference_type || null,
          p_reference_id: reference_id || null,
        })

        if (error) throw error

        return successResponse({ transaction: { id: data.entry_id }, balance: data.balance })
      }

      // ========================================================================
      // CASH OUT - Uses RPC for atomic transaction
      // ========================================================================
      case 'cash_out': {
        const { amount, description, reference_type, reference_id } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        const { data, error } = await supabase.rpc('cash_out', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_amount: amount,
          p_description: description,
          p_reference_type: reference_type || null,
          p_reference_id: reference_id || null,
        })

        if (error) {
          if (error.message?.includes('Insufficient cash balance')) {
            return errorResponse('Khong du tiền mặt trong quy', 400)
          }
          throw error
        }

        return successResponse({ transaction: { id: data.entry_id }, balance: data.balance })
      }

      // ========================================================================
      // CASH BALANCE - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // CASH TRANSACTIONS - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // CREATE EXPENSE - Uses RPC for atomic transaction
      // ========================================================================
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

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        if (payment_method === 'bank_transfer' && !bank_account_id) {
          return errorResponse('Vui long chon tai khoan ngan hang', 400)
        }

        const { data, error } = await supabase.rpc('create_expense', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_description: description,
          p_amount: amount,
          p_payment_method: payment_method,
          p_category_id: category_id || null,
          p_vat_amount: vat_amount,
          p_bank_account_id: bank_account_id || null,
          p_invoice_no: invoice_no || null,
          p_supplier_name: supplier_name || null,
          p_supplier_tax_code: supplier_tax_code || null,
          p_expense_date: expense_date || null,
        })

        if (error) {
          if (error.message?.includes('Insufficient bank balance')) {
            return errorResponse('Khong du so du trong tai khoan', 400)
          }
          if (error.message?.includes('Bank account not found')) {
            return errorResponse('Khong tim thay tai khoan ngan hang', 404)
          }
          throw error
        }

        // Fetch the full expense record for response
        const { data: expense } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', data.expense_id)
          .single()

        return successResponse({ expense })
      }

      // ========================================================================
      // LIST EXPENSES - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // SUMMARY - Simple queries via client
      // ========================================================================
      case 'summary': {
        const { period = 'month' } = body

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

        const { data: sales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', startDate.toISOString())

        const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0

        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('store_id', store_id)
          .gte('expense_date', startDate.toISOString().split('T')[0])

        const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

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

      // ========================================================================
      // LIST BANK ACCOUNTS - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // CREATE BANK ACCOUNT - Simple insert via client
      // ========================================================================
      case 'create_bank_account': {
        const { bank_name, account_number, account_name, branch, is_default, initial_balance = 0 } = body

        if (is_default) {
          await supabase.from('bank_accounts').update({ is_default: false }).eq('store_id', store_id)
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

        if (initial_balance > 0) {
          await supabase.from('bank_book').insert({
            store_id,
            bank_account_id: data.id,
            description: 'So du dau ky',
            reference_type: 'opening',
            debit: initial_balance,
            credit: 0,
          })
        }

        return successResponse({ bank_account: data })
      }

      // ========================================================================
      // UPDATE BANK ACCOUNT - Simple update via client
      // ========================================================================
      case 'update_bank_account': {
        const { id, bank_name, account_number, account_name, branch, is_default } = body

        if (is_default) {
          await supabase.from('bank_accounts').update({ is_default: false }).eq('store_id', store_id)
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

      // ========================================================================
      // BANK IN - Uses existing RPC for atomic balance update
      // ========================================================================
      case 'bank_in': {
        const { bank_account_id, amount, description, bank_ref, reference_type, reference_id } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        const { data: newBalance, error: balanceError } = await supabase.rpc('increment_bank_balance', {
          p_bank_account_id: bank_account_id,
          p_store_id: store_id,
          p_amount: amount,
        })

        if (balanceError) {
          if (balanceError.message?.includes('Bank account not found')) {
            return errorResponse('Khong tim thay tai khoan ngan hang', 404)
          }
          throw balanceError
        }

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

      // ========================================================================
      // BANK OUT - Uses existing RPC for atomic balance update
      // ========================================================================
      case 'bank_out': {
        const { bank_account_id, amount, description, bank_ref, reference_type, reference_id } = body

        if (amount <= 0) {
          return errorResponse('So tien phai lon hon 0', 400)
        }

        const { data: newBalance, error: balanceError } = await supabase.rpc('decrement_bank_balance', {
          p_bank_account_id: bank_account_id,
          p_store_id: store_id,
          p_amount: amount,
        })

        if (balanceError) {
          if (balanceError.message?.includes('Insufficient balance')) {
            return errorResponse('Khong du so du trong tai khoan', 400)
          }
          if (balanceError.message?.includes('Bank account not found')) {
            return errorResponse('Khong tim thay tai khoan ngan hang', 404)
          }
          throw balanceError
        }

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

      // ========================================================================
      // BANK TRANSACTIONS - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // LIST EXPENSE CATEGORIES - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // CREATE EXPENSE CATEGORY - Simple insert via client
      // ========================================================================
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
