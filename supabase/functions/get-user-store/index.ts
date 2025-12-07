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

    if (userError) {
      if (userError.code === 'PGRST116') {
        return successResponse({ user: null, store: null, needs_setup: true })
      }
      throw userError
    }

    const store = userData.stores
    const needsOnboarding = !store || !store.onboarding_completed

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'get'

    if (action === 'get') {
      return successResponse({
        user: {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
        },
        store: store,
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

    return errorResponse('Invalid action', 400)
  } catch (error) {
    return errorResponse(error.message, 401)
  }
})
