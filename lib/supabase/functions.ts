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
}
