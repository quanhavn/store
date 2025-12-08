'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import { PAPER_WIDTH, type PaperWidth } from '@/lib/receipt/thermal-commands'

// Types
type Store = Database['public']['Tables']['stores']['Row']
type SaleItem = Database['public']['Tables']['sale_items']['Row']
type Payment = Database['public']['Tables']['payments']['Row']

export interface ReceiptProps {
  store: Store
  sale: {
    id: string
    invoice_no: string | null
    subtotal: number | null
    vat_amount: number | null
    discount: number | null
    total: number | null
    completed_at: string | null
    customer_name?: string | null
    customer_phone?: string | null
    customer_tax_code?: string | null
    note?: string | null
  }
  items: SaleItem[]
  payments: Payment[]
  cashier?: string
  paperWidth?: PaperWidth
  showQrCode?: boolean
  qrCodeUrl?: string
}

// Helper functions
function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'd'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN')
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// Group items by VAT rate for breakdown
function groupByVatRate(items: SaleItem[]): Array<{ rate: number; amount: number }> {
  const vatGroups: Record<number, number> = {}

  items.forEach((item) => {
    const rate = item.vat_rate || 0
    const amount = item.vat_amount || 0
    vatGroups[rate] = (vatGroups[rate] || 0) + amount
  })

  return Object.entries(vatGroups)
    .map(([rate, amount]) => ({ rate: Number(rate), amount }))
    .filter((v) => v.amount > 0)
    .sort((a, b) => a.rate - b.rate)
}

// Calculate change for cash payments
function calculateChange(payments: Payment[], total: number): number {
  const cashPayment = payments.find((p) => p.method === 'cash')
  if (cashPayment && cashPayment.amount > total) {
    return cashPayment.amount - total
  }
  return 0
}

/**
 * Receipt Template Component for Thermal Printers
 * Designed for 58mm (32 chars) and 80mm (48 chars) thermal paper
 */
