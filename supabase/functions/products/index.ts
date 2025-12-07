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

interface ProductUnit {
  id?: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

interface ProductVariant {
  id?: string
  sku?: string
  barcode?: string
  name?: string
  cost_price?: number
  sell_price?: number
  quantity: number
  min_stock?: number
  attribute_values?: { attribute_id: string; value_id: string }[]
}

interface ListProductsRequest {
  action: 'list'
  page?: number
  limit?: number
  search?: string
  category_id?: string
  low_stock?: boolean
  active_only?: boolean
  include_variants?: boolean
  include_units?: boolean
}

interface GetProductRequest {
  action: 'get'
  id: string
  include_variants?: boolean
  include_units?: boolean
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
  has_variants?: boolean
  has_units?: boolean
  units?: ProductUnit[]
  variants?: ProductVariant[]
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
  has_variants?: boolean
  has_units?: boolean
  units?: ProductUnit[]
  variants?: ProductVariant[]
}

interface DeleteProductRequest {
  action: 'delete'
  id: string
}

// Unit management actions
interface CreateUnitRequest {
  action: 'create_unit'
  product_id: string
  unit: ProductUnit
}

interface UpdateUnitRequest {
  action: 'update_unit'
  unit_id: string
  unit: Partial<ProductUnit>
}

interface DeleteUnitRequest {
  action: 'delete_unit'
  unit_id: string
}

// Variant management actions
interface CreateVariantRequest {
  action: 'create_variant'
  product_id: string
  variant: ProductVariant
}

interface UpdateVariantRequest {
  action: 'update_variant'
  variant_id: string
  variant: Partial<ProductVariant>
}

interface DeleteVariantRequest {
  action: 'delete_variant'
  variant_id: string
}

type ProductRequest =
  | ListProductsRequest
  | GetProductRequest
  | CreateProductRequest
  | UpdateProductRequest
  | DeleteProductRequest
  | CreateUnitRequest
  | UpdateUnitRequest
  | DeleteUnitRequest
  | CreateVariantRequest
  | UpdateVariantRequest
  | DeleteVariantRequest

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
        const { id, include_variants = false, include_units = false } = body

        const { data, error } = await supabase
          .from('products')
          .select('*, categories(id, name)')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (error) throw error

        // Fetch units if requested
        let units = null
        if (include_units && data.has_units) {
          const { data: unitData } = await supabase
            .from('product_units')
            .select('*')
            .eq('product_id', id)
            .eq('active', true)
            .order('is_base_unit', { ascending: false })
            .order('conversion_rate')

          units = unitData
        }

        // Fetch variants if requested
        let variants = null
        if (include_variants && data.has_variants) {
          const { data: variantData } = await supabase
            .from('product_variants')
            .select('*, product_variant_attributes(*, product_attributes(name), product_attribute_values(value))')
            .eq('product_id', id)
            .eq('active', true)
            .order('name')

          variants = variantData
        }

