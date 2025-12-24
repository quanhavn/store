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
  name?: string
  quantity: number
  min_stock?: number
  attribute_values?: { attribute_id: string; value_id: string }[]
  unit_prices?: VariantUnitPrice[]
  // These are now stored in variant_units, but kept here for form compatibility
  sku?: string
  barcode?: string
  cost_price?: number
  sell_price?: number
}

interface VariantUnitPrice {
  unit_id: string
  sell_price?: number
  cost_price?: number
  barcode?: string
  sku?: string
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
  sell_price?: number
  vat_rate?: number
  pit_rate?: number
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
  pit_rate?: number
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
        const { page = 1, limit = 20, search, category_id, low_stock, active_only = true, include_variants = false, include_units = false } = body

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

        // low_stock filtering is done in application layer after fetch
        // since we need to compare quantity < min_stock per product

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        // Filter low_stock in application if needed
        let products = data || []
        if (low_stock) {
          products = products.filter((p: { quantity: number; min_stock: number }) => p.quantity < p.min_stock)
        }

        // Fetch variants and units for each product if requested
        if (include_variants || include_units) {
          const productIds = products.map((p: { id: string }) => p.id)
          
          let variantsMap: Record<string, unknown[]> = {}
          let unitsMap: Record<string, unknown[]> = {}
          
          if (include_variants && productIds.length > 0) {
            // Fetch variants with their variant_units for pricing
            const { data: variantData } = await supabase
              .from('product_variants')
              .select('*, variant_units(*)')
              .in('product_id', productIds)
              .eq('active', true)
              .order('name')
            
            if (variantData) {
              variantData.forEach((v: { product_id: string; variant_units?: { unit_id: string; sell_price?: number; cost_price?: number; sku?: string; barcode?: string; is_base_unit?: boolean; active?: boolean }[] }) => {
                if (!variantsMap[v.product_id]) variantsMap[v.product_id] = []
                // Extract base unit prices to variant level for backwards compatibility
                const baseUnitEntry = v.variant_units?.find(vu => vu.active !== false)
                const variantWithPrices = {
                  ...v,
                  sell_price: baseUnitEntry?.sell_price ?? null,
                  cost_price: baseUnitEntry?.cost_price ?? null,
                  sku: baseUnitEntry?.sku ?? null,
                  barcode: baseUnitEntry?.barcode ?? null,
                }
                variantsMap[v.product_id].push(variantWithPrices)
              })
            }
          }
          
          if (include_units && productIds.length > 0) {
            const { data: unitData } = await supabase
              .from('product_units')
              .select('*')
              .in('product_id', productIds)
              .eq('active', true)
              .order('is_base_unit', { ascending: false })
              .order('conversion_rate')
            
            if (unitData) {
              unitData.forEach((u: { product_id: string }) => {
                if (!unitsMap[u.product_id]) unitsMap[u.product_id] = []
                unitsMap[u.product_id].push(u)
              })
            }
          }
          
          products = products.map((p: { id: string; has_variants?: boolean; has_units?: boolean }) => ({
            ...p,
            variants: p.has_variants ? (variantsMap[p.id] || []) : undefined,
            units: p.has_units ? (unitsMap[p.id] || []) : undefined,
          }))
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

          // Always fetch variant_units for pricing (prices are now stored in variant_units table)
          if (variants && variants.length > 0) {
            const variantIds = variants.map((v: { id: string }) => v.id)
            const { data: variantUnitsData } = await supabase
              .from('variant_units')
              .select('*, product_units(id, unit_name, conversion_rate, is_base_unit)')
              .in('variant_id', variantIds)
              .eq('active', true)

            if (variantUnitsData) {
              const variantUnitsMap: Record<string, unknown[]> = {}
              variantUnitsData.forEach((vu: { variant_id: string }) => {
                if (!variantUnitsMap[vu.variant_id]) variantUnitsMap[vu.variant_id] = []
                variantUnitsMap[vu.variant_id].push(vu)
              })

              variants = variants.map((v: { id: string }) => {
                const vUnits = variantUnitsMap[v.id] || []
                // Find base unit entry (or first entry for variants-only products) to extract prices
                const baseUnitEntry = vUnits.find((vu: { product_units?: { is_base_unit?: boolean }; active?: boolean }) => 
                  vu.active !== false && (vu.product_units?.is_base_unit === true || !data.has_units)
                ) as { sell_price?: number; cost_price?: number; sku?: string; barcode?: string } | undefined
                return {
                  ...v,
                  variant_units: data.has_units ? vUnits : undefined,
                  // Add base unit prices to variant level for backwards compatibility
                  sell_price: baseUnitEntry?.sell_price ?? null,
                  cost_price: baseUnitEntry?.cost_price ?? null,
                  sku: baseUnitEntry?.sku ?? null,
                  barcode: baseUnitEntry?.barcode ?? null,
                }
              })
            }
          }
        }