export function ReceiptTemplate({
  store,
  sale,
  items,
  payments,
  cashier,
  paperWidth = 'MM_58',
  showQrCode = true,
  qrCodeUrl,
}: ReceiptProps) {
  const t = useTranslations('pos')
  const charWidth = PAPER_WIDTH[paperWidth]
  const vatBreakdown = groupByVatRate(items)
  const totalAmount = sale.total || 0
  const cashReceived = payments.reduce((sum, p) => sum + p.amount, 0)
  const change = calculateChange(payments, totalAmount)

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: t('paymentCash'),
      bank_transfer: t('paymentBankTransfer'),
      momo: 'MoMo',
      zalopay: 'ZaloPay',
      vnpay: 'VNPay',
    }
    return labels[method] || method
  }

  // Print-specific styles are defined inline for the print media query
  const printStyles = `
    @media print {
      @page {
        size: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .receipt-container {
        width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} !important;
        max-width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} !important;
        padding: 2mm !important;
        margin: 0 !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div
        className="receipt-container"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: paperWidth === 'MM_58' ? '11px' : '12px',
          lineHeight: '1.4',
          width: paperWidth === 'MM_58' ? '58mm' : '80mm',
          maxWidth: paperWidth === 'MM_58' ? '58mm' : '80mm',
          padding: '2mm',
          backgroundColor: '#fff',
          color: '#000',
          margin: '0 auto',
        }}
      >
        {/* Store Header */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: paperWidth === 'MM_58' ? '13px' : '14px' }}>
            {store.name?.toUpperCase() || t('store')}
          </div>
          {store.address && (
            <div style={{ fontSize: paperWidth === 'MM_58' ? '10px' : '11px' }}>
              {store.address}
            </div>
          )}
          {store.phone && (
            <div style={{ fontSize: paperWidth === 'MM_58' ? '10px' : '11px' }}>
              {t('receiptPhone')}: {store.phone}
            </div>
          )}
          {store.tax_code && (
            <div style={{ fontSize: paperWidth === 'MM_58' ? '10px' : '11px' }}>
              {t('receiptTaxCode')}: {store.tax_code}
            </div>
          )}
        </div>

        {/* Double line separator */}
        <div style={{ borderTop: '2px double #000', margin: '4px 0' }} />

        {/* Invoice Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '4px 0' }}>
          {t('salesInvoice')}
        </div>

        {/* Double line separator */}
        <div style={{ borderTop: '2px double #000', margin: '4px 0' }} />

        {/* Invoice Info */}
        <div style={{ marginBottom: '4px' }}>
          <div>{t('invoiceNo')}: {sale.invoice_no || '---'}</div>
          {sale.completed_at && (
            <div>
              {t('receiptDate')}: {formatDate(sale.completed_at)} {formatTime(sale.completed_at)}
            </div>
          )}
          {cashier && <div>{t('cashier')}: {cashier}</div>}
        </div>

        {/* Customer Info (if available) */}
        {(sale.customer_name || sale.customer_phone || sale.customer_tax_code) && (
          <div style={{ marginBottom: '4px' }}>
            {sale.customer_name && <div>{t('customer')}: {sale.customer_name}</div>}
            {sale.customer_phone && <div>{t('customerPhone')}: {sale.customer_phone}</div>}
            {sale.customer_tax_code && <div>{t('customerTaxCode')}: {sale.customer_tax_code}</div>}
          </div>
        )}

        {/* Dashed line separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Items Header */}
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{t('products')}</div>

        {/* Dashed line separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

        {/* Items List */}
        <div style={{ marginBottom: '4px' }}>
          {items.map((item, index) => (
            <div key={item.id || index} style={{ marginBottom: '4px' }}>
              {/* Product name */}
              <div
                style={{
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                {item.product_name}
              </div>
              {/* Qty x Price = Total */}
              <div style={{ textAlign: 'right' }}>
                {item.quantity}x{formatCurrency(item.unit_price)} = {formatCurrency(item.total)}
              </div>
              {/* Discount if any */}
              {item.discount && item.discount > 0 && (
                <div style={{ textAlign: 'right', fontSize: '10px' }}>
                  {t('discount')}: -{formatCurrency(item.discount)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dashed line separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Summary */}
        <div style={{ marginBottom: '4px' }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('subtotal')}:</span>
            <span>{formatCurrency(sale.subtotal || 0)}</span>
          </div>

          {/* VAT Breakdown */}
          {vatBreakdown.map((vat, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>VAT {vat.rate}%:</span>
              <span>{formatCurrency(vat.amount)}</span>
            </div>
          ))}

          {/* Discount */}
          {sale.discount && sale.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('discount')}:</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
        </div>

        {/* Double line separator */}
        <div style={{ borderTop: '2px double #000', margin: '4px 0' }} />

        {/* Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: paperWidth === 'MM_58' ? '13px' : '14px',
          }}
        >
          <span>{t('total')}:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>

        {/* Double line separator */}
        <div style={{ borderTop: '2px double #000', margin: '4px 0' }} />

        {/* Payment Details */}
        <div style={{ marginBottom: '4px' }}>
          {payments.map((payment, index) => (
            <div key={payment.id || index} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('payment')} ({getPaymentMethodLabel(payment.method)}):</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}

          {/* Cash received and change */}
          {change > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('cashReceived')}:</span>
                <span>{formatCurrency(cashReceived)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('change')}:</span>
                <span>{formatCurrency(change)}</span>
              </div>
            </>
          )}
        </div>

        {/* Note */}
        {sale.note && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ fontSize: '10px' }}>{t('note')}: {sale.note}</div>
          </>
        )}

        {/* Dashed line separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <div style={{ fontWeight: 'bold' }}>{t('thankYou')}</div>
          <div>{t('seeYouAgain')}</div>
        </div>

        {/* QR Code Placeholder */}
        {showQrCode && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '1px solid #000',
                margin: '4px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
              }}
            >
              [QR Code]
            </div>
            <div style={{ fontSize: '9px' }}>{t('lookupEInvoice')}</div>
            {qrCodeUrl && (
              <div style={{ fontSize: '8px', wordBreak: 'break-all' }}>{qrCodeUrl}</div>
            )}
          </div>
        )}

        {/* Extra spacing for paper cut */}
        <div style={{ height: '20mm' }} />
      </div>
    </>
  )
}

/**
 * Receipt Preview Container with print button
 */
export function ReceiptPreview(props: ReceiptProps & { onClose?: () => void }) {
  const t = useTranslations('pos')
  return (
    <div
      style={{
        backgroundColor: '#f0f0f0',
        padding: '16px',
        minHeight: '100vh',
      }}
    >
      <div className="no-print" style={{ marginBottom: '16px', textAlign: 'center' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 24px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginRight: '8px',
          }}
        >
          {t('printInvoice')}
        </button>
        {props.onClose && (
          <button
            onClick={props.onClose}
            style={{
              padding: '8px 24px',
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t('close')}
          </button>
        )}
      </div>
      <ReceiptTemplate {...props} />
    </div>
  )
}

export default ReceiptTemplate
