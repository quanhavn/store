import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../../_shared/supabase.ts'
import { ViettelInvoiceClient } from '../../_shared/viettel-client.ts'

interface UpdateConfigRequest {
  action: 'update'
  e_invoice_required?: boolean
  viettel_username?: string
  viettel_password?: string
  viettel_supplier_tax_code?: string
  viettel_template_code?: string
  viettel_invoice_series?: string
}

interface TestConnectionRequest {
  action: 'test_connection'
  viettel_username?: string
  viettel_password?: string
  viettel_supplier_tax_code?: string
}

type ConfigRequest = UpdateConfigRequest | TestConnectionRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: ConfigRequest = await req.json()

    switch (body.action) {
      case 'update': {
        const {
          e_invoice_required,
          viettel_username,
          viettel_password,
          viettel_supplier_tax_code,
          viettel_template_code,
          viettel_invoice_series,
        } = body

        // Get current config
        const { data: store, error: getError } = await supabase
          .from('stores')
          .select('e_invoice_config')
          .eq('id', store_id)
          .single()

        if (getError) throw getError

        // Merge with existing config
        const currentConfig = (store?.e_invoice_config as Record<string, unknown>) || {}
        const newConfig: Record<string, unknown> = { ...currentConfig }

        // Always set provider to viettel
        newConfig.e_invoice_provider = 'viettel'

        if (e_invoice_required !== undefined) {
          newConfig.e_invoice_required = e_invoice_required
        }
        if (viettel_username !== undefined) {
          newConfig.viettel_username = viettel_username
        }
        if (viettel_password !== undefined) {
          newConfig.viettel_password = viettel_password
        }
        if (viettel_supplier_tax_code !== undefined) {
          newConfig.viettel_supplier_tax_code = viettel_supplier_tax_code
        }
        if (viettel_template_code !== undefined) {
          newConfig.viettel_template_code = viettel_template_code
        }
        if (viettel_invoice_series !== undefined) {
          newConfig.viettel_invoice_series = viettel_invoice_series
        }

        // Update store
        const { data: updated, error: updateError } = await supabase
          .from('stores')
          .update({ e_invoice_config: newConfig })
          .eq('id', store_id)
          .select()
          .single()

        if (updateError) throw updateError

        return successResponse({ store: updated })
      }

      case 'test_connection': {
        const {
          viettel_username,
          viettel_password,
          viettel_supplier_tax_code,
        } = body

        if (!viettel_username || !viettel_password || !viettel_supplier_tax_code) {
          return errorResponse('Missing required Viettel credentials', 400)
        }

        try {
          const client = new ViettelInvoiceClient({
            baseUrl: 'https://api-vinvoice.viettel.vn/services/einvoiceapplication/api',
            username: viettel_username,
            password: viettel_password,
            supplierTaxCode: viettel_supplier_tax_code,
          })

          // Test authentication
          await client.authenticate()

          return successResponse({
            success: true,
            message: 'Kết nối thành công với Viettel API',
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return errorResponse(`Kết nối thất bại: ${message}`, 400)
        }
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