        // Build variant_unit_combinations for products with both variants and units
        let variant_unit_combinations = null
        if (data.has_variants && data.has_units && variants && units) {
          variant_unit_combinations = []
          for (const variant of variants as { id: string; name: string; quantity: number; variant_units?: { unit_id: string; sell_price?: number; cost_price?: number; barcode?: string; sku?: string }[] }[]) {
            for (const unit of units as { id: string; unit_name: string; conversion_rate: number; is_base_unit: boolean; sell_price?: number; cost_price?: number }[]) {
              const variantUnit = variant.variant_units?.find((vu: { unit_id: string }) => vu.unit_id === unit.id)
              // Prices are now always stored in variant_units - no fallback to variant columns
              const effectiveSellPrice = variantUnit?.sell_price ?? unit.sell_price ?? 0
              const effectiveCostPrice = variantUnit?.cost_price ?? unit.cost_price ?? 0
              
              variant_unit_combinations.push({
                variant_id: variant.id,
                variant_name: variant.name,
                variant_quantity: variant.quantity,
                unit_id: unit.id,
                unit_name: unit.unit_name,
                conversion_rate: unit.conversion_rate,
                is_base_unit: unit.is_base_unit,
                effective_sell_price: effectiveSellPrice,
                effective_cost_price: effectiveCostPrice,
                effective_barcode: variantUnit?.barcode,
                effective_sku: variantUnit?.sku,
                display_name: `${variant.name} (${unit.unit_name})`,
              })
            }
          }
        }

