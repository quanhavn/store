import { createClient } from './client'
import type { Database, UserStore, UserWithStores } from '@/types/database'

type FunctionResponse<T> = {
  data: T | null
  error: Error | null
}

export async function callFunction<T>(
  functionName: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const supabase = createClient()
  
  // Get current session
  let { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }
  
  // Check if token is about to expire (within 60 seconds) and refresh proactively
  const expiresAt = session.expires_at
  if (expiresAt && expiresAt * 1000 - Date.now() < 60000) {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
    if (refreshedSession) {
      session = refreshedSession
    }
  }
  
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  })

  if (error) {
    // If unauthorized, try to refresh session and retry once
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
      if (refreshedSession) {
        const { data: retryData, error: retryError } = await supabase.functions.invoke<T>(functionName, {
          body,
        })
        if (retryError) {
          throw new Error(retryError.message || 'Function call failed')
        }
        return retryData as T
      }
    }
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
    updateStore: (data: { name?: string; phone?: string; email?: string; address?: string; tax_code?: string }) =>
      callFunction<{ store: Database['public']['Tables']['stores']['Row'] }>('get-user-store', { action: 'update', ...data }),
    getUserStores: () => callFunction<{ stores: UserStore[] }>('get-user-store', { action: 'list_stores' }),
    switchStore: (store_id: string) => callFunction<{ success: boolean; user: UserWithStores }>('switch-store', { store_id }),
    createStore: (store_name: string, phone?: string) => 
      callFunction<{ success: boolean; store_id: string; store_name: string; error?: string }>('get-user-store', { action: 'create_store', store_name, phone }),
    updateEInvoiceConfig: (data: Record<string, unknown>) =>
      callFunction<{ store: Database['public']['Tables']['stores']['Row'] }>('store/einvoice-config', { action: 'update', ...data }),
    testViettelConnection: (config: Record<string, unknown>) =>
      callFunction<{ success: boolean; message: string }>('store/einvoice-config', { action: 'test_connection', ...config }),
  },

  products: {
    list: (params: { page?: number; limit?: number; search?: string; category_id?: string; include_variants?: boolean; include_units?: boolean }) =>
      callFunction<{ products: Database['public']['Tables']['products']['Row'][]; total: number }>('products', { action: 'list', ...params }),
    get: (id: string, options?: { include_variants?: boolean; include_units?: boolean }) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products', { action: 'get', id, ...options }),
    create: (data: Partial<Database['public']['Tables']['products']['Insert']> & {
      has_variants?: boolean
      has_units?: boolean
      units?: ProductUnitInput[]
      variants?: ProductVariantInput[]
    }) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products', { action: 'create', ...data }),
    update: (id: string, data: Partial<Database['public']['Tables']['products']['Update']> & {
      has_variants?: boolean
      has_units?: boolean
      units?: ProductUnitInput[]
      variants?: ProductVariantInput[]
    }) =>
      callFunction<{ product: Database['public']['Tables']['products']['Row'] }>('products', { action: 'update', id, ...data }),
    delete: (id: string) =>
      callFunction<{ success: boolean }>('products', { action: 'delete', id }),
  },

  attributes: {
    list: () =>
      callFunction<{ attributes: ProductAttribute[] }>('attributes', { action: 'list' }),
    create: (data: { name: string; values?: string[] }) =>
      callFunction<{ attribute: ProductAttribute }>('attributes', { action: 'create', ...data }),
    update: (id: string, data: { name?: string; display_order?: number }) =>
      callFunction<{ attribute: ProductAttribute }>('attributes', { action: 'update', id, ...data }),
    delete: (id: string) =>
      callFunction<{ deleted: boolean }>('attributes', { action: 'delete', id }),
    addValue: (attribute_id: string, value: string) =>
      callFunction<{ value: ProductAttributeValue }>('attributes', { action: 'add_value', attribute_id, value }),
    removeValue: (value_id: string) =>
      callFunction<{ deleted: boolean }>('attributes', { action: 'remove_value', value_id }),
  },

  categories: {
    list: (params?: { flat?: boolean }) =>
      callFunction<{ categories: Category[]; flat_categories?: Category[] }>('categories', { action: 'list', ...params }),
    create: (data: { name: string; parent_id?: string; sort_order?: number }) =>
      callFunction<{ category: Category }>('categories', { action: 'create', ...data }),
    update: (id: string, data: { name?: string; parent_id?: string | null; sort_order?: number }) =>
      callFunction<{ category: Category }>('categories', { action: 'update', id, ...data }),
    delete: (id: string) =>
      callFunction<{ deleted: boolean }>('categories', { action: 'delete', id }),
  },

  inventory: {
    import: (data: { 
      product_id: string
      variant_id?: string
      quantity: number
      unit_cost?: number
      note?: string
      record_expense?: boolean
      payment_method?: 'cash' | 'bank_transfer'
      bank_account_id?: string
      supplier_name?: string
    }) =>
      callFunction<{ 
        log: InventoryLog
        new_quantity: number
        success?: boolean
      }>('inventory', { action: 'import', ...data }),
    batchImport: (data: {
      items: Array<{
        product_id: string
        variant_id?: string
        quantity: number
        unit_cost?: number
        item_total?: number
      }>
      note?: string
      record_expense?: boolean
      payment_method?: 'cash' | 'bank_transfer'
      bank_account_id?: string
      supplier_name?: string
    }) =>
      callFunction<{
        batch_id: string
        total_cost: number
        items: Array<{
          product_id: string
          variant_id?: string
          quantity: number
          new_quantity: number
          inventory_log_id: string
        }>
        success: boolean
      }>('inventory', { action: 'batch_import', ...data }),
    export: (data: { product_id: string; variant_id?: string; quantity: number; note?: string }) =>
      callFunction<{ log: InventoryLog; new_quantity: number; success?: boolean }>('inventory', { action: 'export', ...data }),
    adjust: (data: { product_id: string; variant_id?: string; new_quantity: number; note?: string }) =>
      callFunction<{ log: InventoryLog; new_quantity: number; previous_quantity?: number; difference?: number; success?: boolean }>('inventory', { action: 'adjust', ...data }),
    logs: (params?: { product_id?: string; type?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) =>
      callFunction<{ logs: InventoryLog[]; pagination: Pagination }>('inventory', { action: 'logs', ...params }),
    summary: () =>
      callFunction<{ summary: { total_products: number; total_value: number; low_stock_count: number; out_of_stock_count: number } }>('inventory', { action: 'summary' }),
    lowStock: () =>
      callFunction<{ products: LowStockProduct[] }>('inventory', { action: 'low_stock' }),
  },

  pos: {
    createSale: (data: {
      items: Array<{
        product_id: string
        product_name?: string
        quantity: number
        unit_price: number
        vat_rate: number
        discount?: number
        variant_id?: string
        variant_name?: string
        unit_id?: string
        unit_name?: string
        conversion_rate?: number
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
      callFunction<{ sale: SaleWithDetails }>('pos', { action: 'get', id }),
    listSales: (params: { page?: number; limit?: number; status?: string; date_from?: string; date_to?: string }) =>
      callFunction<{ sales: SaleWithDetails[]; pagination: Pagination }>('pos', { action: 'list', ...params }),
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
      initial_balance?: number
    }) => callFunction<{ bank_account: BankAccount }>('finance', { action: 'update_bank_account', ...data }),
    deleteBankAccount: (id: string) =>
      callFunction<{ success: boolean }>('finance', { action: 'delete_bank_account', id }),
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
    // Dashboard
    dashboardSummary: () =>
      callFunction<DashboardSummary>('reports', { action: 'dashboard_summary' }),
    salesAnalytics: (dateFrom: string, dateTo: string) =>
      callFunction<SalesAnalytics>('reports', { action: 'sales_analytics', date_from: dateFrom, date_to: dateTo }),
    financialAnalytics: (dateFrom: string, dateTo: string) =>
      callFunction<FinancialAnalytics>('reports', { action: 'financial_analytics', date_from: dateFrom, date_to: dateTo }),

    // 7 Accounting Books
    revenueBook: (dateFrom: string, dateTo: string) =>
      callFunction<RevenueBookReport>('reports', { action: 'revenue_book', date_from: dateFrom, date_to: dateTo }),
    cashBook: (dateFrom: string, dateTo: string) =>
      callFunction<CashBookReport>('reports', { action: 'cash_book', date_from: dateFrom, date_to: dateTo }),
    bankBook: (dateFrom: string, dateTo: string, bankAccountId?: string) =>
      callFunction<BankBookReport>('reports', { action: 'bank_book', date_from: dateFrom, date_to: dateTo, bank_account_id: bankAccountId }),
    expenseBook: (dateFrom: string, dateTo: string) =>
      callFunction<ExpenseBookReport>('reports', { action: 'expense_book', date_from: dateFrom, date_to: dateTo }),
    inventoryBook: (dateFrom: string, dateTo: string) =>
      callFunction<InventoryBookReport>('reports', { action: 'inventory_book', date_from: dateFrom, date_to: dateTo }),
    inventoryDetailBook: (dateFrom: string, dateTo: string) =>
      callFunction<InventoryDetailBookReport>('reports', { action: 'inventory_detail_book', date_from: dateFrom, date_to: dateTo }),
    taxBookReport: (year: number) =>
      callFunction<TaxBookReport>('reports', { action: 'tax_book', year }),
    salaryBookReport: (month: number, year: number) =>
      callFunction<SalaryBookReport>('reports', { action: 'salary_book', month, year }),
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

  invoice: {
    list: (params: { page?: number; limit?: number; status?: 'pending' | 'issued' | 'cancelled' | 'error'; date_from?: string; date_to?: string }) =>
      callFunction<{ invoices: Invoice[]; pagination: Pagination }>('invoice', { action: 'list', ...params }),
    get: (id: string) =>
      callFunction<{ invoice: InvoiceDetail }>('invoice', { action: 'get', id }),
    create: (data: { sale_id: string; buyer_name?: string; buyer_tax_code?: string; buyer_address?: string; buyer_email?: string; buyer_phone?: string }) =>
      callFunction<{ invoice: Invoice; viettel_response?: { invoice_no?: string; reservation_code?: string } }>('invoice', { action: 'create', ...data }),
    createDraft: (data: { sale_id: string; buyer_name?: string; buyer_tax_code?: string; buyer_address?: string; buyer_email?: string; buyer_phone?: string }) =>
      callFunction<{ invoice: Invoice; viettel_response?: { invoice_no?: string; reservation_code?: string } }>('invoice', { action: 'create_draft', ...data }),
    cancel: (invoice_id: string, reason: string) =>
      callFunction<{ invoice: Invoice }>('invoice', { action: 'cancel', invoice_id, reason }),
    downloadPdf: (invoice_id: string) =>
      callFunction<{ file_name: string; file_data: string; content_type: string }>('invoice', { action: 'download_pdf', invoice_id }),
    downloadXml: (invoice_id: string) =>
      callFunction<{ file_name: string; file_data: string; content_type: string }>('invoice', { action: 'download_xml', invoice_id }),
  },

  hr: {
    // Employees
    listEmployees: (params?: { active_only?: boolean; position?: string }) =>
      callFunction<{ employees: Employee[] }>('hr', { action: 'list_employees', ...params }),
    getEmployee: (id: string) =>
      callFunction<{ employee: Employee }>('hr', { action: 'get_employee', id }),
    createEmployee: (data: CreateEmployeeData) =>
      callFunction<{ employee: Employee }>('hr', { action: 'create_employee', ...data }),
    updateEmployee: (id: string, data: Partial<CreateEmployeeData>) =>
      callFunction<{ employee: Employee }>('hr', { action: 'update_employee', id, ...data }),
    deactivateEmployee: (id: string, data?: { termination_date?: string; termination_reason?: string }) =>
      callFunction<{ employee: Employee }>('hr', { action: 'deactivate_employee', id, ...data }),
    listPositions: () =>
      callFunction<{ positions: string[] }>('hr', { action: 'list_positions' }),

    // Attendance
    checkIn: (employeeId: string, notes?: string) =>
      callFunction<{ attendance: Attendance }>('hr', { action: 'check_in', employee_id: employeeId, notes }),
    checkOut: (employeeId: string, notes?: string) =>
      callFunction<{ attendance: Attendance }>('hr', { action: 'check_out', employee_id: employeeId, notes }),
    getAttendance: (params?: { employee_id?: string; date_from?: string; date_to?: string }) =>
      callFunction<{ attendance: AttendanceWithEmployee[] }>('hr', { action: 'get_attendance', ...params }),
    attendanceSummary: (employeeId: string, month: number, year: number) =>
      callFunction<{ summary: AttendanceSummary; attendance: Attendance[] }>('hr', { action: 'attendance_summary', employee_id: employeeId, month, year }),

    // Payroll
    calculateSalary: (employeeId: string, month: number, year: number) =>
      callFunction<{ payroll: Payroll; employee: Employee }>('hr', { action: 'calculate_salary', employee_id: employeeId, month, year }),
    calculateAllSalaries: (month: number, year: number) =>
      callFunction<{ calculated: number; results: Array<{ employee_id: string; net_salary: number }> }>('hr', { action: 'calculate_all_salaries', month, year }),
    approvePayroll: (payrollIds: string[]) =>
      callFunction<{ approved: number; payrolls: Payroll[] }>('hr', { action: 'approve_payroll', payroll_ids: payrollIds }),
    markPaid: (payrollId: string, paymentMethod: 'cash' | 'bank_transfer', paymentDate?: string) =>
      callFunction<{ payroll: Payroll }>('hr', { action: 'mark_paid', payroll_id: payrollId, payment_method: paymentMethod, payment_date: paymentDate }),
    getPayroll: (month: number, year: number) =>
      callFunction<{ payrolls: PayrollWithEmployee[]; totals: PayrollTotals; period: string }>('hr', { action: 'get_payroll', month, year }),
    getSalaryBook: (month: number, year: number) =>
      callFunction<{ salary_book: SalaryBookEntry[]; totals: SalaryBookTotals; period: string; employee_count: number }>('hr', { action: 'salary_book', month, year }),
  },

  customers: {
    list: (params?: { search?: string; has_debt?: boolean; page?: number; limit?: number }) =>
      callFunction<{ customers: Customer[]; pagination: Pagination }>('customer', { action: 'list', ...params }),

    get: (id: string) =>
      callFunction<{ customer: CustomerDetail }>('customer', { action: 'get', id }),

    create: (data: CreateCustomerData) =>
      callFunction<{ customer: Customer }>('customer', { action: 'create', ...data }),

    update: (id: string, data: Partial<CreateCustomerData>) =>
      callFunction<{ customer: Customer }>('customer', { action: 'update', id, ...data }),

    search: (params: { query: string; limit?: number }) =>
      callFunction<{ customers: Customer[] }>('customer', { action: 'search', ...params }),
  },

  debts: {
    createCredit: (data: CreateCreditDebtData) =>
      callFunction<{ debt: CustomerDebt }>('debt', { action: 'create_credit', ...data }),

    createInstallment: (data: CreateInstallmentDebtData) =>
      callFunction<{ debt: CustomerDebt; installments: DebtInstallment[] }>('debt', { action: 'create_installment', ...data }),

    recordPayment: (data: RecordPaymentData) =>
      callFunction<{ payment: DebtPayment; debt: CustomerDebt }>('debt', { action: 'record_payment', ...data }),

    list: (params?: { customer_id?: string; status?: string; page?: number; limit?: number }) =>
      callFunction<{ debts: DebtWithCustomer[]; pagination: Pagination }>('debt', { action: 'list', ...params }),

    get: (id: string) =>
      callFunction<{ debt: DebtDetail; payments: DebtPayment[] }>('debt', { action: 'get', id }),

    getCustomerDebts: (customerId: string) =>
      callFunction<{ debts: CustomerDebt[]; summary: CustomerDebtSummary }>('debt', { action: 'get_customer_debts', customer_id: customerId }),

    cancel: (id: string) =>
      callFunction<{ debt: CustomerDebt }>('debt', { action: 'cancel', id }),

    summary: () =>
      callFunction<{ summary: StoreDebtSummary }>('debt', { action: 'summary' }),

    listCustomersWithDebt: () =>
      callFunction<{ customers: Array<{ id: string; name: string; phone: string | null }> }>('debt', { action: 'list_customers_with_debt' }),
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
  transaction_count?: number
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

// HR types
export interface Employee {
  id: string
  store_id: string
  user_id: string | null
  name: string
  phone: string
  id_card: string
  date_of_birth: string | null
  address: string | null
  position: string
  department: string | null
  hire_date: string
  termination_date: string | null
  termination_reason: string | null
  contract_type: 'full_time' | 'part_time' | 'contract'
  base_salary: number
  allowances: number
  dependents: number
  bank_account: string | null
  bank_name: string | null
  social_insurance_no: string | null
  active: boolean
  created_at: string
  created_by: string
}

export interface CreateEmployeeData {
  name: string
  phone: string
  id_card: string
  date_of_birth?: string
  address?: string
  position: string
  department?: string
  hire_date: string
  contract_type: 'full_time' | 'part_time' | 'contract'
  base_salary: number
  allowances?: number
  dependents?: number
  bank_account?: string
  bank_name?: string
  social_insurance_no?: string
}

export interface Attendance {
  id: string
  store_id: string
  employee_id: string
  work_date: string
  check_in: string | null
  check_out: string | null
  working_hours: number | null
  status: 'present' | 'absent' | 'half_day' | 'leave'
  is_late: boolean
  notes: string | null
  created_at: string
}

export interface AttendanceWithEmployee extends Attendance {
  employees: { id: string; name: string; position: string } | null
}

export interface AttendanceSummary {
  total_days: number
  present: number
  half_day: number
  absent: number
  late: number
  total_working_days: number
  total_working_hours: number
}

export interface Payroll {
  id: string
  store_id: string
  employee_id: string
  period_month: number
  period_year: number
  working_days: number
  standard_days: number
  base_salary: number
  pro_rated_salary: number
  allowances: number
  gross_salary: number
  social_insurance: number
  health_insurance: number
  unemployment_insurance: number
  employer_social_insurance: number
  employer_health_insurance: number
  employer_unemployment_insurance: number
  taxable_income: number
  personal_deduction: number
  dependent_deduction: number
  pit: number
  total_deductions: number
  net_salary: number
  status: 'calculated' | 'approved' | 'paid'
  approved_by: string | null
  approved_at: string | null
  payment_method: 'cash' | 'bank_transfer' | null
  paid_date: string | null
  created_at: string
}

export interface PayrollWithEmployee extends Payroll {
  employees: {
    id: string
    name: string
    position: string
    bank_account: string | null
    bank_name: string | null
  } | null
}

export interface PayrollTotals {
  total_gross: number
  total_net: number
  total_insurance_employee: number
  total_insurance_employer: number
  total_pit: number
}

export interface SalaryBookEntry {
  stt: number
  name: string
  position: string
  working_days: string
  base_salary: number
  allowances: number
  gross_salary: number
  social_insurance: number
  health_insurance: number
  unemployment_insurance: number
  pit: number
  net_salary: number
  status: string
}

export interface SalaryBookTotals {
  total_base_salary: number
  total_allowances: number
  total_gross: number
  total_social_insurance: number
  total_health_insurance: number
  total_unemployment_insurance: number
  total_pit: number
  total_net_salary: number
}

// Report types
export interface DashboardSummary {
  today: {
    revenue: number
    orders: number
    avgOrderValue: number
  }
  thisMonth: {
    revenue: number
    expenses: number
    profit: number
    orders: number
  }
  comparison: {
    revenueChange: number
  }
  alerts: {
    lowStockCount: number
    taxDeadlineDays: number
  }
  recentSales: Array<{
    id: string
    invoice_no: string
    total: number
    completed_at: string
    customer_name: string | null
  }>
}

export interface SalesAnalytics {
  period: { start: string; end: string }
  dailySales: Array<{
    date: string
    revenue: number
    orders: number
  }>
  byCategory: Array<{
    category: string
    revenue: number
    percentage: number
  }>
  topProducts: Array<{
    product_name: string
    quantity_sold: number
    revenue: number
  }>
  byHour: Array<{
    hour: number
    orders: number
    revenue: number
  }>
  byPaymentMethod: Array<{
    method: string
    count: number
    amount: number
    percentage: number
  }>
  summary: {
    totalRevenue: number
    totalOrders: number
  }
}

export interface FinancialAnalytics {
  period: { start: string; end: string }
  summary: {
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
    profitMargin: number
  }
  monthlyTrend: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  expenseBreakdown: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export interface RevenueBookReport {
  period: { from: string; to: string }
  year: number
  entries: Array<{
    stt: number
    record_date: string
    voucher_no: string
    voucher_date: string
    description: string
    goods_distribution: number
    service_construction: number
    manufacturing_transport: number
    other_business: number
    note?: string
  }>
  totals: {
    goods_distribution: number
    service_construction: number
    manufacturing_transport: number
    other_business: number
    total_revenue: number
  }
  tax_payable: {
    vat_goods: number
    pit_goods: number
    vat_service: number
    pit_service: number
    vat_manufacturing: number
    pit_manufacturing: number
    vat_other: number
    pit_other: number
    total_vat: number
    total_pit: number
  }
}

export interface CashBookReport {
  period: { from: string; to: string }
  opening_balance: number
  entries: Array<{
    stt: number
    record_date: string
    voucher_date?: string
    voucher_no_in?: string
    voucher_no_out?: string
    description: string
    debit: number
    credit: number
    balance: number
    note?: string
    reference_type?: string | null
  }>
  totals: {
    total_debit: number
    total_credit: number
    closing_balance: number
  }
}

export interface BankBookReport {
  period: { from: string; to: string }
  bank_account?: {
    id: string
    bank_name: string
    account_number: string
    account_name: string
  }
  opening_balance: number
  entries: Array<{
    stt: number
    record_date: string
    voucher_no: string | null
    voucher_date: string
    description: string
    debit: number
    credit: number
    balance: number
    note?: string
  }>
  totals: {
    total_debit: number
    total_credit: number
    closing_balance: number
  }
}

export interface ExpenseBookReport {
  period: { from: string; to: string }
  entries: Array<{
    stt: number
    date: string
    category: string
    category_code?: string
    description: string
    amount: number
    vat_amount: number
    payment_method: string
    invoice_no: string | null
    supplier_name: string | null
  }>
  byCategory: Array<{
    category: string
    amount: number
  }>
  totals: {
    total_amount: number
    total_vat: number
    expense_count: number
  }
}

export interface InventoryBookReport {
  period: { from: string; to: string }
  opening_balance: number
  entries: Array<{
    stt: number
    date: string
    product_name: string
    sku: string
    variant_id: string | null
    movement_type: string
    quantity: number
    before_quantity: number
    after_quantity: number
    reason: string | null
    reference_id: string | null
  }>
  summary: {
    total_in: number
    total_out: number
    total_movements: number
    closing_balance: number
  }
}

export interface InventoryDetailEntry {
  stt: number
  documentNo: string
  documentDate: string
  description: string
  inQty: number | null
  inUnitPrice: number | null
  inAmount: number | null
  outQty: number | null
  outAmount: number | null
  balanceQty: number
  balanceAmount: number
}

export interface InventoryDetailProduct {
  productId: string
  variantId: string | null
  productName: string
  sku: string
  unit: string
  entries: InventoryDetailEntry[]
  totals: {
    totalInQty: number
    totalInAmount: number
    totalOutQty: number
    totalOutAmount: number
    closingQty: number
    closingAmount: number
  }
}

export interface InventoryDetailBookReport {
  period: { from: string; to: string }
  products: InventoryDetailProduct[]
}

export interface TaxBookReport {
  year: number
  quarters: Array<{
    quarter: number
    period_start: string
    period_end: string
    total_revenue: number
    vat_collected: number
    vat_deductible: number
    vat_payable: number
    pit_payable: number
    total_tax: number
    status: string
  }>
  summary: {
    total_revenue: number
    total_vat: number
    total_pit: number
    total_tax: number
  }
}

export interface SalaryBookReport {
  period: string
  entries: Array<{
    stt: number
    name: string
    position: string
    working_days: string
    base_salary: number
    allowances: number
    gross_salary: number
    social_insurance: number
    health_insurance: number
    unemployment_insurance: number
    pit: number
    net_salary: number
    status: string
  }>
  totals: {
    total_base_salary: number
    total_allowances: number
    total_gross: number
    total_insurance: number
    total_pit: number
    total_net: number
    employee_count: number
  }
}

// Invoice types
export interface Invoice {
  id: string
  store_id: string
  sale_id: string
  invoice_no: string | null
  invoice_symbol: string | null
  issue_date: string | null
  provider: string
  provider_invoice_id: string | null
  lookup_code: string | null
  status: 'pending' | 'issued' | 'cancelled' | 'error'
  error_message: string | null
  xml_content: string | null
  created_at: string
  sales?: {
    invoice_no?: string
    customer_name?: string
    total?: number
  } | null
}

export interface InvoiceDetail extends Invoice {
  sales: {
    id: string
    invoice_no: string
    customer_name?: string
    customer_phone?: string
    customer_tax_code?: string
    subtotal: number
    vat_amount: number
    discount: number
    total: number
    completed_at: string
    sale_items: Array<{
      product_name: string
      quantity: number
      unit_price: number
      vat_rate: number
      vat_amount: number
      total: number
    }>
  } | null
}

// Sale types with details
export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  vat_amount: number
  discount: number
  total: number
  variant_id?: string
  variant_name?: string
  unit_id?: string
  unit_name?: string
}

export interface SalePayment {
  id: string
  sale_id: string
  method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
  amount: number
  bank_account_id?: string
  bank_ref?: string
  paid_at: string
}

export interface SaleWithDetails {
  id: string
  store_id: string
  user_id: string
  invoice_no: string
  subtotal: number
  vat_amount: number
  discount: number
  total: number
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
  note?: string
  created_at: string
  completed_at?: string
  sale_items: SaleItem[]
  payments: SalePayment[]
}

// Product Units and Variants types
export interface ProductUnitInput {
  id?: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

export interface VariantUnitPriceInput {
  unit_id: string
  sell_price?: number
  cost_price?: number
  barcode?: string
}

export interface ProductVariantInput {
  id?: string
  sku?: string
  barcode?: string
  name?: string
  cost_price?: number
  sell_price?: number
  quantity: number
  min_stock?: number
  attribute_values?: { attribute_id: string; value_id: string }[]
  unit_prices?: VariantUnitPriceInput[]
}

export interface ProductAttribute {
  id: string
  store_id: string
  name: string
  display_order: number
  created_at: string
  values?: ProductAttributeValue[]
}

export interface ProductAttributeValue {
  id: string
  attribute_id: string
  value: string
  display_order: number
  created_at: string
}

// Inventory types
export interface InventoryLog {
  id: string
  store_id: string
  product_id: string
  variant_id?: string | null
  unit_id?: string | null
  type: 'import' | 'export' | 'sale' | 'return' | 'adjustment'
  quantity: number
  unit_cost: number | null
  total_value: number | null
  note: string | null
  reference_type: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
  products?: { id: string; name: string; unit: string } | null
  product_variants?: { id: string; name: string } | null
  product_units?: { id: string; unit_name: string } | null
}

export interface LowStockProduct {
  id: string
  name: string
  quantity: number
  min_stock: number
  unit: string
  image_url: string | null
}

// Customer types
export interface Customer {
  id: string
  store_id: string
  name: string
  phone: string
  address: string | null
  tax_code: string | null
  notes: string | null
  total_debt: number
  created_at: string
  updated_at: string
}

export interface CreateCustomerData {
  name: string
  phone: string
  address?: string
  tax_code?: string
  notes?: string
}

export interface CustomerWithDebts extends Customer {
  active_debts: number
  overdue_debts: number
}

export interface CustomerDetail extends Customer {
  active_debts: number
  overdue_debts: number
  debts?: Array<{
    id: string
    invoice_no: string
    total_amount: number
    remaining_amount: number
    created_at: string
    is_overdue: boolean
  }>
}

// Debt types
export interface CustomerDebt {
  id: string
  store_id: string
  customer_id: string
  sale_id: string | null
  debt_type: 'credit' | 'installment'
  original_amount: number
  remaining_amount: number
  due_date: string | null
  notes: string | null
  status: 'active' | 'paid' | 'overdue' | 'cancelled'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DebtWithCustomer extends CustomerDebt {
  customer: Customer
}

export interface DebtInstallment {
  id: string
  debt_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_amount: number
  paid_date: string | null
  status: 'pending' | 'paid' | 'partial' | 'overdue'
  notes: string | null
}

export interface DebtPayment {
  id: string
  debt_id: string
  installment_id: string | null
  amount: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id: string | null
  bank_ref: string | null
  notes: string | null
  paid_at: string
  created_by: string | null
}

export interface DebtDetail extends CustomerDebt {
  customer: Customer
  installments: DebtInstallment[]
  payments: DebtPayment[]
}

export interface CustomerDebtSummary {
  total_debt: number
  active_debts: number
  overdue_debts: number
  paid_debts: number
}

export interface StoreDebtSummary {
  total_outstanding: number
  total_customers_with_debt: number
  active_debts: number
  overdue_debts: number
  overdue_amount: number
  collected_this_month: number
}

// Request types
export interface CreateCreditDebtData {
  customer_id: string
  sale_id?: string
  amount: number
  due_date?: string
  notes?: string
}

export interface CreateInstallmentDebtData {
  customer_id: string
  sale_id?: string
  amount: number
  installments: number
  first_due_date: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  notes?: string
}

export interface RecordPaymentData {
  debt_id: string
  installment_id?: string
  amount: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id?: string
  bank_ref?: string
  notes?: string
}

// Category types
export interface Category {
  id: string
  store_id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  children?: Category[]
}

