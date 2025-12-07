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

interface CreateStockCheckRequest {
  action: 'create_stock_check'
  data: {
    note?: string
  }
}

interface GetStockCheckRequest {
  action: 'get_stock_check'
  data: {
    stock_check_id: string
  }
}

interface UpdateStockCheckItemRequest {
  action: 'update_stock_check_item'
  data: {
    stock_check_id: string
    product_id: string
    actual_quantity: number
    note?: string
  }
}

interface SubmitStockCheckRequest {
  action: 'submit_stock_check'
  data: {
    stock_check_id: string
  }
}

interface GetActiveStockCheckRequest {
  action: 'get_active_stock_check'
}

interface CancelStockCheckRequest {
  action: 'cancel_stock_check'
  data: {
    stock_check_id: string
  }
}

type InventoryRequest =
  | ImportStockRequest
  | ExportStockRequest
  | AdjustStockRequest
  | GetLogsRequest
  | GetSummaryRequest
  | GetLowStockRequest
  | CreateStockCheckRequest
  | GetStockCheckRequest
  | UpdateStockCheckItemRequest
  | SubmitStockCheckRequest
  | GetActiveStockCheckRequest
  | CancelStockCheckRequest

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

      case 'create_stock_check': {
        const { data: requestData } = body as CreateStockCheckRequest
        const note = requestData?.note

        // Check if there's already an active stock check
        const { data: existingCheck } = await supabase
          .from('stock_checks')
          .select('id')
          .eq('store_id', store_id)
          .eq('status', 'in_progress')
          .single()

        if (existingCheck) {
          return errorResponse('Đã có phiên kiểm kê đang thực hiện', 400)
        }

        // Create new stock check session
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .insert({
            store_id,
            status: 'in_progress',
            created_by: user.id,
            note,
          })
          .select()
          .single()

        if (checkError) throw checkError

        // Get all active products with current quantities
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, sku, barcode, quantity, unit, cost_price, categories(name)')
          .eq('store_id', store_id)
          .eq('active', true)
          .order('name')

        if (productsError) throw productsError

        // Create stock check items for all products
        const stockCheckItems = products?.map((product) => ({
          stock_check_id: stockCheck.id,
          product_id: product.id,
          system_quantity: product.quantity,
          actual_quantity: null,
          difference: null,
          note: null,
        })) || []

        if (stockCheckItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('stock_check_items')
            .insert(stockCheckItems)

          if (itemsError) throw itemsError
        }

        // Fetch the created items with product details
        const { data: items, error: fetchError } = await supabase
          .from('stock_check_items')
          .select('*, products(id, name, sku, barcode, unit, cost_price, categories(name))')
          .eq('stock_check_id', stockCheck.id)
          .order('products(name)')

        if (fetchError) throw fetchError

        return successResponse({
          stock_check: stockCheck,
          items: items || [],
        })
      }

      case 'get_stock_check': {
        const { data: requestData } = body as GetStockCheckRequest
        const { stock_check_id } = requestData

        // Get stock check
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .select('*')
          .eq('id', stock_check_id)
          .eq('store_id', store_id)
          .single()

        if (checkError || !stockCheck) {
          return errorResponse('Phiên kiểm kê không tồn tại', 404)
        }

        // Get stock check items with product details
        const { data: items, error: itemsError } = await supabase
          .from('stock_check_items')
          .select('*, products(id, name, sku, barcode, unit, cost_price, categories(name))')
          .eq('stock_check_id', stock_check_id)

        if (itemsError) throw itemsError

        return successResponse({
          stock_check: stockCheck,
          items: items || [],
        })
      }

      case 'get_active_stock_check': {
        // Get active stock check for the store
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .select('*')
          .eq('store_id', store_id)
          .eq('status', 'in_progress')
          .single()

        if (checkError || !stockCheck) {
          return successResponse({ stock_check: null, items: [] })
        }

        // Get stock check items with product details
        const { data: items, error: itemsError } = await supabase
          .from('stock_check_items')
          .select('*, products(id, name, sku, barcode, unit, cost_price, categories(name))')
          .eq('stock_check_id', stockCheck.id)

        if (itemsError) throw itemsError

        return successResponse({
          stock_check: stockCheck,
          items: items || [],
        })
      }

      case 'update_stock_check_item': {
        const { data: requestData } = body as UpdateStockCheckItemRequest
        const { stock_check_id, product_id, actual_quantity, note } = requestData

        // Verify stock check exists and is in progress
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .select('id, status')
          .eq('id', stock_check_id)
          .eq('store_id', store_id)
          .single()

        if (checkError || !stockCheck) {
          return errorResponse('Phiên kiểm kê không tồn tại', 404)
        }

        if (stockCheck.status !== 'in_progress') {
          return errorResponse('Phiên kiểm kê đã hoàn thành', 400)
        }

        // Get current stock check item
        const { data: existingItem, error: existingError } = await supabase
          .from('stock_check_items')
          .select('id, system_quantity')
          .eq('stock_check_id', stock_check_id)
          .eq('product_id', product_id)
          .single()

        if (existingError || !existingItem) {
          return errorResponse('Sản phẩm không nằm trong phiên kiểm kê', 404)
        }

        // Calculate difference
        const difference = actual_quantity - existingItem.system_quantity

        // Update stock check item
        const { data: updatedItem, error: updateError } = await supabase
          .from('stock_check_items')
          .update({
            actual_quantity,
            difference,
            note: note || null,
          })
          .eq('id', existingItem.id)
          .select('*, products(id, name, sku, barcode, unit, cost_price, categories(name))')
          .single()

        if (updateError) throw updateError

        return successResponse({ item: updatedItem })
      }

      case 'submit_stock_check': {
        const { data: requestData } = body as SubmitStockCheckRequest
        const { stock_check_id } = requestData

        // Verify stock check exists and is in progress
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .select('*')
          .eq('id', stock_check_id)
          .eq('store_id', store_id)
          .single()

        if (checkError || !stockCheck) {
          return errorResponse('Phiên kiểm kê không tồn tại', 404)
        }

        if (stockCheck.status !== 'in_progress') {
          return errorResponse('Phiên kiểm kê đã hoàn thành', 400)
        }

        // Get all stock check items
        const { data: items, error: itemsError } = await supabase
          .from('stock_check_items')
          .select('*, products(id, name, quantity, cost_price)')
          .eq('stock_check_id', stock_check_id)

        if (itemsError) throw itemsError

        // Filter items that have been counted and have differences
        const itemsWithDifference = items?.filter(
          (item) => item.actual_quantity !== null && item.difference !== 0
        ) || []

        // Process each item with difference
        for (const item of itemsWithDifference) {
          // Update product quantity to actual quantity
          const { error: productError } = await supabase
            .from('products')
            .update({
              quantity: item.actual_quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id)

          if (productError) throw productError

          // Create inventory log for the adjustment
          const { error: logError } = await supabase
            .from('inventory_logs')
            .insert({
              store_id,
              product_id: item.product_id,
              type: 'adjustment',
              quantity: item.difference,
              unit_cost: item.products?.cost_price || 0,
              total_value: Math.abs(item.difference) * (item.products?.cost_price || 0),
              note: `Kiểm kê: ${item.note || `Điều chỉnh từ ${item.system_quantity} thành ${item.actual_quantity}`}`,
              created_by: user.id,
              reference_id: stock_check_id,
              reference_type: 'stock_check',
            })

          if (logError) throw logError
        }

        // Update stock check status
        const { data: updatedCheck, error: updateError } = await supabase
          .from('stock_checks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', stock_check_id)
          .select()
          .single()

        if (updateError) throw updateError

        // Calculate summary
        const totalItems = items?.length || 0
        const countedItems = items?.filter((i) => i.actual_quantity !== null).length || 0
        const itemsWithDifferenceCount = itemsWithDifference.length
        const totalAdjustmentValue = itemsWithDifference.reduce(
          (sum, item) => sum + Math.abs(item.difference) * (item.products?.cost_price || 0),
          0
        )

        return successResponse({
          stock_check: updatedCheck,
          summary: {
            total_items: totalItems,
            counted_items: countedItems,
            items_with_difference: itemsWithDifferenceCount,
            total_adjustment_value: totalAdjustmentValue,
          },
        })
      }

      case 'cancel_stock_check': {
        const { data: requestData } = body as CancelStockCheckRequest
        const { stock_check_id } = requestData

        // Verify stock check exists and is in progress
        const { data: stockCheck, error: checkError } = await supabase
          .from('stock_checks')
          .select('id, status')
          .eq('id', stock_check_id)
          .eq('store_id', store_id)
          .single()

        if (checkError || !stockCheck) {
          return errorResponse('Phiên kiểm kê không tồn tại', 404)
        }

        if (stockCheck.status !== 'in_progress') {
          return errorResponse('Phiên kiểm kê đã hoàn thành', 400)
        }

        // Delete stock check items
        const { error: deleteItemsError } = await supabase
          .from('stock_check_items')
          .delete()
          .eq('stock_check_id', stock_check_id)

        if (deleteItemsError) throw deleteItemsError

        // Delete stock check
        const { error: deleteCheckError } = await supabase
          .from('stock_checks')
          .delete()
          .eq('id', stock_check_id)

        if (deleteCheckError) throw deleteCheckError

        return successResponse({ message: 'Đã hủy phiên kiểm kê' })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Inventory function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
