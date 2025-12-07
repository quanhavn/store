import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface ListAttributesRequest {
  action: 'list'
}

interface CreateAttributeRequest {
  action: 'create'
  name: string
  values?: string[]
}

interface UpdateAttributeRequest {
  action: 'update'
  id: string
  name?: string
  display_order?: number
}

interface DeleteAttributeRequest {
  action: 'delete'
  id: string
}

interface AddAttributeValueRequest {
  action: 'add_value'
  attribute_id: string
  value: string
}

interface RemoveAttributeValueRequest {
  action: 'remove_value'
  value_id: string
}

type AttributeRequest =
  | ListAttributesRequest
  | CreateAttributeRequest
  | UpdateAttributeRequest
  | DeleteAttributeRequest
  | AddAttributeValueRequest
  | RemoveAttributeValueRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: AttributeRequest = await req.json()

    switch (body.action) {
      case 'list': {
        const { data, error } = await supabase
          .from('product_attributes')
          .select('*, product_attribute_values(*)')
          .eq('store_id', store_id)
          .order('display_order')
          .order('name')

        if (error) throw error

        // Sort values by display_order
        const attributes = (data || []).map((attr: {
          id: string
          name: string
          display_order: number
          product_attribute_values: { id: string; value: string; display_order: number }[]
        }) => ({
          ...attr,
          values: (attr.product_attribute_values || []).sort(
            (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
          ),
        }))

        return successResponse({ attributes })
      }

      case 'create': {
        const { name, values = [] } = body

        // Check for duplicate attribute name
        const { data: existing } = await supabase
          .from('product_attributes')
          .select('id')
          .eq('store_id', store_id)
          .eq('name', name)
          .single()

        if (existing) {
          return errorResponse('Thuộc tính đã tồn tại', 400)
        }

        // Create attribute
        const { data: attr, error } = await supabase
          .from('product_attributes')
          .insert({ store_id, name })
          .select()
          .single()

        if (error) throw error

        // Create values if provided
        if (values.length > 0) {
          const valuesToInsert = values.map((value: string, index: number) => ({
            attribute_id: attr.id,
            value,
            display_order: index,
          }))

          await supabase.from('product_attribute_values').insert(valuesToInsert)
        }

        // Re-fetch with values
        const { data: attributeWithValues } = await supabase
          .from('product_attributes')
          .select('*, product_attribute_values(*)')
          .eq('id', attr.id)
          .single()

        return successResponse({ attribute: attributeWithValues })
      }

      case 'update': {
        const { id, ...updates } = body
        delete (updates as { action?: string }).action

        const { data, error } = await supabase
          .from('product_attributes')
          .update(updates)
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ attribute: data })
      }

      case 'delete': {
        const { id } = body

        // Check if attribute is used by any variants
        const { count } = await supabase
          .from('product_variant_attributes')
          .select('*', { count: 'exact', head: true })
          .eq('attribute_id', id)

        if (count && count > 0) {
          return errorResponse('Không thể xóa thuộc tính đang được sử dụng', 400)
        }

        // Delete values first
        await supabase
          .from('product_attribute_values')
          .delete()
          .eq('attribute_id', id)

        // Delete attribute
        const { error } = await supabase
          .from('product_attributes')
          .delete()
          .eq('id', id)
          .eq('store_id', store_id)

        if (error) throw error

        return successResponse({ deleted: true })
      }

      case 'add_value': {
        const { attribute_id, value } = body

        // Verify attribute belongs to store
        const { data: attr } = await supabase
          .from('product_attributes')
          .select('id')
          .eq('id', attribute_id)
          .eq('store_id', store_id)
          .single()

        if (!attr) {
          return errorResponse('Thuộc tính không tồn tại', 404)
        }

        // Check for duplicate value
        const { data: existing } = await supabase
          .from('product_attribute_values')
          .select('id')
          .eq('attribute_id', attribute_id)
          .eq('value', value)
          .single()

        if (existing) {
          return errorResponse('Giá trị đã tồn tại', 400)
        }

        // Get max display_order
        const { data: maxOrder } = await supabase
          .from('product_attribute_values')
          .select('display_order')
          .eq('attribute_id', attribute_id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single()

        const newOrder = (maxOrder?.display_order ?? -1) + 1

        const { data, error } = await supabase
          .from('product_attribute_values')
          .insert({
            attribute_id,
            value,
            display_order: newOrder,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ value: data })
      }

      case 'remove_value': {
        const { value_id } = body

        // Check if value is used by any variants
        const { count } = await supabase
          .from('product_variant_attributes')
          .select('*', { count: 'exact', head: true })
          .eq('attribute_value_id', value_id)

        if (count && count > 0) {
          return errorResponse('Không thể xóa giá trị đang được sử dụng', 400)
        }

        const { error } = await supabase
          .from('product_attribute_values')
          .delete()
          .eq('id', value_id)

        if (error) throw error

        return successResponse({ deleted: true })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Attributes function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
