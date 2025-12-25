import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface UpdateStoreData {
  name?: string
  phone?: string
  email?: string
  address?: string
  tax_code?: string
}

function validateVietnamesePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  const validPrefixes = ['03', '05', '07', '08', '09']
  return cleanPhone.length === 10 && validPrefixes.some((p) => cleanPhone.startsWith(p))
}

function validateTaxCode(taxCode: string): boolean {
  if (!taxCode) return true
  const cleanCode = taxCode.replace(/[^0-9]/g, '')
  return cleanCode.length === 10 || cleanCode.length === 13
}

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

    // Handle case where user record doesn't exist yet (new signup)
    if (userError) {
      if (userError.code === 'PGRST116') {
        return successResponse({ 
          user: null, 
          store: null, 
          user_stores: [],
          max_stores: 1,
          subscription: { plan_id: 'free', plan_name: 'Miễn phí', status: 'active' },
          needs_setup: true,
          needs_onboarding: true 
        })
      }
      throw userError
    }

    const store = userData.stores
    const needsOnboarding = !store || !store.onboarding_completed

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'get'

    if (action === 'get') {
      // Get all stores the user has access to
      const { data: memberships, error: membershipError } = await supabase
        .from('store_memberships')
        .select('store_id, role, is_default, stores(id, name)')
        .eq('user_id', user.id)

      if (membershipError) {
        console.error('Failed to fetch memberships:', membershipError)
      }

      const userStores = (memberships || [])
        .filter((m) => m.stores?.id)
        .map((m) => ({
          id: m.stores!.id,
          name: m.stores!.name,
          role: m.role,
          is_default: m.is_default,
        }))

      // Get subscription info
      const { data: maxStoresResult } = await supabase.rpc('get_user_max_stores')
      const maxStores = maxStoresResult ?? 1

      // Get subscription details
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status, expires_at, subscription_plans(name, max_stores, features)')
        .eq('user_id', user.id)
        .single()

      return successResponse({
        user: {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
        },
        store: store,
        user_stores: userStores,
        max_stores: maxStores,
        subscription: subscription ? {
          plan_id: subscription.plan_id,
          plan_name: subscription.subscription_plans?.name,
          status: subscription.status,
          expires_at: subscription.expires_at,
          features: subscription.subscription_plans?.features,
        } : { plan_id: 'free', plan_name: 'Miễn phí', status: 'active' },
        needs_setup: !userData.store_id,
        needs_onboarding: needsOnboarding,
      })
    }

    if (action === 'update') {
      if (!userData.store_id) {
        return errorResponse('No store found', 400)
      }

      const data: UpdateStoreData = body

      if (data.name !== undefined && !data.name.trim()) {
        return errorResponse('Store name cannot be empty', 400)
      }

      if (data.phone && !validateVietnamesePhone(data.phone)) {
        return errorResponse(
          'Invalid phone number. Must be 10 digits starting with 03, 05, 07, 08, or 09',
          400
        )
      }

      if (data.tax_code && !validateTaxCode(data.tax_code)) {
        return errorResponse('Invalid tax code. Must be 10 or 13 digits', 400)
      }

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return errorResponse('Invalid email format', 400)
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.name !== undefined) updateData.name = data.name.trim()
      if (data.phone !== undefined) updateData.phone = data.phone.replace(/\D/g, '') || null
      if (data.email !== undefined) updateData.email = data.email.trim() || null
      if (data.address !== undefined) updateData.address = data.address.trim() || null
      if (data.tax_code !== undefined) updateData.tax_code = data.tax_code.replace(/[^0-9]/g, '') || null

      const { data: updatedStore, error: updateError } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', userData.store_id)
        .select()
        .single()

      if (updateError) throw updateError

      return successResponse({ store: updatedStore })
    }

    if (action === 'create_store') {
      const { store_name, phone } = body

      if (!store_name || !store_name.trim()) {
        return errorResponse('Store name is required', 400)
      }

      // Call the create_user_store function
      const { data: result, error: createError } = await supabase
        .rpc('create_user_store', {
          p_store_name: store_name.trim(),
          p_phone: phone?.replace(/\D/g, '') || null,
        })

      if (createError) throw createError

      if (!result.success) {
        return errorResponse(result.error, 400)
      }

      return successResponse(result)
    }

    return errorResponse('Invalid action', 400)
  } catch (error) {
    console.error('get-user-store error:', error)
    
    // Return appropriate status code based on error type
    const message = error.message || 'Unknown error'
    
    if (message === 'Unauthorized' || message === 'Missing authorization header') {
      return errorResponse(message, 401)
    }
    
    // For other errors (database errors, etc.), return 500
    return errorResponse(message, 500)
  }
})
