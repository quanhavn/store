import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  corsHeaders,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface ListProductsRequest {
  action: 'list'
  page?: number
  limit?: number
  search?: string
  category_id?: string
  low_stock?: boolean
  active_only?: boolean
}

interface GetProductRequest {
  action: 'get'
  id: string
}

interface CreateProductRequest {
  action: 'create'
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  cost_price?: number
  sell_price: number
  vat_rate?: number
  quantity?: number
  min_stock?: number
  unit?: string
  image_url?: string
}

interface UpdateProductRequest {
  action: 'update'
  id: string
  name?: string
  sku?: string
  barcode?: string
  category_id?: string
  cost_price?: number
  sell_price?: number
  vat_rate?: number
  quantity?: number
  min_stock?: number
  unit?: string
  image_url?: string
  active?: boolean
}

interface DeleteProductRequest {
  action: 'delete'
  id: string
}

type ProductRequest =
  | ListProductsRequest
  | GetProductRequest
  | CreateProductRequest
  | UpdateProductRequest
  | DeleteProductRequest

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: ProductRequest = await req.json()

    switch (body.action) {
      case 'list': {
        const { page = 1, limit = 20, search, category_id, low_stock, active_only = true } = body

        let query = supabase
          .from('products')
          .select('*, categories(id, name)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('name', { ascending: true })

        if (active_only) {
          query = query.eq('active', true)
        }

        if (search) {
          query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
        }

        if (category_id) {
          query = query.eq('category_id', category_id)
        }

        if (low_stock) {
          query = query.lt('quantity', supabase.rpc('get_min_stock_threshold'))
          // Fallback: filter products where quantity < min_stock
          // This will be handled in the response
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        // Filter low_stock in application if needed
        let products = data || []
        if (low_stock) {
          products = products.filter((p: { quantity: number; min_stock: number }) => p.quantity < p.min_stock)
        }

        return successResponse({
          products,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      case 'get': {
        const { id } = body

        const { data, error } = await supabase
          .from('products')
          .select('*, categories(id, name)')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (error) throw error

        return successResponse({ product: data })
      }

      case 'create': {
        const {
          name,
          sku,
          barcode,
          category_id,
          cost_price = 0,
          sell_price,
          vat_rate = 8,
          quantity = 0,
          min_stock = 10,
          unit = 'cái',
          image_url,
        } = body

        // Check for duplicate barcode/sku
        if (barcode) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', store_id)
            .eq('barcode', barcode)
            .single()

          if (existing) {
            return errorResponse('Mã barcode đã tồn tại', 400)
          }
        }

        if (sku) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', store_id)
            .eq('sku', sku)
            .single()

          if (existing) {
            return errorResponse('Mã SKU đã tồn tại', 400)
          }
        }

        const { data, error } = await supabase
          .from('products')
          .insert({
            store_id,
            name,
            sku,
            barcode,
            category_id,
            cost_price,
            sell_price,
            vat_rate,
            quantity,
            min_stock,
            unit,
            image_url,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ product: data })
      }

      case 'update': {
        const { id, ...updates } = body
        delete (updates as { action?: string }).action

        const { data, error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ product: data })
      }

      case 'delete': {
        const { id } = body

        // Soft delete by setting active = false
        const { data, error } = await supabase
          .from('products')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ product: data, deleted: true })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Products function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
