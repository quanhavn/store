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

interface CreateSaleRequest {
  action: 'create'
  items: CartItem[]
  payments: PaymentInfo[]
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
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
        const { items, payments, customer_name, customer_phone, customer_tax_code, discount = 0, note } = body

        if (!items || items.length === 0) {
          return errorResponse('Giỏ hàng trống', 400)
        }

        if (!payments || payments.length === 0) {
          return errorResponse('Chưa chọn phương thức thanh toán', 400)
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

        // Validate payment total
        const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0)
        if (paymentTotal < total) {
          return errorResponse('Số tiền thanh toán không đủ', 400)
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
            return errorResponse(`Sản phẩm không tồn tại: ${item.product_name}`, 400)
          }

          if (product.quantity < item.quantity) {
            return errorResponse(`Không đủ tồn kho: ${item.product_name} (còn ${product.quantity})`, 400)
          }
        }

        // Generate invoice number
        const invoice_no = await generateInvoiceNo(supabase, store_id)

        // Create sale record
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

        // Create payments
        const paymentRecords = payments.map((p) => ({
          sale_id: sale.id,
          method: p.method,
          amount: p.amount,
          bank_account_id: p.bank_account_id,
          bank_ref: p.bank_ref,
        }))

        const { error: paymentsError } = await supabase.from('payments').insert(paymentRecords)
        if (paymentsError) throw paymentsError

        // Update product quantities and create inventory logs
        for (const item of items) {
          // Decrease stock
          const { error: stockError } = await supabase.rpc('decrease_product_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })

          // Fallback if RPC doesn't exist
          if (stockError) {
            await supabase
              .from('products')
              .update({ quantity: supabase.rpc('subtract', { a: 'quantity', b: item.quantity }) })
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

        // Record to cash/bank book
        for (const payment of payments) {
          if (payment.method === 'cash') {
            await supabase.from('cash_book').insert({
              store_id,
              description: `Bán hàng - ${invoice_no}`,
              reference_type: 'sale',
              reference_id: sale.id,
              debit: payment.amount,
              credit: 0,
              created_by: user.id,
            })
          } else if (payment.method === 'bank_transfer' && payment.bank_account_id) {
            await supabase.from('bank_book').insert({
              store_id,
              bank_account_id: payment.bank_account_id,
              description: `Bán hàng - ${invoice_no}`,
              reference_type: 'sale',
              reference_id: sale.id,
              debit: payment.amount,
              credit: 0,
              bank_ref: payment.bank_ref,
            })
          }
        }

        return successResponse({
          sale: {
            ...sale,
            items: saleItems,
            payments: paymentRecords,
          },
        })
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
