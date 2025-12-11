import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

interface OnboardingData {
  store_name: string
  address?: string
  phone: string
  email?: string
  tax_code?: string
  revenue_tier?: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
  e_invoice_required?: boolean
}

// Validate Vietnamese phone number
function validateVietnamesePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  // Must be 10 digits and start with valid prefixes
  const validPrefixes = ['03', '05', '07', '08', '09']
  return cleanPhone.length === 10 && validPrefixes.some((p) => cleanPhone.startsWith(p))
}

// Validate Vietnamese tax code (MST)
// - Individual: 10 digits (legacy) or 12 digits (CCCD-based, per Circular 86/2024/TT-BTC)
// - Business: 13 digits (10 digits + 3-digit branch code)
function validateTaxCode(taxCode: string): boolean {
  if (!taxCode) return true // Optional field
  const cleanCode = taxCode.replace(/[^0-9]/g, '')
  return cleanCode.length === 10 || cleanCode.length === 12 || cleanCode.length === 13
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)

    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const data: OnboardingData = await req.json()

    // Validate required fields
    if (!data.store_name || !data.store_name.trim()) {
      return errorResponse('Store name is required', 400)
    }

    if (!data.phone) {
      return errorResponse('Phone number is required', 400)
    }

    // Validate phone format
    if (!validateVietnamesePhone(data.phone)) {
      return errorResponse(
        'Invalid phone number. Must be 10 digits starting with 03, 05, 07, 08, or 09',
        400
      )
    }

    // Validate tax code if provided
    if (data.tax_code && !validateTaxCode(data.tax_code)) {
      return errorResponse('Invalid tax code. Must be 10, 12, or 13 digits', 400)
    }

    // Validate email format if provided
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return errorResponse('Invalid email format', 400)
    }

    // Call the database function to complete onboarding
    const { data: result, error } = await supabase.rpc('complete_store_onboarding', {
      p_store_name: data.store_name.trim(),
      p_address: data.address?.trim() || null,
      p_phone: data.phone.replace(/\D/g, ''),
      p_email: data.email?.trim() || null,
      p_tax_code: data.tax_code?.replace(/[^0-9]/g, '') || null,
      p_revenue_tier: data.revenue_tier || 'under_200m',
      p_e_invoice_required: data.e_invoice_required || false,
    })

    if (error) {
      throw error
    }

    return successResponse(result)
  } catch (error) {
    console.error('Onboarding error:', error)
    return errorResponse(error.message || 'Failed to complete onboarding', 500)
  }
})
