import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  successResponse,
  errorResponse,
  handleCors,
  parseJsonBody,
  isValidUUID,
} from '../_shared/supabase.ts'

interface SwitchStoreRequest {
  store_id: string
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)

    const body = await parseJsonBody<SwitchStoreRequest>(req)

    if (!body.store_id) {
      return errorResponse('store_id is required', 400)
    }

    if (!isValidUUID(body.store_id)) {
      return errorResponse('Invalid store_id format', 400)
    }

    // Call the switch_user_store SQL function
    const { data, error } = await supabase.rpc('switch_user_store', {
      p_store_id: body.store_id,
    })

    if (error) {
      console.error('Switch store error:', error.message)
      return errorResponse('Failed to switch store', 500)
    }

    if (!data.success) {
      return errorResponse(data.error || 'Failed to switch store', 400)
    }

    // Get updated user and store data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, stores(*)')
      .eq('id', user.id)
      .single()

    if (userError) {
      return errorResponse('Failed to get updated user data', 500)
    }

    // Get all user's stores
    const { data: memberships } = await supabase
      .from('store_memberships')
      .select('store_id, role, is_default, stores(id, name)')
      .eq('user_id', user.id)

    const userStores = memberships?.map((m) => ({
      id: m.stores?.id,
      name: m.stores?.name,
      role: m.role,
      is_default: m.is_default,
    })) || []

    return successResponse({
      user: {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      },
      store: userData.stores,
      user_stores: userStores,
    })
  } catch (error) {
    console.error('Switch store error:', error.message)
    return errorResponse(error.message, 401)
  }
})
