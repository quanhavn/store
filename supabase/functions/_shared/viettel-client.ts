/**
 * Viettel E-Invoice (SINVOICE) API Client
 *
 * Handles authentication, token management, and API calls to Viettel's
 * e-invoice service for Vietnam Tax 2026 compliance.
 *
 * API Version: 2.35
 * Documentation: https://sinvoice.viettel.vn/
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ViettelConfig {
  baseUrl: string
  username: string
  password: string
  supplierTaxCode: string
  defaultTemplate?: string
  defaultSerial?: string
}

export interface ViettelAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface ViettelInvoiceItem {
  lineNumber: number
  itemCode?: string
  itemName: string
  unitName: string
  quantity: number
  unitPrice: number
  itemTotalAmountWithoutTax: number
  taxPercentage: number
  taxAmount: number
  itemTotalAmountWithTax: number
  discount?: number
  discountAmount?: number
  isIncreaseItem?: boolean
}

export interface ViettelTaxBreakdown {
  taxPercentage: number
  taxableAmount: number
  taxAmount: number
}

export interface ViettelGeneralInvoiceInfo {
  invoiceType: string
  templateCode: string
  invoiceSeries: string
  currencyCode: string
  invoiceIssuedDate: string
  paymentMethodName: string
  adjustmentType?: string
  originalInvoiceId?: string
  originalInvoiceIssueDate?: string
  additionalReferenceDesc?: string
  additionalReferenceDate?: string
  paymentStatus?: boolean
  cusGetInvoiceRight?: boolean
}

export interface ViettelBuyerInfo {
  buyerName: string
  buyerLegalName?: string
  buyerTaxCode?: string
  buyerAddressLine: string
  buyerEmail?: string
  buyerPhoneNumber?: string
  buyerBankName?: string
  buyerBankAccount?: string
  buyerIdNo?: string
  buyerIdType?: string
}

export interface ViettelSellerInfo {
  sellerLegalName: string
  sellerTaxCode: string
  sellerAddressLine: string
  sellerPhoneNumber: string
  sellerEmail: string
  sellerBankName?: string
  sellerBankAccount?: string
  sellerContactPersonName?: string
  sellerSignedPersonName?: string
}

export interface ViettelSummarizeInfo {
  sumOfTotalLineAmountWithoutTax: number
  totalAmountWithoutTax: number
  totalTaxAmount: number
  totalAmountWithTax: number
  totalAmountWithTaxInWords: string
  discountAmount?: number
  itemDiscount?: number
  taxPercentage?: number
  isTotalAmtWithoutTaxPos?: boolean
  isTotalTaxAmountPos?: boolean
  isTotalAmtWithTaxPos?: boolean
}

export interface ViettelInvoiceRequest {
  generalInvoiceInfo: ViettelGeneralInvoiceInfo
  buyerInfo: ViettelBuyerInfo
  sellerInfo: ViettelSellerInfo
  itemInfo: ViettelInvoiceItem[]
  summarizeInfo: ViettelSummarizeInfo
  taxBreakdowns: ViettelTaxBreakdown[]
  metadata?: ViettelMetadata[]
}

export interface ViettelMetadata {
  keyTag: string
  valueType: string
  keyValue: string
  keyLabel?: string
}

export interface ViettelInvoiceResponse {
  errorCode: string
  description: string
  result?: ViettelInvoiceResult
}

export interface ViettelInvoiceResult {
  invoiceNo: string
  transactionUuid: string
  reservationCode: string
  supplierTaxCode: string
  invoiceType: string
  templateCode: string
  invoiceSeries: string
  paymentStatus: boolean
  fileNamePdf?: string
  fileNameXml?: string
}

export interface ViettelResponse {
  errorCode: string
  description: string
  result?: unknown
}

export interface ViettelSearchParams {
  startDate?: string
  endDate?: string
  invoiceNo?: string
  buyerTaxCode?: string
  invoiceStatus?: string[]
  pageIndex?: number
  pageSize?: number
}

export interface ViettelInvoice {
  invoiceId: string
  invoiceNo: string
  invoiceType: string
  templateCode: string
  invoiceSeries: string
  invoiceIssuedDate: string
  buyerName: string
  buyerTaxCode?: string
  totalAmountWithTax: number
  invoiceStatus: string
  paymentStatus: boolean
}

export interface ViettelSearchResponse {
  errorCode: string
  description: string
  result?: {
    invoices: ViettelInvoice[]
    total: number
    pageIndex: number
    pageSize: number
  }
}

// ============================================================================
// Token Cache
// ============================================================================

interface CachedToken {
  accessToken: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()

// ============================================================================
// Viettel Invoice Client
// ============================================================================

export class ViettelInvoiceClient {
  private config: ViettelConfig
  private cacheKey: string

  constructor(config: ViettelConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl,
    }
    this.cacheKey = `${config.username}:${config.supplierTaxCode}`
  }

  /**
   * Creates a client from environment variables.
   */
  static fromEnv(): ViettelInvoiceClient {
    const baseUrl = Deno.env.get('VIETTEL_INVOICE_BASE_URL')
    const username = Deno.env.get('VIETTEL_INVOICE_USERNAME')
    const password = Deno.env.get('VIETTEL_INVOICE_PASSWORD')
    const supplierTaxCode = Deno.env.get('VIETTEL_SUPPLIER_TAX_CODE')
    const defaultTemplate = Deno.env.get('VIETTEL_INVOICE_TEMPLATE')
    const defaultSerial = Deno.env.get('VIETTEL_INVOICE_SERIAL')

    if (!baseUrl || !username || !password || !supplierTaxCode) {
      throw new Error('Missing required Viettel environment variables')
    }

    return new ViettelInvoiceClient({
      baseUrl,
      username,
      password,
      supplierTaxCode,
      defaultTemplate,
      defaultSerial,
    })
  }

  /**
   * Authenticates with Viettel API and returns access token.
   * Uses cached token if still valid.
   */
  private async getAccessToken(): Promise<string> {
    const cached = tokenCache.get(this.cacheKey)
    const now = Date.now()

    if (cached && cached.expiresAt > now + 60000) {
      return cached.accessToken
    }

    const response = await fetch(
      `${this.config.baseUrl}/InvoiceAuthentication/api/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Viettel auth error:', error)
      throw new Error(`Viettel authentication failed: ${response.status}`)
    }

    const data: ViettelAuthResponse = await response.json()

    tokenCache.set(this.cacheKey, {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    })

    return data.access_token
  }

  /**
   * Makes an authenticated API request.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken()

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.config.baseUrl}/${endpoint.replace(/^\//, '')}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Viettel API error [${endpoint}]:`, error)
      throw new Error(`Viettel API request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Creates and issues an e-invoice.
   *
   * @param invoice - Invoice data
   * @returns Invoice creation response with invoice number
   */
  async createInvoice(
    invoice: ViettelInvoiceRequest
  ): Promise<ViettelInvoiceResponse> {
    const payload = this.prepareInvoicePayload(invoice)

    const result = await this.request<ViettelInvoiceResponse>(
      `InvoiceAPI/InvoiceUtilsWS/createInvoice/${this.config.supplierTaxCode}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Invoice creation failed: ${result.description}`)
    }

    return result
  }

  /**
   * Creates a draft invoice (not yet issued).
   *
   * @param invoice - Invoice data
   * @returns Draft invoice response
   */
  async createDraft(
    invoice: ViettelInvoiceRequest
  ): Promise<ViettelInvoiceResponse> {
    const payload = this.prepareInvoicePayload(invoice)

    const result = await this.request<ViettelInvoiceResponse>(
      `InvoiceAPI/InvoiceUtilsWS/createDraftInvoice/${this.config.supplierTaxCode}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Draft creation failed: ${result.description}`)
    }

    return result
  }

  /**
   * Gets invoice PDF file.
   *
   * @param invoiceNo - Invoice number
   * @param templateCode - Invoice template code
   * @returns PDF file as Uint8Array
   */
  async getInvoicePdf(
    invoiceNo: string,
    templateCode: string
  ): Promise<Uint8Array> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${this.config.baseUrl}/InvoiceAPI/InvoiceUtilsWS/getInvoicePdf?` +
        new URLSearchParams({
          supplierTaxCode: this.config.supplierTaxCode,
          invoiceNo,
          templateCode,
        }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get invoice PDF: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Gets invoice XML file.
   *
   * @param invoiceNo - Invoice number
   * @param templateCode - Invoice template code
   * @returns XML content as string
   */
  async getInvoiceXml(invoiceNo: string, templateCode: string): Promise<string> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${this.config.baseUrl}/InvoiceAPI/InvoiceUtilsWS/getInvoiceXml?` +
        new URLSearchParams({
          supplierTaxCode: this.config.supplierTaxCode,
          invoiceNo,
          templateCode,
        }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get invoice XML: ${response.status}`)
    }

    return response.text()
  }

  /**
   * Cancels an issued invoice.
   *
   * @param invoiceNo - Invoice number to cancel
   * @param templateCode - Invoice template code
   * @param reason - Reason for cancellation
   * @returns Cancellation response
   */
  async cancelInvoice(
    invoiceNo: string,
    templateCode: string,
    reason: string
  ): Promise<ViettelResponse> {
    const result = await this.request<ViettelResponse>(
      `InvoiceAPI/InvoiceUtilsWS/cancelInvoice`,
      {
        method: 'POST',
        body: JSON.stringify({
          supplierTaxCode: this.config.supplierTaxCode,
          invoiceNo,
          templateCode,
          strIssueDate: new Date().toLocaleDateString('vi-VN'),
          additionalReferenceDesc: reason,
        }),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Invoice cancellation failed: ${result.description}`)
    }

    return result
  }

  /**
   * Searches for invoices.
   *
   * @param params - Search parameters
   * @returns List of matching invoices
   */
  async searchInvoices(params: ViettelSearchParams): Promise<ViettelInvoice[]> {
    const searchPayload = {
      supplierTaxCode: this.config.supplierTaxCode,
      startDate: params.startDate,
      endDate: params.endDate,
      invoiceNo: params.invoiceNo,
      buyerTaxCode: params.buyerTaxCode,
      invoiceStatus: params.invoiceStatus,
      pageIndex: params.pageIndex ?? 0,
      pageSize: params.pageSize ?? 20,
    }

    const result = await this.request<ViettelSearchResponse>(
      `InvoiceAPI/InvoiceUtilsWS/searchInvoice`,
      {
        method: 'POST',
        body: JSON.stringify(searchPayload),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Invoice search failed: ${result.description}`)
    }

    return result.result?.invoices ?? []
  }

  /**
   * Creates an adjustment invoice.
   *
   * @param originalInvoiceNo - Original invoice number to adjust
   * @param originalTemplateCode - Original invoice template code
   * @param adjustmentType - "1" for info adjustment, "2" for amount adjustment
   * @param invoice - Adjustment invoice data
   * @returns Adjustment invoice response
   */
  async createAdjustmentInvoice(
    originalInvoiceNo: string,
    originalTemplateCode: string,
    adjustmentType: '1' | '2',
    invoice: ViettelInvoiceRequest
  ): Promise<ViettelInvoiceResponse> {
    const payload = this.prepareInvoicePayload({
      ...invoice,
      generalInvoiceInfo: {
        ...invoice.generalInvoiceInfo,
        adjustmentType,
        originalInvoiceId: originalInvoiceNo,
      },
    })

    const result = await this.request<ViettelInvoiceResponse>(
      `InvoiceAPI/InvoiceUtilsWS/createExchangeInvoice/${this.config.supplierTaxCode}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Adjustment invoice creation failed: ${result.description}`)
    }

    return result
  }

  /**
   * Creates a replacement invoice.
   *
   * @param originalInvoiceNo - Original invoice number to replace
   * @param originalTemplateCode - Original invoice template code
   * @param invoice - Replacement invoice data
   * @returns Replacement invoice response
   */
  async createReplacementInvoice(
    originalInvoiceNo: string,
    originalTemplateCode: string,
    invoice: ViettelInvoiceRequest
  ): Promise<ViettelInvoiceResponse> {
    const payload = this.prepareInvoicePayload({
      ...invoice,
      generalInvoiceInfo: {
        ...invoice.generalInvoiceInfo,
        originalInvoiceId: originalInvoiceNo,
      },
    })

    const result = await this.request<ViettelInvoiceResponse>(
      `InvoiceAPI/InvoiceUtilsWS/createReplaceInvoice/${this.config.supplierTaxCode}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Replacement invoice creation failed: ${result.description}`)
    }

    return result
  }

  /**
   * Gets invoice details by invoice number.
   *
   * @param invoiceNo - Invoice number
   * @param templateCode - Invoice template code
   * @returns Invoice details
   */
  async getInvoiceDetails(
    invoiceNo: string,
    templateCode: string
  ): Promise<ViettelInvoice> {
    const result = await this.request<ViettelResponse>(
      `InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile?` +
        new URLSearchParams({
          supplierTaxCode: this.config.supplierTaxCode,
          invoiceNo,
          templateCode,
          fileType: 'JSON',
        }),
      {
        method: 'GET',
      }
    )

    if (result.errorCode !== '0' && result.errorCode !== '00') {
      throw new Error(`Get invoice details failed: ${result.description}`)
    }

    return result.result as ViettelInvoice
  }

  /**
   * Prepares invoice payload with defaults.
   */
  private prepareInvoicePayload(invoice: ViettelInvoiceRequest): ViettelInvoiceRequest {
    return {
      ...invoice,
      generalInvoiceInfo: {
        ...invoice.generalInvoiceInfo,
        templateCode:
          invoice.generalInvoiceInfo.templateCode ??
          this.config.defaultTemplate ??
          '',
        invoiceSeries:
          invoice.generalInvoiceInfo.invoiceSeries ??
          this.config.defaultSerial ??
          '',
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date for Viettel API (dd/MM/yyyy format).
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatViettelDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Maps payment method to Viettel format.
 *
 * @param method - Internal payment method
 * @returns Viettel payment method code
 */
export function mapPaymentMethod(
  method: 'cash' | 'bank_transfer' | 'mixed'
): string {
  switch (method) {
    case 'cash':
      return 'TM'
    case 'bank_transfer':
      return 'CK'
    case 'mixed':
      return 'TM/CK'
    default:
      return 'TM'
  }
}

/**
 * Maps VAT rate percentage to Viettel tax code.
 *
 * @param vatRate - VAT rate (0, 5, 8, 10)
 * @returns Viettel tax percentage
 */
export function mapVatRate(vatRate: number): number {
  return vatRate
}
