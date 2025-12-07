import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'
import {
  ViettelInvoiceClient,
  ViettelInvoiceRequest,
  ViettelInvoiceItem,
  ViettelTaxBreakdown,
  ViettelConfig,
  formatViettelDate,
} from '../_shared/viettel-client.ts'
import { numberToVietnameseWords } from '../_shared/number-to-words.ts'

interface CreateInvoiceRequest {
  action: 'create'
  sale_id: string
  buyer_name?: string
  buyer_tax_code?: string
  buyer_address?: string
  buyer_email?: string
  buyer_phone?: string
}

interface CreateDraftRequest {
  action: 'create_draft'
  sale_id: string
  buyer_name?: string
  buyer_tax_code?: string
  buyer_address?: string
  buyer_email?: string
  buyer_phone?: string
}

interface CancelInvoiceRequest {
  action: 'cancel'
  invoice_id: string
  reason: string
}

interface DownloadPdfRequest {
  action: 'download_pdf'
  invoice_id: string
}

interface DownloadXmlRequest {
  action: 'download_xml'
  invoice_id: string
}

interface ListInvoicesRequest {
  action: 'list'
  page?: number
  limit?: number
  status?: 'pending' | 'issued' | 'cancelled' | 'error'
  date_from?: string
  date_to?: string
}

interface GetInvoiceRequest {
  action: 'get'
  id: string
}

type InvoiceRequest =
  | CreateInvoiceRequest
  | CreateDraftRequest
  | CancelInvoiceRequest
  | DownloadPdfRequest
  | DownloadXmlRequest
  | ListInvoicesRequest
  | GetInvoiceRequest

interface SaleItem {
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  vat_amount: number
  total: number
  discount: number
  products?: { sku?: string; unit?: string }
}

interface Sale {
  id: string
  invoice_no: string
  subtotal: number
  vat_amount: number
  discount: number
  total: number
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
  completed_at: string
  sale_items: SaleItem[]
  payments: { method: string }[]
}

interface Store {
  id: string
  name: string
  tax_code: string
  address?: string
  phone?: string
  email?: string
  e_invoice_config?: Record<string, unknown>
}

function getPaymentMethodName(payments: { method: string }[]): string {
  const methods = new Set(payments.map(p => p.method))
  if (methods.has('cash') && methods.size === 1) return 'TM'
  if (!methods.has('cash')) return 'CK'
  return 'TM/CK'
}

function getViettelCredentialsFromStore(config: Record<string, unknown> | null | undefined): ViettelConfig | null {
  if (!config) return null
  const baseUrl = config.viettel_base_url as string
  const username = config.viettel_username as string
  const password = config.viettel_password as string
  const supplierTaxCode = config.viettel_supplier_tax_code as string
  const templateCode = config.viettel_template_code as string
  const invoiceSeries = config.viettel_invoice_series as string

  if (!baseUrl || !username || !password || !supplierTaxCode) {
    return null
  }

  return {
    baseUrl,
    username,
    password,
    supplierTaxCode,
    defaultTemplate: templateCode,
    defaultSerial: invoiceSeries,
  }
}

