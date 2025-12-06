import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface ImportStockRequest {
  action: 'import'
  product_id: string
  quantity: number
  unit_cost?: number
  note?: string
}

interface ExportStockRequest {
  action: 'export'
  product_id: string
  quantity: number
  note?: string
}

interface AdjustStockRequest {
  action: 'adjust'
  product_id: string
  new_quantity: number
  note?: string
}

interface GetLogsRequest {
  action: 'logs'
  product_id?: string
  type?: 'import' | 'export' | 'sale' | 'return' | 'adjustment'
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

interface GetSummaryRequest {
  action: 'summary'
}

interface GetLowStockRequest {
  action: 'low_stock'
}

type InventoryRequest =
  | ImportStockRequest
  | ExportStockRequest
  | AdjustStockRequest
  | GetLogsRequest
  | GetSummaryRequest
  | GetLowStockRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: InventoryRequest = await req.json()

    switch (body.action) {
      case 'import': {
        const { product_id, quantity, unit_cost, note } = body

        // Get current product
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, quantity, cost_price')
          .eq('id', product_id)
          .eq('store_id', store_id)
          .single()

        if (productError || !product) {
          return errorResponse('Sản phẩm không tồn tại', 404)
        }

        const newQuantity = product.quantity + quantity
        const costToRecord = unit_cost || product.cost_price

        // Update product quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', product_id)

        if (updateError) throw updateError

        // Create inventory log
        const { data: log, error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            store_id,
            product_id,
            type: 'import',
            quantity,
            unit_cost: costToRecord,
            total_value: quantity * costToRecord,
            note,
            created_by: user.id,
          })
          .select()
          .single()

        if (logError) throw logError

        return successResponse({ log, new_quantity: newQuantity })
      }

      case 'export': {
        const { product_id, quantity, note } = body

        // Get current product
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, quantity, cost_price')
          .eq('id', product_id)
          .eq('store_id', store_id)
          .single()

        if (productError || !product) {
          return errorResponse('Sản phẩm không tồn tại', 404)
        }

        if (product.quantity < quantity) {
          return errorResponse(`Không đủ tồn kho (còn ${product.quantity})`, 400)
        }

        const newQuantity = product.quantity - quantity

        // Update product quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', product_id)

        if (updateError) throw updateError

        // Create inventory log
        const { data: log, error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            store_id,
            product_id,
            type: 'export',
            quantity: -quantity,
            unit_cost: product.cost_price,
            total_value: quantity * product.cost_price,
            note,
            created_by: user.id,
          })
          .select()
          .single()

        if (logError) throw logError

        return successResponse({ log, new_quantity: newQuantity })
      }

      case 'adjust': {
        const { product_id, new_quantity, note } = body

        // Get current product
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, quantity')
          .eq('id', product_id)
          .eq('store_id', store_id)
          .single()

        if (productError || !product) {
          return errorResponse('Sản phẩm không tồn tại', 404)
        }

        const difference = new_quantity - product.quantity

        // Update product quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: new_quantity, updated_at: new Date().toISOString() })
          .eq('id', product_id)

        if (updateError) throw updateError

        // Create inventory log
        const { data: log, error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            store_id,
            product_id,
            type: 'adjustment',
            quantity: difference,
            note: note || `Điều chỉnh từ ${product.quantity} thành ${new_quantity}`,
            created_by: user.id,
          })
          .select()
          .single()

        if (logError) throw logError

        return successResponse({ log, new_quantity })
      }

      case 'logs': {
        const { product_id, type, date_from, date_to, page = 1, limit = 20 } = body

        let query = supabase
          .from('inventory_logs')
          .select('*, products(id, name)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (product_id) {
          query = query.eq('product_id', product_id)
        }

        if (type) {
          query = query.eq('type', type)
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
          logs: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      case 'summary': {
        // Get inventory summary
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name, quantity, cost_price, min_stock, active')
          .eq('store_id', store_id)
          .eq('active', true)

        if (error) throw error

        const totalProducts = products?.length || 0
        const totalValue = products?.reduce((sum, p) => sum + p.quantity * p.cost_price, 0) || 0
        const lowStockCount = products?.filter((p) => p.quantity <= p.min_stock).length || 0
        const outOfStockCount = products?.filter((p) => p.quantity === 0).length || 0

        return successResponse({
          summary: {
            total_products: totalProducts,
            total_value: totalValue,
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
          },
        })
      }

      case 'low_stock': {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, quantity, min_stock, unit, image_url')
          .eq('store_id', store_id)
          .eq('active', true)
          .order('quantity', { ascending: true })

        if (error) throw error

        const lowStockProducts = data?.filter((p) => p.quantity <= p.min_stock) || []

        return successResponse({ products: lowStockProducts })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Inventory function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
