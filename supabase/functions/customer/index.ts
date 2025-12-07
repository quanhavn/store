import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
  isOwnerOrManager,
} from '../_shared/supabase.ts'

// ============================================================================
// Request Interfaces
// ============================================================================

interface ListCustomersRequest {
  action: 'list'
  search?: string
  has_debt?: boolean
  page?: number
  limit?: number
}

interface GetCustomerRequest {
  action: 'get'
  id: string
}

interface CreateCustomerRequest {
  action: 'create'
  name: string
  phone: string
  address?: string
  tax_code?: string
  notes?: string
}

interface UpdateCustomerRequest {
  action: 'update'
  id: string
  name?: string
  phone?: string
  address?: string
  tax_code?: string
  notes?: string
}

interface SearchCustomerRequest {
  action: 'search'
  query: string
}

type CustomerRequest =
  | ListCustomersRequest
  | GetCustomerRequest
  | CreateCustomerRequest
  | UpdateCustomerRequest
  | SearchCustomerRequest

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id, role } = await getUserStore(supabase, user.id)

    const body: CustomerRequest = await req.json()

    switch (body.action) {
      // ======================================================================
      // LIST - Paginated list with search and debt filter
      // ======================================================================
      case 'list': {
        const { search, has_debt, page = 1, limit = 20 } = body
        const offset = (page - 1) * limit

        // Build the query
        let query = supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .eq('store_id', store_id)
          .order('name')

        // Apply search filter (name or phone, case-insensitive)
        if (search) {
          const searchLower = search.toLowerCase()
          query = query.or(`name.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`)
        }

        // Apply debt filter
        if (has_debt === true) {
          query = query.gt('total_debt', 0)
        } else if (has_debt === false) {
          query = query.eq('total_debt', 0)
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          customers: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      // ======================================================================
      // GET - Single customer with debt summary
      // ======================================================================
      case 'get': {
        const { id } = body

        if (!id) {
          return errorResponse('Customer ID is required', 400)
        }

        // Get customer info
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (customerError) {
          if (customerError.code === 'PGRST116') {
            return errorResponse('Customer not found', 404)
          }
          throw customerError
        }

        // Get debt counts
        const { data: debtCounts, error: debtError } = await supabase
          .from('customer_debts')
          .select('status')
          .eq('customer_id', id)
          .eq('store_id', store_id)
          .in('status', ['active', 'overdue'])

        if (debtError) throw debtError

        const activeDebts = debtCounts?.filter(d => d.status === 'active').length || 0
        const overdueDebts = debtCounts?.filter(d => d.status === 'overdue').length || 0

        return successResponse({
          customer: {
            ...customer,
            active_debts: activeDebts,
            overdue_debts: overdueDebts,
          },
        })
      }

      // ======================================================================
      // CREATE - Create new customer
      // ======================================================================
      case 'create': {
        const { name, phone, address, tax_code, notes } = body

        // Validate required fields
        if (!name || !name.trim()) {
          return errorResponse('Customer name is required', 400)
        }

        if (!phone || !phone.trim()) {
          return errorResponse('Customer phone is required', 400)
        }

        // Validate phone format (Vietnam phone number)
        if (!/^0\d{9}$/.test(phone)) {
          return errorResponse('Invalid phone number format. Must be 10 digits starting with 0', 400)
        }

        // Check phone uniqueness within the store
        const { data: existingCustomer, error: checkError } = await supabase
          .from('customers')
          .select('id')
          .eq('store_id', store_id)
          .eq('phone', phone)
          .maybeSingle()

        if (checkError) throw checkError

        if (existingCustomer) {
          return errorResponse('A customer with this phone number already exists', 400)
        }

        // Create customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            store_id,
            name: name.trim(),
            phone: phone.trim(),
            address: address?.trim() || null,
            tax_code: tax_code?.trim() || null,
            notes: notes?.trim() || null,
            total_debt: 0,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ customer: data })
      }

      // ======================================================================
      // UPDATE - Update customer info (manager only)
      // ======================================================================
      case 'update': {
        const { id, name, phone, address, tax_code, notes } = body

        if (!id) {
          return errorResponse('Customer ID is required', 400)
        }

        // Check if user is manager or owner
        if (!isOwnerOrManager(role)) {
          return errorResponse('Only managers can update customer information', 403)
        }

        // Verify customer exists and belongs to this store
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('id, phone')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            return errorResponse('Customer not found', 404)
          }
          throw fetchError
        }

        // Build update data
        const updateData: Record<string, unknown> = {}

        if (name !== undefined) {
          if (!name.trim()) {
            return errorResponse('Customer name cannot be empty', 400)
          }
          updateData.name = name.trim()
        }

        if (phone !== undefined) {
          if (!phone.trim()) {
            return errorResponse('Customer phone cannot be empty', 400)
          }

          // Validate phone format
          if (!/^0\d{9}$/.test(phone)) {
            return errorResponse('Invalid phone number format. Must be 10 digits starting with 0', 400)
          }

          // Check phone uniqueness if changed
          if (phone !== existingCustomer.phone) {
            const { data: duplicateCheck, error: duplicateError } = await supabase
              .from('customers')
              .select('id')
              .eq('store_id', store_id)
              .eq('phone', phone)
              .neq('id', id)
              .maybeSingle()

            if (duplicateError) throw duplicateError

            if (duplicateCheck) {
              return errorResponse('A customer with this phone number already exists', 400)
            }
          }

          updateData.phone = phone.trim()
        }

        if (address !== undefined) {
          updateData.address = address?.trim() || null
        }

        if (tax_code !== undefined) {
          updateData.tax_code = tax_code?.trim() || null
        }

        if (notes !== undefined) {
          updateData.notes = notes?.trim() || null
        }

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
          return errorResponse('No fields to update', 400)
        }

        // Update customer
        const { data, error } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ customer: data })
      }

      // ======================================================================
      // SEARCH - Quick search for POS (returns top 5 matches)
      // ======================================================================
      case 'search': {
        const { query } = body

        if (!query || !query.trim()) {
          return errorResponse('Search query is required', 400)
        }

        const searchTerm = query.trim().toLowerCase()

        // Search by phone (exact prefix match) or name (contains match)
        // Phone matches are prioritized for POS lookup
        const { data: phoneMatches, error: phoneError } = await supabase
          .from('customers')
          .select('id, name, phone, address, total_debt')
          .eq('store_id', store_id)
          .ilike('phone', `${searchTerm}%`)
          .order('name')
          .limit(5)

        if (phoneError) throw phoneError

        // If we have enough phone matches, return them
        if (phoneMatches && phoneMatches.length >= 5) {
          return successResponse({ customers: phoneMatches })
        }

        // Otherwise, also search by name
        const { data: nameMatches, error: nameError } = await supabase
          .from('customers')
          .select('id, name, phone, address, total_debt')
          .eq('store_id', store_id)
          .ilike('name', `%${searchTerm}%`)
          .order('name')
          .limit(5)

        if (nameError) throw nameError

        // Merge results, prioritizing phone matches and removing duplicates
        const phoneIds = new Set(phoneMatches?.map(c => c.id) || [])
        const mergedResults = [
          ...(phoneMatches || []),
          ...(nameMatches || []).filter(c => !phoneIds.has(c.id)),
        ].slice(0, 5)

        return successResponse({ customers: mergedResults })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Customer function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