function buildInvoiceRequest(
  sale: Sale,
  store: Store,
  credentials: { templateCode: string; invoiceSeries: string },
  buyerOverrides?: {
    buyer_name?: string
    buyer_tax_code?: string
    buyer_address?: string
    buyer_email?: string
    buyer_phone?: string
  }
): ViettelInvoiceRequest {
  const items: ViettelInvoiceItem[] = sale.sale_items.map((item, index) => ({
    lineNumber: index + 1,
    selection: 1,
    itemCode: item.products?.sku || undefined,
    itemName: item.product_name,
    unitName: item.products?.unit || 'cái',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    taxPercentage: item.vat_rate,
    taxAmount: item.vat_amount,
    itemTotalAmountWithoutTax: item.total,
    itemTotalAmountWithTax: item.total + item.vat_amount,
  }))

  const vatGroups: Record<number, { taxableAmount: number; taxAmount: number }> = {}
  for (const item of sale.sale_items) {
    const rate = item.vat_rate || 0
    if (!vatGroups[rate]) {
      vatGroups[rate] = { taxableAmount: 0, taxAmount: 0 }
    }
    vatGroups[rate].taxableAmount += item.total
    vatGroups[rate].taxAmount += item.vat_amount
  }

  const taxBreakdowns: ViettelTaxBreakdown[] = Object.entries(vatGroups).map(([rate, values]) => ({
    taxPercentage: Number(rate),
    taxableAmount: values.taxableAmount,
    taxAmount: values.taxAmount,
  }))

  return {
    generalInvoiceInfo: {
      invoiceType: '1',
      templateCode: credentials.templateCode,
      invoiceSeries: credentials.invoiceSeries,
      currencyCode: 'VND',
      invoiceIssuedDate: formatViettelDate(new Date()),
      paymentMethodName: getPaymentMethodName(sale.payments),
    },
    buyerInfo: {
      buyerName: buyerOverrides?.buyer_name || sale.customer_name || 'Khách lẻ',
      buyerTaxCode: buyerOverrides?.buyer_tax_code || sale.customer_tax_code,
      buyerAddressLine: buyerOverrides?.buyer_address,
      buyerEmail: buyerOverrides?.buyer_email,
      buyerPhoneNumber: buyerOverrides?.buyer_phone || sale.customer_phone,
    },
    sellerInfo: {
      sellerLegalName: store.name,
      sellerTaxCode: store.tax_code,
      sellerAddressLine: store.address || '',
      sellerPhoneNumber: store.phone,
      sellerEmail: store.email,
    },
    itemInfo: items,
    summarizeInfo: {
      sumOfTotalLineAmountWithoutTax: sale.subtotal,
      totalAmountWithoutTax: sale.subtotal,
      totalTaxAmount: sale.vat_amount,
      totalAmountWithTax: sale.total,
      totalAmountWithTaxInWords: numberToVietnameseWords(sale.total),
      discountAmount: sale.discount || 0,
    },
    taxBreakdowns,
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: InvoiceRequest = await req.json()

    switch (body.action) {
      case 'create':
      case 'create_draft': {
        const { sale_id, buyer_name, buyer_tax_code, buyer_address, buyer_email, buyer_phone } = body

        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', store_id)
          .single()

        if (storeError) throw storeError

        if (!store.tax_code) {
          return errorResponse('Cửa hàng chưa cấu hình mã số thuế', 400)
        }

        const credentials = getViettelCredentialsFromStore(store.e_invoice_config as Record<string, unknown>)
        if (!credentials) {
          return errorResponse('Cửa hàng chưa cấu hình thông tin hóa đơn điện tử Viettel', 400)
        }

        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .select(`
            *,
            sale_items(*, products(sku, unit)),
            payments(method)
          `)
          .eq('id', sale_id)
          .eq('store_id', store_id)
          .single()

        if (saleError) throw saleError
        if (!sale) {
          return errorResponse('Không tìm thấy đơn hàng', 404)
        }

        const { data: existingInvoice } = await supabase
          .from('e_invoices')
          .select('id, status')
          .eq('sale_id', sale_id)
          .eq('status', 'issued')
          .single()

        if (existingInvoice) {
          return errorResponse('Đơn hàng đã có hóa đơn điện tử', 400)
        }

        const invoiceRequest = buildInvoiceRequest(sale as Sale, store as Store, credentials, {
          buyer_name,
          buyer_tax_code,
          buyer_address,
          buyer_email,
          buyer_phone,
        })

        const client = new ViettelInvoiceClient(credentials)

        try {
          const isDraft = body.action === 'create_draft'
          const viettelResponse = isDraft
            ? await client.createDraft(invoiceRequest)
            : await client.createInvoice(invoiceRequest)

          if (viettelResponse.errorCode !== '0') {
            const { data: errorInvoice } = await supabase
              .from('e_invoices')
              .insert({
                store_id,
                sale_id,
                provider: 'viettel',
                status: 'error',
                error_message: viettelResponse.description,
              })
              .select()
              .single()

            return errorResponse(`Lỗi từ Viettel: ${viettelResponse.description}`, 400)
          }

          const { data: invoice, error: invoiceError } = await supabase
            .from('e_invoices')
            .insert({
              store_id,
              sale_id,
              invoice_no: viettelResponse.result?.invoiceNo,
              invoice_symbol: credentials.invoiceSeries,
              issue_date: new Date().toISOString(),
              provider: 'viettel',
              provider_invoice_id: viettelResponse.result?.transactionUuid,
              lookup_code: viettelResponse.result?.reservationCode,
              status: isDraft ? 'pending' : 'issued',
            })
            .select()
            .single()

          if (invoiceError) throw invoiceError

          return successResponse({
            invoice,
            viettel_response: {
              invoice_no: viettelResponse.result?.invoiceNo,
              reservation_code: viettelResponse.result?.reservationCode,
            },
          })
        } catch (apiError) {
          await supabase.from('e_invoices').insert({
            store_id,
            sale_id,
            provider: 'viettel',
            status: 'error',
            error_message: apiError instanceof Error ? apiError.message : 'Lỗi kết nối Viettel API',
          })

          throw apiError
        }
      }

      case 'cancel': {
        const { invoice_id, reason } = body

        if (!reason || reason.trim().length < 5) {
          return errorResponse('Lý do hủy phải có ít nhất 5 ký tự', 400)
        }

        const { data: invoice, error: invoiceError } = await supabase
          .from('e_invoices')
          .select('*')
          .eq('id', invoice_id)
          .eq('store_id', store_id)
          .single()

        if (invoiceError) throw invoiceError
        if (!invoice) {
          return errorResponse('Không tìm thấy hóa đơn', 404)
        }

        if (invoice.status !== 'issued') {
          return errorResponse('Chỉ có thể hủy hóa đơn đã phát hành', 400)
        }

        const { data: store } = await supabase
          .from('stores')
          .select('e_invoice_config')
          .eq('id', store_id)
          .single()

        const credentials = getViettelCredentialsFromStore(store?.e_invoice_config as Record<string, unknown>)
        if (!credentials) {
          return errorResponse('Cửa hàng chưa cấu hình thông tin hóa đơn điện tử Viettel', 400)
        }

        const client = new ViettelInvoiceClient(credentials)

        try {
          const viettelResponse = await client.cancelInvoice(
            invoice.invoice_no, 
            invoice.invoice_symbol || credentials.defaultTemplate || '', 
            reason
          )

          if (viettelResponse.errorCode !== '0') {
            await supabase
              .from('e_invoices')
              .update({ error_message: viettelResponse.description })
              .eq('id', invoice_id)

            return errorResponse(`Lỗi từ Viettel: ${viettelResponse.description}`, 400)
          }

          const { data: updated, error: updateError } = await supabase
            .from('e_invoices')
            .update({ status: 'cancelled' })
            .eq('id', invoice_id)
            .select()
            .single()

          if (updateError) throw updateError

          return successResponse({ invoice: updated })
        } catch (apiError) {
          await supabase
            .from('e_invoices')
            .update({ error_message: apiError instanceof Error ? apiError.message : 'Lỗi kết nối Viettel API' })
            .eq('id', invoice_id)

          throw apiError
        }
      }

      case 'download_pdf': {
        const { invoice_id } = body

        const { data: invoice, error: invoiceError } = await supabase
          .from('e_invoices')
          .select('*')
          .eq('id', invoice_id)
          .eq('store_id', store_id)
          .single()

        if (invoiceError) throw invoiceError
        if (!invoice) {
          return errorResponse('Không tìm thấy hóa đơn', 404)
        }

        if (!invoice.provider_invoice_id) {
          return errorResponse('Hóa đơn chưa được đồng bộ với Viettel', 400)
        }

        const { data: store } = await supabase
          .from('stores')
          .select('e_invoice_config')
          .eq('id', store_id)
          .single()

        const credentials = getViettelCredentialsFromStore(store?.e_invoice_config as Record<string, unknown>)
        if (!credentials) {
          return errorResponse('Cửa hàng chưa cấu hình thông tin hóa đơn điện tử Viettel', 400)
        }

        const client = new ViettelInvoiceClient(credentials)
        
        try {
          const pdfBytes = await client.getInvoicePdf(
            invoice.invoice_no,
            invoice.invoice_symbol || credentials.defaultTemplate || ''
          )
          const base64Data = btoa(String.fromCharCode(...pdfBytes))

          return successResponse({
            file_name: `invoice_${invoice.invoice_no}.pdf`,
            file_data: base64Data,
            content_type: 'application/pdf',
          })
        } catch (err) {
          return errorResponse(`Lỗi từ Viettel: ${err instanceof Error ? err.message : 'Unknown error'}`, 400)
        }
      }

      case 'download_xml': {
        const { invoice_id } = body

        const { data: invoice, error: invoiceError } = await supabase
          .from('e_invoices')
          .select('*')
          .eq('id', invoice_id)
          .eq('store_id', store_id)
          .single()

        if (invoiceError) throw invoiceError
        if (!invoice) {
          return errorResponse('Không tìm thấy hóa đơn', 404)
        }

        if (invoice.xml_content) {
          return successResponse({
            file_name: `invoice_${invoice.invoice_no}.xml`,
            file_data: btoa(invoice.xml_content),
            content_type: 'application/xml',
          })
        }

        if (!invoice.provider_invoice_id) {
          return errorResponse('Hóa đơn chưa được đồng bộ với Viettel', 400)
        }

        const { data: store } = await supabase
          .from('stores')
          .select('e_invoice_config')
          .eq('id', store_id)
          .single()

        const credentials = getViettelCredentialsFromStore(store?.e_invoice_config as Record<string, unknown>)
        if (!credentials) {
          return errorResponse('Cửa hàng chưa cấu hình thông tin hóa đơn điện tử Viettel', 400)
        }

        const client = new ViettelInvoiceClient(credentials)
        
        try {
          const xmlContent = await client.getInvoiceXml(
            invoice.invoice_no,
            invoice.invoice_symbol || credentials.defaultTemplate || ''
          )

          await supabase
            .from('e_invoices')
            .update({ xml_content: xmlContent })
            .eq('id', invoice_id)

          return successResponse({
            file_name: `invoice_${invoice.invoice_no}.xml`,
            file_data: btoa(xmlContent),
            content_type: 'application/xml',
          })
        } catch (err) {
          return errorResponse(`Lỗi từ Viettel: ${err instanceof Error ? err.message : 'Unknown error'}`, 400)
        }
      }

      case 'list': {
        const { page = 1, limit = 20, status, date_from, date_to } = body

        let query = supabase
          .from('e_invoices')
          .select('*, sales(invoice_no, customer_name, total)', { count: 'exact' })
          .eq('store_id', store_id)
          .order('created_at', { ascending: false })

        if (status) {
          query = query.eq('status', status)
        }

        if (date_from) {
          query = query.gte('issue_date', date_from)
        }

        if (date_to) {
          query = query.lte('issue_date', date_to + 'T23:59:59')
        }

        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        return successResponse({
          invoices: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        })
      }

      case 'get': {
        const { id } = body

        const { data: invoice, error } = await supabase
          .from('e_invoices')
          .select(`
            *,
            sales(
              id,
              invoice_no,
              customer_name,
              customer_phone,
              customer_tax_code,
              subtotal,
              vat_amount,
              discount,
              total,
              completed_at,
              sale_items(product_name, quantity, unit_price, vat_rate, vat_amount, total)
            )
          `)
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (error) throw error

        return successResponse({ invoice })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Invoice function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
