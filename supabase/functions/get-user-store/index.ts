import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, stores(*)')
      .eq('id', user.id)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return successResponse({ user: null, store: null, needs_setup: true })
      }
      throw userError
    }

    return successResponse({
      user: {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      },
      store: userData.stores,
      needs_setup: !userData.store_id,
    })
  } catch (error) {
    return errorResponse(error.message, 401)
  }
})
