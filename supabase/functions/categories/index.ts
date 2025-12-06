import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface ListCategoriesRequest {
  action: 'list'
  parent_id?: string | null
  flat?: boolean
}

interface CreateCategoryRequest {
  action: 'create'
  name: string
  parent_id?: string
  sort_order?: number
}

interface UpdateCategoryRequest {
  action: 'update'
  id: string
  name?: string
  parent_id?: string | null
  sort_order?: number
}

interface DeleteCategoryRequest {
  action: 'delete'
  id: string
}

type CategoryRequest =
  | ListCategoriesRequest
  | CreateCategoryRequest
  | UpdateCategoryRequest
  | DeleteCategoryRequest

interface Category {
  id: string
  store_id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  children?: Category[]
}

// Build tree structure from flat list
function buildCategoryTree(categories: Category[], parentId: string | null = null): Category[] {
  return categories
    .filter((cat) => cat.parent_id === parentId)
    .map((cat) => ({
      ...cat,
      children: buildCategoryTree(categories, cat.id),
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: CategoryRequest = await req.json()

    switch (body.action) {
      case 'list': {
        const { flat = false } = body

        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', store_id)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })

        if (error) throw error

        const categories = data || []

        if (flat) {
          return successResponse({ categories })
        }

        // Return tree structure
        const tree = buildCategoryTree(categories)
        return successResponse({ categories: tree, flat_categories: categories })
      }

      case 'create': {
        const { name, parent_id, sort_order = 0 } = body

        // Check for duplicate name in same parent
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('store_id', store_id)
          .eq('name', name)
          .eq('parent_id', parent_id || null)
          .single()

        if (existing) {
          return errorResponse('Danh mục đã tồn tại', 400)
        }

        const { data, error } = await supabase
          .from('categories')
          .insert({
            store_id,
            name,
            parent_id: parent_id || null,
            sort_order,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ category: data })
      }

      case 'update': {
        const { id, ...updates } = body
        delete (updates as { action?: string }).action

        const { data, error } = await supabase
          .from('categories')
          .update(updates)
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ category: data })
      }

      case 'delete': {
        const { id } = body

        // Check if category has products
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', id)
          .eq('active', true)

        if (count && count > 0) {
          return errorResponse(`Không thể xóa danh mục đang có ${count} sản phẩm`, 400)
        }

        // Check if category has children
        const { count: childCount } = await supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', id)

        if (childCount && childCount > 0) {
          return errorResponse('Không thể xóa danh mục đang có danh mục con', 400)
        }

        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id)
          .eq('store_id', store_id)

        if (error) throw error

        return successResponse({ deleted: true })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Categories function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
