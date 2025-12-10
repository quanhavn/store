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
  variant_id?: string
  quantity: number
  unit_cost?: number
  note?: string
  record_expense?: boolean
  payment_method?: 'cash' | 'bank_transfer'
  bank_account_id?: string
  supplier_name?: string
}

interface ExportStockRequest {
  action: 'export'
  product_id: string
  variant_id?: string
  quantity: number
  note?: string
}

interface AdjustStockRequest {
  action: 'adjust'
  product_id: string
  variant_id?: string
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
        const { 
          product_id,
          variant_id,
          quantity, 
          unit_cost, 
          note, 
          record_expense = false,
          payment_method = 'cash',
          bank_account_id,
          supplier_name
        } = body

        // Use RPC for atomic transaction with finance integration
        const { data: result, error: rpcError } = await supabase.rpc('import_stock_with_variant', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_product_id: product_id,
          p_variant_id: variant_id || null,
          p_quantity: quantity,
          p_unit_cost: unit_cost || null,
          p_note: note || null,
          p_record_expense: record_expense,
          p_payment_method: payment_method,
          p_bank_account_id: bank_account_id || null,
          p_supplier_name: supplier_name || null,
        })

        if (rpcError) {
          console.error('RPC error:', rpcError)
          return errorResponse(rpcError.message || 'Lỗi nhập kho', 400)
        }

        return successResponse({ 
          log: { id: result.inventory_log_id },
          new_quantity: result.new_quantity,
          success: result.success
        })
      }

      case 'export': {
        const { product_id, variant_id, quantity, note } = body

        // Use RPC for atomic transaction with variant support
        const { data: result, error: rpcError } = await supabase.rpc('export_stock_with_variant', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_product_id: product_id,
          p_variant_id: variant_id || null,
          p_quantity: quantity,
          p_note: note || null,
        })

        if (rpcError) {
          console.error('RPC error:', rpcError)
          if (rpcError.message.includes('Insufficient stock')) {
            return errorResponse(rpcError.message.replace('Insufficient stock:', 'Không đủ tồn kho:'), 400)
          }
          return errorResponse(rpcError.message || 'Lỗi xuất kho', 400)
        }

        return successResponse({ 
          log: { id: result.inventory_log_id },
          new_quantity: result.new_quantity,
          success: result.success
        })
      }

      case 'adjust': {
        const { product_id, variant_id, new_quantity, note } = body

        // Use RPC for atomic transaction with variant support
        const { data: result, error: rpcError } = await supabase.rpc('adjust_stock_with_variant', {
          p_store_id: store_id,
          p_user_id: user.id,
          p_product_id: product_id,
          p_variant_id: variant_id || null,
          p_new_quantity: new_quantity,
          p_note: note || null,
        })

        if (rpcError) {
          console.error('RPC error:', rpcError)
          return errorResponse(rpcError.message || 'Lỗi điều chỉnh tồn kho', 400)
        }

        return successResponse({ 
          log: { id: result.inventory_log_id },
          previous_quantity: result.previous_quantity,
          new_quantity: result.new_quantity,
          difference: result.difference,
          success: result.success
        })
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
        // Get inventory summary with variant support
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name, quantity, cost_price, min_stock, active, has_variants, product_variants(id, quantity, cost_price)')
          .eq('store_id', store_id)
          .eq('active', true)

        if (error) throw error

        let totalValue = 0
        let lowStockCount = 0
        let outOfStockCount = 0

        for (const p of products || []) {
          const hasVariants = p.has_variants && p.product_variants && p.product_variants.length > 0

          if (hasVariants) {
            const totalVariantQty = p.product_variants.reduce((sum: number, v: { quantity: number }) => sum + v.quantity, 0)
            const variantValue = p.product_variants.reduce(
              (sum: number, v: { quantity: number; cost_price?: number }) => sum + v.quantity * (v.cost_price ?? p.cost_price),
              0
            )
            totalValue += variantValue
            if (totalVariantQty <= 0) outOfStockCount++
            else if (totalVariantQty <= p.min_stock) lowStockCount++
          } else {
            totalValue += p.quantity * p.cost_price
            if (p.quantity <= 0) outOfStockCount++
            else if (p.quantity <= p.min_stock) lowStockCount++
          }
        }

        return successResponse({
          summary: {
            total_products: products?.length || 0,
            total_value: totalValue,
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
          },
        })
      }

      case 'low_stock': {
        // Fetch products with their variants (including min_stock per variant)
        const { data, error } = await supabase
          .from('products')
          .select('id, name, quantity, min_stock, unit, image_url, sku, cost_price, has_variants, categories(name), product_variants(id, name, sku, barcode, quantity, min_stock, cost_price)')
          .eq('store_id', store_id)
          .eq('active', true)
          .order('quantity', { ascending: true })

        if (error) throw error

        interface VariantData {
          id: string
          name: string | null
          sku: string | null
          barcode: string | null
          quantity: number
          min_stock: number | null
          cost_price: number | null
        }

        interface LowStockVariant {
          id: string
          name: string | null
          sku: string | null
          barcode: string | null
          quantity: number
          min_stock: number
          cost_price: number | null
        }

        // Build list including per-variant low stock alerts
        const lowStockProducts: Array<{
          id: string
          name: string
          quantity: number
          min_stock: number
          unit: string
          image_url: string | null
          sku: string | null
          cost_price: number
          categories: { name: string } | null
          has_variants: boolean
          variant_count: number
          low_stock_variants?: LowStockVariant[]
        }> = []

        for (const p of data || []) {
          const hasVariants = p.has_variants && p.product_variants && p.product_variants.length > 0

          if (hasVariants) {
            // Check each variant individually for low stock
            const lowStockVariants: LowStockVariant[] = (p.product_variants as VariantData[])
              .filter((v) => {
                const variantMinStock = v.min_stock ?? p.min_stock ?? 10
                return v.quantity <= variantMinStock
              })
              .map((v) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                barcode: v.barcode,
                quantity: v.quantity,
                min_stock: v.min_stock ?? p.min_stock ?? 10,
                cost_price: v.cost_price ?? p.cost_price,
              }))
              .sort((a, b) => a.quantity - b.quantity)

            // If any variant is low stock, include product with variant details
            if (lowStockVariants.length > 0) {
              const totalVariantQty = (p.product_variants as VariantData[]).reduce((sum, v) => sum + v.quantity, 0)
              lowStockProducts.push({
                id: p.id,
                name: p.name,
                quantity: totalVariantQty,
                min_stock: p.min_stock,
                unit: p.unit,
                image_url: p.image_url,
                sku: p.sku,
                cost_price: p.cost_price,
                categories: p.categories,
                has_variants: true,
                variant_count: p.product_variants.length,
                low_stock_variants: lowStockVariants,
              })
            }
          } else {
            // Non-variant product: check product-level stock
            if (p.quantity <= p.min_stock) {
              lowStockProducts.push({
                id: p.id,
                name: p.name,
                quantity: p.quantity,
                min_stock: p.min_stock,
                unit: p.unit,
                image_url: p.image_url,
                sku: p.sku,
                cost_price: p.cost_price,
                categories: p.categories,
                has_variants: false,
                variant_count: 0,
              })
            }
          }
        }

        // Sort by quantity ascending (most critical first)
        lowStockProducts.sort((a, b) => a.quantity - b.quantity)

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
        // Note: difference is a generated column, don't include it in insert
        const stockCheckItems = products?.map((product) => ({
          stock_check_id: stockCheck.id,
          product_id: product.id,
          system_quantity: product.quantity,
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

        // Update stock check item (difference is a generated column, don't update it)
        const { data: updatedItem, error: updateError } = await supabase
          .from('stock_check_items')
          .update({
            actual_quantity,
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