        return successResponse({ product: { ...data, units, variants } })
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
          has_variants = false,
          has_units = false,
          units = [],
          variants = [],
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
            quantity: has_variants ? 0 : quantity, // If has variants, stock is tracked per variant
            min_stock,
            unit,
            image_url,
            has_variants,
            has_units,
          })
          .select()
          .single()

        if (error) throw error

        const productId = data.id

        // Create units if provided
        if (has_units && units.length > 0) {
          const unitsToInsert = units.map((u: ProductUnit) => ({
            product_id: productId,
            unit_name: u.unit_name,
            conversion_rate: u.conversion_rate,
            barcode: u.barcode,
            sell_price: u.sell_price,
            cost_price: u.cost_price,
            is_base_unit: u.is_base_unit,
            is_default: u.is_default,
          }))

          const { error: unitsError } = await supabase
            .from('product_units')
            .insert(unitsToInsert)

          if (unitsError) {
            console.error('Failed to create units:', unitsError)
          }
        }

        // Create variants if provided
        if (has_variants && variants.length > 0) {
          for (const v of variants as ProductVariant[]) {
            const { data: variantData, error: variantError } = await supabase
              .from('product_variants')
              .insert({
                product_id: productId,
                sku: v.sku,
                barcode: v.barcode,
                name: v.name,
                cost_price: v.cost_price ?? cost_price,
                sell_price: v.sell_price ?? sell_price,
                quantity: v.quantity,
                min_stock: v.min_stock ?? min_stock,
              })
              .select()
              .single()

            if (variantError) {
              console.error('Failed to create variant:', variantError)
              continue
            }

            // Create variant attribute associations
            if (v.attribute_values && v.attribute_values.length > 0) {
              const attrsToInsert = v.attribute_values.map((av) => ({
                variant_id: variantData.id,
                attribute_id: av.attribute_id,
                attribute_value_id: av.value_id,
              }))

              const { error: attrError } = await supabase
                .from('product_variant_attributes')
                .insert(attrsToInsert)

              if (attrError) {
                console.error('Failed to create variant attributes:', attrError)
              }
            }
          }
        }

        return successResponse({ product: data })
      }

      case 'update': {
        const { id, units, variants, ...updates } = body
        delete (updates as { action?: string }).action

        const { data, error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        // Handle units update if provided
        if (updates.has_units && units) {
          // Get existing units
          const { data: existingUnits } = await supabase
            .from('product_units')
            .select('id')
            .eq('product_id', id)

          const existingIds = new Set((existingUnits || []).map((u: { id: string }) => u.id))
          const newUnits = (units as ProductUnit[]).filter(u => !u.id || u.id.startsWith('temp-'))
          const updateUnits = (units as ProductUnit[]).filter(u => u.id && !u.id.startsWith('temp-'))
          const submittedIds = new Set(updateUnits.map(u => u.id))

          // Delete units that are no longer present
          for (const existingId of existingIds) {
            if (!submittedIds.has(existingId)) {
              await supabase.from('product_units').update({ active: false }).eq('id', existingId)
            }
          }

          // Update existing units
          for (const unit of updateUnits) {
            await supabase
              .from('product_units')
              .update({
                unit_name: unit.unit_name,
                conversion_rate: unit.conversion_rate,
                barcode: unit.barcode,
                sell_price: unit.sell_price,
                cost_price: unit.cost_price,
                is_base_unit: unit.is_base_unit,
                is_default: unit.is_default,
              })
              .eq('id', unit.id)
          }

          // Insert new units
          if (newUnits.length > 0) {
            const unitsToInsert = newUnits.map(u => ({
              product_id: id,
              unit_name: u.unit_name,
              conversion_rate: u.conversion_rate,
              barcode: u.barcode,
              sell_price: u.sell_price,
              cost_price: u.cost_price,
              is_base_unit: u.is_base_unit,
              is_default: u.is_default,
            }))

            await supabase.from('product_units').insert(unitsToInsert)
          }
        }

        // Handle variants update if provided
        if (updates.has_variants && variants) {
          // Get existing variants
          const { data: existingVariants } = await supabase
            .from('product_variants')
            .select('id')
            .eq('product_id', id)

          const existingIds = new Set((existingVariants || []).map((v: { id: string }) => v.id))
          const newVariants = (variants as ProductVariant[]).filter(v => !v.id || v.id.startsWith('temp-'))
          const updateVariants = (variants as ProductVariant[]).filter(v => v.id && !v.id.startsWith('temp-'))
          const submittedIds = new Set(updateVariants.map(v => v.id))

          // Soft delete variants that are no longer present
          for (const existingId of existingIds) {
            if (!submittedIds.has(existingId)) {
              await supabase.from('product_variants').update({ active: false }).eq('id', existingId)
            }
          }

          // Update existing variants
          for (const variant of updateVariants) {
            await supabase
              .from('product_variants')
              .update({
                sku: variant.sku,
                barcode: variant.barcode,
                name: variant.name,
                cost_price: variant.cost_price,
                sell_price: variant.sell_price,
                quantity: variant.quantity,
                min_stock: variant.min_stock,
                updated_at: new Date().toISOString(),
              })
              .eq('id', variant.id)
          }

          // Insert new variants
          for (const v of newVariants) {
            const { data: variantData, error: variantError } = await supabase
              .from('product_variants')
              .insert({
                product_id: id,
                sku: v.sku,
                barcode: v.barcode,
                name: v.name,
                cost_price: v.cost_price,
                sell_price: v.sell_price,
                quantity: v.quantity,
                min_stock: v.min_stock,
              })
              .select()
              .single()

            if (!variantError && v.attribute_values && v.attribute_values.length > 0) {
              const attrsToInsert = v.attribute_values.map((av) => ({
                variant_id: variantData.id,
                attribute_id: av.attribute_id,
                attribute_value_id: av.value_id,
              }))

              await supabase.from('product_variant_attributes').insert(attrsToInsert)
            }
          }
        }

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