        return successResponse({ product: { ...data, units, variants, variant_unit_combinations } })
      }

      case 'create': {
        const {
          name,
          sku,
          barcode,
          category_id,
          cost_price = 0,
          sell_price: requestSellPrice,
          vat_rate = 8,
          pit_rate: requestPitRate,
          quantity = 0,
          min_stock = 10,
          unit = 'cái',
          image_url,
          has_variants = false,
          has_units = false,
          units = [],
          variants = [],
        } = body

        // For products with variants, use first variant's sell_price if not provided at product level
        let sell_price = requestSellPrice
        if (has_variants && variants.length > 0 && sell_price === undefined) {
          sell_price = (variants as ProductVariant[])[0].sell_price ?? 0
        }
        if (sell_price === undefined) {
          sell_price = 0
        }

        // Fetch store's pit_rate for fallback
        const { data: store } = await supabase
          .from('stores')
          .select('default_vat_rate, pit_rate')
          .eq('id', store_id)
          .single()

        const pit_rate = requestPitRate ?? store?.pit_rate ?? 0.5

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
            pit_rate,
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

        // Always create base unit for products with variants or units
        let baseUnitId: string | null = null
        if (has_units || has_variants) {
          const { data: baseUnitData } = await supabase
            .from('product_units')
            .insert({
              product_id: productId,
              unit_name: unit,
              conversion_rate: 1,
              is_base_unit: true,
              is_default: true,
              sell_price: sell_price,
              cost_price: cost_price,
            })
            .select()
            .single()
          
          baseUnitId = baseUnitData?.id || null
          
          // Insert additional units (only if has_units)
          if (has_units && units.length > 0) {
            const unitsToInsert = units.filter((u: ProductUnit) => !u.is_base_unit).map((u: ProductUnit) => ({
              product_id: productId,
              unit_name: u.unit_name,
              conversion_rate: u.conversion_rate,
              barcode: u.barcode,
              sell_price: u.sell_price,
              cost_price: u.cost_price,
              is_base_unit: false,
              is_default: u.is_default,
            }))

            if (unitsToInsert.length > 0) {
              await supabase.from('product_units').insert(unitsToInsert)
            }
          }
        }

        // Create variants if provided
        if (has_variants && variants.length > 0) {
          for (const v of variants as ProductVariant[]) {
            const { data: variantData, error: variantError } = await supabase
              .from('product_variants')
              .insert({
                product_id: productId,
                name: v.name,
                quantity: v.quantity,
                min_stock: v.min_stock ?? min_stock,
              })
              .select()
              .single()

            if (variantError) continue

            // Create variant attribute associations
            if (v.attribute_values && v.attribute_values.length > 0) {
              await supabase.from('product_variant_attributes').insert(
                v.attribute_values.map((av) => ({
                  variant_id: variantData.id,
                  attribute_id: av.attribute_id,
                  attribute_value_id: av.value_id,
                }))
              )
            }

            // Create variant_units entry (base unit + additional units)
            if (baseUnitId) {
              const variantUnits = [{
                variant_id: variantData.id,
                unit_id: baseUnitId,
                sell_price: v.sell_price ?? sell_price,
                cost_price: v.cost_price ?? cost_price,
                barcode: v.barcode,
                sku: v.sku,
              }]
              
              // Add additional units if has_units
              if (has_units && v.unit_prices) {
                v.unit_prices.forEach((up) => {
                  variantUnits.push({
                    variant_id: variantData.id,
                    unit_id: up.unit_id,
                    sell_price: up.sell_price,
                    cost_price: up.cost_price,
                    barcode: up.barcode,
                    sku: up.sku,
                  })
                })
              }
              
              await supabase.from('variant_units').insert(variantUnits)
            }

            // Log initial inventory
            if (v.quantity > 0) {
              await supabase.from('inventory_logs').insert({
                store_id,
                product_id: productId,
                variant_id: variantData.id,
                type: 'import',
                quantity: v.quantity,
                unit_cost: v.cost_price ?? cost_price,
                total_value: v.quantity * (v.cost_price ?? cost_price),
                note: 'Tồn kho ban đầu',
                created_by: user.id,
                reference_type: 'initial_stock',
                reference_id: variantData.id,
              })
            }
          }
        }

        // Log initial inventory for product without variants
        if (!has_variants && quantity > 0) {
          await supabase.from('inventory_logs').insert({
            store_id,
            product_id: productId,
            variant_id: null,
            type: 'import',
            quantity: quantity,
            unit_cost: cost_price,
            total_value: quantity * cost_price,
            note: 'Tồn kho ban đầu',
            created_by: user.id,
            reference_type: 'initial_stock',
            reference_id: productId,
          })
        }

        return successResponse({ product: data })
      }

      case 'update': {
        const { id, units, variants, ...updates } = body
        delete (updates as { action?: string }).action

        // Get old product data to detect quantity changes
        const { data: oldProduct } = await supabase
          .from('products')
          .select('quantity, cost_price, has_variants')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        const { data, error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        // Log inventory if quantity changed for non-variant product
        if (oldProduct && !oldProduct.has_variants && updates.quantity !== undefined) {
          const oldQty = oldProduct.quantity || 0
          const newQty = updates.quantity as number

          if (newQty !== oldQty) {
            // Use RPC to ensure WAC and inventory_costs are updated atomically
            const { error: rpcError } = await supabase.rpc('adjust_stock_with_variant', {
              p_store_id: store_id,
              p_user_id: user.id,
              p_product_id: id,
              p_variant_id: null,
              p_new_quantity: newQty,
              p_note: `Điều chỉnh từ ${oldQty} thành ${newQty}`,
            })

            if (rpcError) {
              console.error('RPC adjust_stock_with_variant error:', rpcError)
            }
          }
        }

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
          // Get or create base unit
          let { data: baseUnitData } = await supabase
            .from('product_units')
            .select('id')
            .eq('product_id', id)
            .eq('is_base_unit', true)
            .eq('active', true)
            .single()
          
          if (!baseUnitData) {
            const { data: newUnit } = await supabase
              .from('product_units')
              .insert({
                product_id: id,
                unit_name: data.unit || 'cái',
                conversion_rate: 1,
                is_base_unit: true,
                is_default: true,
                sell_price: data.sell_price,
                cost_price: data.cost_price,
              })
              .select()
              .single()
            baseUnitData = newUnit
          }
          const baseUnitId = baseUnitData?.id

          // Get existing variants
          const { data: existingVariants } = await supabase
            .from('product_variants')
            .select('id, quantity')
            .eq('product_id', id)

          const existingMap = new Map((existingVariants || []).map((v: { id: string; quantity: number }) => [v.id, v]))
          const existingIds = new Set((existingVariants || []).map((v: { id: string }) => v.id))
          const newVariants = (variants as ProductVariant[]).filter(v => !v.id || v.id.startsWith('temp-'))
          const updateVariants = (variants as ProductVariant[]).filter(v => v.id && !v.id.startsWith('temp-'))
          const submittedIds = new Set(updateVariants.map(v => v.id))

          // Soft delete removed variants
          for (const existingId of existingIds) {
            if (!submittedIds.has(existingId)) {
              await supabase.from('product_variants').update({ active: false }).eq('id', existingId)
            }
          }

          // Update existing variants
          for (const v of updateVariants) {
            const oldQty = (existingMap.get(v.id!) as { quantity: number })?.quantity || 0
            const newQty = v.quantity || 0

            await supabase
              .from('product_variants')
              .update({ name: v.name, min_stock: v.min_stock, updated_at: new Date().toISOString() })
              .eq('id', v.id)

            // Use RPC for quantity changes to ensure WAC and inventory_costs are updated
            if (newQty !== oldQty) {
              const { error: rpcError } = await supabase.rpc('adjust_stock_with_variant', {
                p_store_id: store_id,
                p_user_id: user.id,
                p_product_id: id,
                p_variant_id: v.id,
                p_new_quantity: newQty,
                p_note: `Điều chỉnh từ ${oldQty} thành ${newQty}`,
              })

              if (rpcError) {
                console.error('RPC adjust_stock_with_variant error:', rpcError)
              }
            }

            // Upsert variant_units for base unit
            if (baseUnitId) {
              await supabase
                .from('variant_units')
                .upsert({
                  variant_id: v.id,
                  unit_id: baseUnitId,
                  sell_price: v.sell_price,
                  cost_price: v.cost_price,
                  barcode: v.barcode,
                  sku: v.sku,
                }, { onConflict: 'variant_id,unit_id' })

              // Additional units (only if has_units)
              if (updates.has_units && v.unit_prices) {
                for (const up of v.unit_prices) {
                  await supabase
                    .from('variant_units')
                    .upsert({
                      variant_id: v.id,
                      unit_id: up.unit_id,
                      sell_price: up.sell_price,
                      cost_price: up.cost_price,
                      barcode: up.barcode,
                      sku: up.sku,
                    }, { onConflict: 'variant_id,unit_id' })
                }
              }
            }
          }

          // Insert new variants
          for (const v of newVariants) {
            const { data: variantData, error: variantError } = await supabase
              .from('product_variants')
              .insert({ product_id: id, name: v.name, quantity: 0, min_stock: v.min_stock })
              .select()
              .single()

            if (variantError) continue

            // Use RPC for initial inventory to ensure inventory_costs is initialized
            if (v.quantity > 0) {
              const costPrice = v.cost_price ?? data.cost_price ?? 0
              const { error: rpcError } = await supabase.rpc('import_stock_with_variant', {
                p_store_id: store_id,
                p_user_id: user.id,
                p_product_id: id,
                p_variant_id: variantData.id,
                p_quantity: v.quantity,
                p_unit_cost: costPrice,
                p_note: 'Tồn kho ban đầu',
                p_record_expense: false,
              })

              if (rpcError) {
                console.error('RPC import_stock_with_variant error:', rpcError)
              }
            }

            // Create attributes
            if (v.attribute_values?.length) {
              await supabase.from('product_variant_attributes').insert(
                v.attribute_values.map((av) => ({
                  variant_id: variantData.id,
                  attribute_id: av.attribute_id,
                  attribute_value_id: av.value_id,
                }))
              )
            }

            // Create variant_units
            if (baseUnitId) {
              const variantUnits = [{
                variant_id: variantData.id,
                unit_id: baseUnitId,
                sell_price: v.sell_price,
                cost_price: v.cost_price,
                barcode: v.barcode,
                sku: v.sku,
              }]

              if (updates.has_units && v.unit_prices) {
                v.unit_prices.forEach((up) => {
                  variantUnits.push({
                    variant_id: variantData.id,
                    unit_id: up.unit_id,
                    sell_price: up.sell_price,
                    cost_price: up.cost_price,
                    barcode: up.barcode,
                    sku: up.sku,
                  })
                })
              }

              await supabase.from('variant_units').insert(variantUnits)
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
