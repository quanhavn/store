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

interface CreateSaleRequest {
  action: 'create'
  items: CartItem[]
  payments: PaymentInfo[]
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
  customer_id?: string
  create_debt?: boolean
  debt_type?: 'credit' | 'installment'
  debt_options?: DebtOptions
  debt_payment?: { amount: number }
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
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: POSRequest = await req.json()

    switch (body.action) {
      // ========================================================================
      // CREATE SALE - Uses RPC for atomic transaction
      // ========================================================================
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

        // Call RPC for atomic transaction
        const { data, error } = await supabase.rpc('create_sale', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_items: items,
          p_payments: payments || [],
          p_customer_id: customer_id || null,
          p_customer_name: customer_name || null,
          p_customer_phone: customer_phone || null,
          p_customer_tax_code: customer_tax_code || null,
          p_discount: discount,
          p_note: note || null,
          p_create_debt: create_debt || false,
          p_debt_type: debt_type || null,
          p_debt_due_date: debt_options?.due_date || null,
          p_debt_installments: debt_options?.installments || null,
          p_debt_frequency: debt_options?.frequency || null,
          p_debt_first_due_date: debt_options?.first_due_date || null,
          p_debt_payment_amount: debt_payment?.amount || 0,
        })

        if (error) {
          // Parse PostgreSQL error messages for user-friendly responses
          const message = error.message || 'Loi tao don hang'
          if (message.includes('Cart is empty')) {
            return errorResponse('Gio hang trong', 400)
          }
          if (message.includes('Payment amount insufficient')) {
            return errorResponse(message.replace('Payment amount insufficient. ', 'So tien thanh toan khong du. '), 400)
          }
          if (message.includes('Customer required')) {
            return errorResponse('Can chon khach hang de tao cong no', 400)
          }
          if (message.includes('Invalid debt type')) {
            return errorResponse('Loai cong no khong hop le', 400)
          }
          if (message.includes('Installments must be')) {
            return errorResponse('So ky tra gop phai tu 2 den 12', 400)
          }
          if (message.includes('Invalid installment frequency')) {
            return errorResponse('Tan suat tra gop khong hop le', 400)
          }
          if (message.includes('First due date required')) {
            return errorResponse('Vui long chon ngay tra gop dau tien', 400)
          }
          if (message.includes('Product not found')) {
            return errorResponse(message.replace('Product not found: ', 'San pham khong ton tai: '), 400)
          }
          if (message.includes('Insufficient stock')) {
            return errorResponse(message.replace('Insufficient stock for ', 'Khong du ton kho: '), 400)
          }
          throw error
        }

        // Fetch the complete sale data for response
        const { data: sale } = await supabase
          .from('sales')
          .select(`
            *,
            sale_items(*),
            payments(*)
          `)
          .eq('id', data.sale_id)
          .single()

        // Fetch debt info if created
        let debtInfo = null
        if (data.debt_id) {
          const { data: debt } = await supabase
            .from('customer_debts')
            .select('*')
            .eq('id', data.debt_id)
            .single()

          if (debt?.debt_type === 'installment') {
            const { data: installments } = await supabase
              .from('debt_installments')
              .select('*')
              .eq('debt_id', data.debt_id)
              .order('installment_number')

            debtInfo = { debt, installments }
          } else {
            debtInfo = { debt }
          }
        }

        const response: Record<string, unknown> = { sale }
        if (debtInfo) {
          response.debt = debtInfo
        }

        return successResponse(response)
      }

      // ========================================================================
      // GET SALE - Simple query via client
      // ========================================================================
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

      // ========================================================================
      // LIST SALES - Simple query via client
      // ========================================================================
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
