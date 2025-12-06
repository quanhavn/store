import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

// Tax settings interfaces
interface GetTaxSettingsRequest {
  action: 'get_settings'
}

interface UpdateTaxSettingsRequest {
  action: 'update_settings'
  business_type?: 'retail' | 'food_service' | 'other_service'
  default_vat_rate?: 8 | 10
  pit_rate?: 1 | 1.5 | 2
  e_invoice_required?: boolean
  e_invoice_provider?: string
  e_invoice_credentials?: Record<string, string>
}

interface DetectRevenueTierRequest {
  action: 'detect_revenue_tier'
}

interface CalculateQuarterlyTaxRequest {
  action: 'calculate_quarterly'
  quarter: number
  year: number
}

interface GetRevenueBookRequest {
  action: 'revenue_book'
  date_from: string
  date_to: string
}

interface GetTaxBookRequest {
  action: 'tax_book'
  year: number
}

type TaxRequest =
  | GetTaxSettingsRequest
  | UpdateTaxSettingsRequest
  | DetectRevenueTierRequest
  | CalculateQuarterlyTaxRequest
  | GetRevenueBookRequest
  | GetTaxBookRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: TaxRequest = await req.json()

    switch (body.action) {
      case 'get_settings': {
        const { data: store, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', store_id)
          .single()

        if (error) throw error

        return successResponse({
          settings: {
            business_type: store.business_type || 'retail',
            default_vat_rate: store.default_vat_rate || 8,
            pit_rate: store.pit_rate || 1.5,
            e_invoice_required: store.e_invoice_required || false,
            e_invoice_provider: store.e_invoice_provider,
          },
        })
      }

      case 'update_settings': {
        const {
          business_type,
          default_vat_rate,
          pit_rate,
          e_invoice_required,
          e_invoice_provider,
        } = body

        const updateData: Record<string, unknown> = {}
        if (business_type !== undefined) updateData.business_type = business_type
        if (default_vat_rate !== undefined) updateData.default_vat_rate = default_vat_rate
        if (pit_rate !== undefined) updateData.pit_rate = pit_rate
        if (e_invoice_required !== undefined) updateData.e_invoice_required = e_invoice_required
        if (e_invoice_provider !== undefined) updateData.e_invoice_provider = e_invoice_provider

        const { data, error } = await supabase
          .from('stores')
          .update(updateData)
          .eq('id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ store: data })
      }

      case 'detect_revenue_tier': {
        // Get last 12 months revenue
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const { data: sales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', oneYearAgo.toISOString())

        const annualRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0

        let tier: string
        let vatRate: number
        let pitRate: number
        let eInvoiceRequired: boolean

        if (annualRevenue < 200_000_000) {
          tier = 'under_200m'
          vatRate = 0
          pitRate = 0
          eInvoiceRequired = false
        } else if (annualRevenue < 1_000_000_000) {
          tier = '200m_1b'
          vatRate = 8
          pitRate = 1.5
          eInvoiceRequired = false
        } else if (annualRevenue < 3_000_000_000) {
          tier = '1b_3b'
          vatRate = 8
          pitRate = 1.5
          eInvoiceRequired = true
        } else {
          tier = 'over_3b'
          vatRate = 10
          pitRate = 2
          eInvoiceRequired = true
        }

        return successResponse({
          tier: {
            code: tier,
            annual_revenue: annualRevenue,
            recommended_vat_rate: vatRate,
            recommended_pit_rate: pitRate,
            e_invoice_required: eInvoiceRequired,
          },
        })
      }

      case 'calculate_quarterly': {
        const { quarter, year } = body

        // Calculate period dates
        const periodStart = new Date(year, (quarter - 1) * 3, 1)
        const periodEnd = new Date(year, quarter * 3, 0, 23, 59, 59)

        // Get store settings
        const { data: store } = await supabase
          .from('stores')
          .select('pit_rate')
          .eq('id', store_id)
          .single()

        // Get completed sales
        const { data: sales } = await supabase
          .from('sales')
          .select('subtotal, vat_amount, total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', periodStart.toISOString())
          .lte('completed_at', periodEnd.toISOString())

        const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0
        const totalSubtotal = sales?.reduce((sum, s) => sum + s.subtotal, 0) || 0
        const vatCollected = sales?.reduce((sum, s) => sum + s.vat_amount, 0) || 0

        // Get deductible expenses (with VAT)
        const { data: expenses } = await supabase
          .from('expenses')
          .select('vat_amount')
          .eq('store_id', store_id)
          .gte('expense_date', periodStart.toISOString().split('T')[0])
          .lte('expense_date', periodEnd.toISOString().split('T')[0])

        const vatDeductible = expenses?.reduce((sum, e) => sum + (e.vat_amount || 0), 0) || 0
        const vatPayable = Math.max(0, vatCollected - vatDeductible)

        // Calculate PIT
        const pitRate = store?.pit_rate || 1.5
        const pitPayable = Math.round(totalSubtotal * (pitRate / 100))

        // Get deadline
        const deadlineMonth = quarter === 4 ? 0 : quarter * 3
        const deadlineYear = quarter === 4 ? year + 1 : year
        const deadline = new Date(deadlineYear, deadlineMonth, 30)

        return successResponse({
          quarterly_tax: {
            period: `Q${quarter}/${year}`,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            deadline: deadline.toISOString(),
            total_revenue: totalRevenue,
            total_subtotal: totalSubtotal,
            vat_collected: vatCollected,
            vat_deductible: vatDeductible,
            vat_payable: vatPayable,
            pit_rate: pitRate,
            pit_payable: pitPayable,
            total_tax_payable: vatPayable + pitPayable,
          },
        })
      }

      case 'revenue_book': {
        const { date_from, date_to } = body

        // Get all completed sales in period
        const { data: sales, error } = await supabase
          .from('sales')
          .select(`
            id,
            invoice_no,
            customer_name,
            subtotal,
            vat_amount,
            total,
            completed_at,
            payments(method)
          `)
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', date_from)
          .lte('completed_at', date_to + 'T23:59:59')
          .order('completed_at', { ascending: true })

        if (error) throw error

        // Calculate summary
        const totalSubtotal = sales?.reduce((sum, s) => sum + s.subtotal, 0) || 0
        const totalVat = sales?.reduce((sum, s) => sum + s.vat_amount, 0) || 0
        const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0

        // Group by VAT rate (from sale items)
        const { data: items } = await supabase
          .from('sale_items')
          .select('vat_rate, vat_amount')
          .in('sale_id', sales?.map(s => s.id) || [])

        const vatByRate: Record<number, number> = {}
        items?.forEach(item => {
          const rate = item.vat_rate || 0
          vatByRate[rate] = (vatByRate[rate] || 0) + item.vat_amount
        })

        return successResponse({
          revenue_book: {
            period: { from: date_from, to: date_to },
            sales: sales?.map(s => ({
              ...s,
              payment_method: s.payments?.[0]?.method || 'cash',
            })),
            summary: {
              total_subtotal: totalSubtotal,
              total_vat: totalVat,
              total_revenue: totalRevenue,
              vat_by_rate: vatByRate,
              sale_count: sales?.length || 0,
            },
          },
        })
      }

      case 'tax_book': {
        const { year } = body
        const quarters = []

        for (let quarter = 1; quarter <= 4; quarter++) {
          const periodStart = new Date(year, (quarter - 1) * 3, 1)
          const periodEnd = new Date(year, quarter * 3, 0, 23, 59, 59)
          const now = new Date()

          // Check if quarter has started
          if (periodStart > now) {
            quarters.push({
              quarter,
              status: 'not_started',
              total_revenue: 0,
              vat_collected: 0,
              vat_deductible: 0,
              vat_payable: 0,
              pit_payable: 0,
              total_tax: 0,
            })
            continue
          }

          // Get sales data
          const { data: sales } = await supabase
            .from('sales')
            .select('subtotal, vat_amount, total')
            .eq('store_id', store_id)
            .eq('status', 'completed')
            .gte('completed_at', periodStart.toISOString())
            .lte('completed_at', periodEnd.toISOString())

          const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0
          const totalSubtotal = sales?.reduce((sum, s) => sum + s.subtotal, 0) || 0
          const vatCollected = sales?.reduce((sum, s) => sum + s.vat_amount, 0) || 0

          // Get expenses
          const { data: expenses } = await supabase
            .from('expenses')
            .select('vat_amount')
            .eq('store_id', store_id)
            .gte('expense_date', periodStart.toISOString().split('T')[0])
            .lte('expense_date', periodEnd.toISOString().split('T')[0])

          const vatDeductible = expenses?.reduce((sum, e) => sum + (e.vat_amount || 0), 0) || 0
          const vatPayable = Math.max(0, vatCollected - vatDeductible)

          // Get store PIT rate
          const { data: store } = await supabase
            .from('stores')
            .select('pit_rate')
            .eq('id', store_id)
            .single()

          const pitRate = store?.pit_rate || 1.5
          const pitPayable = Math.round(totalSubtotal * (pitRate / 100))

          // Determine status
          let status = 'pending'
          if (periodEnd < now) {
            status = 'completed'
          } else if (periodStart <= now && periodEnd >= now) {
            status = 'in_progress'
          }

          quarters.push({
            quarter,
            status,
            total_revenue: totalRevenue,
            vat_collected: vatCollected,
            vat_deductible: vatDeductible,
            vat_payable: vatPayable,
            pit_payable: pitPayable,
            total_tax: vatPayable + pitPayable,
          })
        }

        // Calculate totals
        const totalRevenue = quarters.reduce((sum, q) => sum + q.total_revenue, 0)
        const totalTax = quarters.reduce((sum, q) => sum + q.total_tax, 0)

        return successResponse({
          tax_book: {
            year,
            quarters,
            summary: {
              total_revenue: totalRevenue,
              total_tax: totalTax,
            },
          },
        })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Tax function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
