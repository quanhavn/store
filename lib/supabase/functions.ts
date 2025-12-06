import { createClient } from './client'
import type { Database } from '@/types/database'

type FunctionResponse<T> = {
  data: T | null
  error: Error | null
}

export async function callFunction<T>(
  functionName: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const supabase = createClient()
  
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  })

  if (error) {
    throw new Error(error.message || 'Function call failed')
  }

  return data as T
}

export const api = {
  auth: {
    getSession: async () => {
      const supabase = createClient()
      return supabase.auth.getSession()
    },
    getUser: async () => {
      const supabase = createClient()
      return supabase.auth.getUser()
    },
    signIn: async (email: string, password: string) => {
      const supabase = createClient()
      return supabase.auth.signInWithPassword({ email, password })
    },
    signUp: async (email: string, password: string, metadata?: Record<string, string>) => {
      const supabase = createClient()
      return supabase.auth.signUp({ 
        email, 
        password,
        options: { data: metadata },
      })
    },
    signOut: async () => {
      const supabase = createClient()
      return supabase.auth.signOut()
    },
  },

  store: {
    getUserStore: () => callFunction<{ store: Database['public']['Tables']['stores']['Row'] }>('get-user-store'),
  },

  products: {
    list: (params: { page?: number; limit?: number; search?: string; category_id?: string }) =>
      callFunction<{ products: Database['public']['Tables']['products']['Row'][]; total: number }>('products/list', params),
    get: (id: string) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products/get', { id }),
    create: (data: Partial<Database['public']['Tables']['products']['Insert']>) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products/create', data),
    update: (id: string, data: Partial<Database['public']['Tables']['products']['Update']>) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products/update', { id, ...data }),
    delete: (id: string) =>
      callFunction<{ success: boolean }>('products/delete', { id }),
  },

  categories: {
    list: () =>
      callFunction<{ categories: Database['public']['Tables']['categories']['Row'][] }>('categories/list'),
    create: (data: { name: string; parent_id?: string }) =>
      callFunction<{ category: Database['public']['Tables']['categories']['Row'] }>('categories/create', data),
  },

  pos: {
    createSale: (data: {
      items: Array<{
        product_id: string
        quantity: number
        unit_price: number
        vat_rate: number
        discount?: number
      }>
      customer_name?: string
      customer_phone?: string
      customer_tax_code?: string
      discount?: number
      payments: Array<{
        method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
        amount: number
        bank_account_id?: string
        bank_ref?: string
      }>
      note?: string
    }) => callFunction<{ sale: Database['public']['Tables']['sales']['Row']; invoice_no: string }>('pos/create-sale', data),
    getSale: (id: string) =>
      callFunction<{ sale: Database['public']['Tables']['sales']['Row'] & { items: Database['public']['Tables']['sale_items']['Row'][]; payments: Database['public']['Tables']['payments']['Row'][] } }>('pos/get-sale', { id }),
  },

  finance: {
    // Cash operations
    cashBalance: () =>
      callFunction<{ balance: number }>('finance', { action: 'cash_balance' }),
    cashIn: (data: { amount: number; description: string; reference_type?: 'sale' | 'adjustment'; reference_id?: string }) =>
      callFunction<{ transaction: Record<string, unknown>; balance: number }>('finance', { action: 'cash_in', ...data }),
    cashOut: (data: { amount: number; description: string; reference_type?: 'expense' | 'salary' | 'adjustment'; reference_id?: string }) =>
      callFunction<{ transaction: Record<string, unknown>; balance: number }>('finance', { action: 'cash_out', ...data }),
    cashTransactions: (params: { date_from?: string; date_to?: string; page?: number; limit?: number }) =>
      callFunction<{ transactions: CashTransaction[]; pagination: Pagination }>('finance', { action: 'cash_transactions', ...params }),

    // Bank account operations
    listBankAccounts: () =>
      callFunction<{ bank_accounts: BankAccount[] }>('finance', { action: 'list_bank_accounts' }),
    createBankAccount: (data: {
      bank_name: string
      account_number: string
      account_name: string
      branch?: string
      is_default?: boolean
      initial_balance?: number
    }) => callFunction<{ bank_account: BankAccount }>('finance', { action: 'create_bank_account', ...data }),
    updateBankAccount: (data: {
      id: string
      bank_name?: string
      account_number?: string
      account_name?: string
      branch?: string
      is_default?: boolean
    }) => callFunction<{ bank_account: BankAccount }>('finance', { action: 'update_bank_account', ...data }),
    bankIn: (data: {
      bank_account_id: string
      amount: number
      description: string
      bank_ref?: string
      reference_type?: 'sale' | 'transfer' | 'other'
    }) => callFunction<{ transaction: BankTransaction; balance: number }>('finance', { action: 'bank_in', ...data }),
    bankOut: (data: {
      bank_account_id: string
      amount: number
      description: string
      bank_ref?: string
      reference_type?: 'expense' | 'transfer' | 'other'
    }) => callFunction<{ transaction: BankTransaction; balance: number }>('finance', { action: 'bank_out', ...data }),
    bankTransactions: (params: { bank_account_id?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) =>
      callFunction<{ transactions: BankTransaction[]; pagination: Pagination }>('finance', { action: 'bank_transactions', ...params }),

    // Expense operations
    listExpenseCategories: () =>
      callFunction<{ categories: ExpenseCategory[] }>('finance', { action: 'list_expense_categories' }),
    createExpenseCategory: (data: { name: string; code?: string; is_deductible?: boolean }) =>
      callFunction<{ category: ExpenseCategory }>('finance', { action: 'create_expense_category', ...data }),
    createExpense: (data: {
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
    }) => callFunction<{ expense: Record<string, unknown> }>('finance', { action: 'create_expense', ...data }),
    listExpenses: (params: { category_id?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) =>
      callFunction<{ expenses: Expense[]; pagination: Pagination }>('finance', { action: 'list_expenses', ...params }),

    // Summary
    summary: (period?: 'day' | 'week' | 'month' | 'year') =>
      callFunction<{ summary: FinanceSummary }>('finance', { action: 'summary', period }),
  },

  reports: {
    revenueBook: (startDate: string, endDate: string) =>
      callFunction('reports/revenue-book', { start_date: startDate, end_date: endDate }),
    cashBook: (startDate: string, endDate: string) =>
      callFunction('reports/cash-book', { start_date: startDate, end_date: endDate }),
    bankBook: (startDate: string, endDate: string, bankAccountId?: string) =>
      callFunction('reports/bank-book', { start_date: startDate, end_date: endDate, bank_account_id: bankAccountId }),
    taxBook: (quarter: number, year: number) =>
      callFunction('reports/tax-book', { quarter, year }),
  },

  tax: {
    getSettings: () =>
      callFunction<{ settings: TaxSettings }>('tax', { action: 'get_settings' }),
    updateSettings: (data: Partial<TaxSettings>) =>
      callFunction<{ store: Record<string, unknown> }>('tax', { action: 'update_settings', ...data }),
    detectRevenueTier: () =>
      callFunction<{ tier: RevenueTier }>('tax', { action: 'detect_revenue_tier' }),
    calculateQuarterly: (quarter: number, year: number) =>
      callFunction<{ quarterly_tax: QuarterlyTax }>('tax', { action: 'calculate_quarterly', quarter, year }),
    getRevenueBook: (dateFrom: string, dateTo: string) =>
      callFunction<{ revenue_book: RevenueBook }>('tax', { action: 'revenue_book', date_from: dateFrom, date_to: dateTo }),
    getTaxBook: (year: number) =>
      callFunction<{ tax_book: TaxBook }>('tax', { action: 'tax_book', year }),
  },
}

// Finance types
export interface CashTransaction {
  id: string
  store_id: string
  description: string
  reference_type: string | null
  reference_id: string | null
  debit: number
  credit: number
  balance: number
  transaction_date: string
  created_at: string
  created_by: string
}

export interface BankAccount {
  id: string
  store_id: string
  bank_name: string
  account_number: string
  account_name: string
  branch: string | null
  balance: number
  is_default: boolean
  created_at: string
}

export interface BankTransaction {
  id: string
  store_id: string
  bank_account_id: string
  description: string
  bank_ref: string | null
  reference_type: string | null
  reference_id: string | null
  debit: number
  credit: number
  transaction_date: string
  created_at: string
  bank_accounts?: { id: string; bank_name: string; account_number: string } | null
}

export interface ExpenseCategory {
  id: string
  store_id: string
  name: string
  code: string | null
  is_deductible: boolean
  sort_order: number
  created_at: string
}

export interface Expense {
  id: string
  store_id: string
  category_id: string | null
  description: string
  amount: number
  vat_amount: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id: string | null
  invoice_no: string | null
  supplier_name: string | null
  supplier_tax_code: string | null
  expense_date: string
  created_at: string
  created_by: string
  expense_categories?: { id: string; name: string } | null
}

export interface FinanceSummary {
  period: string
  total_revenue: number
  total_expenses: number
  net_profit: number
  cash_balance: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

// Tax types
export interface TaxSettings {
  business_type: 'retail' | 'food_service' | 'other_service'
  default_vat_rate: 8 | 10
  pit_rate: 1 | 1.5 | 2
  e_invoice_required: boolean
  e_invoice_provider?: string
}

export interface RevenueTier {
  code: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
  annual_revenue: number
  recommended_vat_rate: number
  recommended_pit_rate: number
  e_invoice_required: boolean
}

export interface QuarterlyTax {
  period: string
  period_start: string
  period_end: string
  deadline: string
  total_revenue: number
  total_subtotal: number
  vat_collected: number
  vat_deductible: number
  vat_payable: number
  pit_rate: number
  pit_payable: number
  total_tax_payable: number
}

export interface RevenueBook {
  period: { from: string; to: string }
  sales: Array<{
    id: string
    invoice_no: string
    customer_name: string | null
    subtotal: number
    vat_amount: number
    total: number
    completed_at: string
    payment_method: string
  }>
  summary: {
    total_subtotal: number
    total_vat: number
    total_revenue: number
    vat_by_rate: Record<number, number>
    sale_count: number
  }
}

export interface TaxBook {
  year: number
  quarters: Array<{
    quarter: number
    status: 'not_started' | 'in_progress' | 'completed' | 'pending'
    total_revenue: number
    vat_collected: number
    vat_deductible: number
    vat_payable: number
    pit_payable: number
    total_tax: number
  }>
  summary: {
    total_revenue: number
    total_tax: number
  }
}
