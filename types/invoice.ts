export interface Invoice {
  id: string
  store_id: string
  sale_id: string | null
  invoice_no: string | null
  invoice_symbol: string | null
  issue_date: string | null
  lookup_code: string | null
  provider_invoice_id: string | null
  status: 'pending' | 'issued' | 'cancelled' | 'error'
  provider: 'viettel'
  buyer_name: string | null
  buyer_tax_code: string | null
  buyer_address: string | null
  total_amount: number | null
  vat_amount: number | null
  error_message: string | null
  created_at: string
}

export interface BuyerInfo {
  buyerName: string
  buyerTaxCode?: string
  buyerAddressLine: string
  buyerEmail?: string
  buyerPhoneNumber?: string
}

export interface CreateInvoiceRequest {
  sale_id: string
  buyer_info: BuyerInfo
}

export interface InvoiceSyncQueueItem {
  id: string
  store_id: string
  sale_id: string
  action: 'create' | 'cancel'
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  last_error: string | null
  created_at: string
}
