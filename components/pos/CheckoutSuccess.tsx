'use client'

import { useEffect } from 'react'
import { Button, Typography, Divider, Card } from 'antd'
import { PrinterOutlined, ShareAltOutlined, PlusOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { trackSaleCompleted } from '@/lib/analytics'

const { Text, Title } = Typography

export interface InvoiceItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount: number
  variant_name?: string
  unit_name?: string
}

export interface InvoiceData {
  invoiceNo: string
  total: number
  subtotal: number
  vatAmount: number
  discount: number
  items: InvoiceItem[]
  customerName?: string
  customerPhone?: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
  completedAt: Date
}

interface CheckoutSuccessProps {
  invoiceData: InvoiceData
  onNewSale: () => void
  onPrint?: () => void
  onShare?: () => void
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN')
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// Print styles to hide non-bill content and format receipt
const printStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }

    /* Hide everything except bill */
    body * {
      visibility: hidden;
    }

    /* Show only the printable bill area */
    .printable-bill,
    .printable-bill * {
      visibility: visible !important;
    }

    .printable-bill {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm !important;
      max-width: 80mm !important;
      padding: 2mm !important;
      margin: 0 !important;
      background: white !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Hide elements with no-print class */
    .no-print {
      display: none !important;
    }

    /* Receipt typography */
    .printable-bill {
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 11px !important;
      line-height: 1.3 !important;
      color: #000 !important;
    }

    .printable-bill .ant-typography {
      color: #000 !important;
    }

    .printable-bill .ant-card {
      box-shadow: none !important;
      border: none !important;
    }
  }
`

export function CheckoutSuccess({
  invoiceData,
  onNewSale,
  onPrint,
  onShare,
}: CheckoutSuccessProps) {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')

  const {
    invoiceNo,
    total,
    subtotal,
    vatAmount,
    discount,
    items,
    customerName,
    storeName,
    storeAddress,
    storePhone,
    completedAt
  } = invoiceData

  useEffect(() => {
    trackSaleCompleted(total, items.length)
  }, [total, items.length])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Success Header - hidden when printing */}
        <div className="text-center mb-4 no-print">
          <CheckCircleFilled className="text-5xl text-green-500 mb-2" />
          <Title level={3} className="!mb-0 text-green-600">{t('checkoutSuccess')}</Title>
        </div>

        {/* Invoice Content - this is what gets printed */}
        <Card
          className="max-w-md mx-auto shadow-sm printable-bill"
          styles={{ body: { padding: '16px' } }}
        >
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
            <Title level={4} className="!mb-1 uppercase">
              {storeName || t('store')}
            </Title>
            {storeAddress && (
              <Text type="secondary" className="text-xs block">{storeAddress}</Text>
            )}
            {storePhone && (
              <Text type="secondary" className="text-xs block">
                {t('receiptPhone')}: {storePhone}
              </Text>
            )}
          </div>

          {/* Invoice Info */}
          <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
            <div className="flex justify-between text-sm">
              <Text type="secondary">{t('invoiceNo')}:</Text>
              <Text strong>{invoiceNo}</Text>
            </div>
            <div className="flex justify-between text-sm">
              <Text type="secondary">{t('receiptDate')}:</Text>
              <Text>{formatDate(completedAt)} {formatTime(completedAt)}</Text>
            </div>
            {customerName && (
              <div className="flex justify-between text-sm">
                <Text type="secondary">{t('customer')}:</Text>
                <Text>{customerName}</Text>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
            <Text strong className="block mb-2">{t('products')}</Text>
            {items.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="mb-2">
                <div className="text-sm">
                  {item.product_name}
                  {item.variant_name && <span className="text-gray-500"> - {item.variant_name}</span>}
                  {item.unit_name && <span className="text-gray-500"> ({item.unit_name})</span>}
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
                {item.discount > 0 && (
                  <div className="flex justify-end text-xs text-red-500">
                    -{formatCurrency(item.discount)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-sm">
              <Text type="secondary">{t('subtotal')}:</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </div>
            {vatAmount > 0 && (
              <div className="flex justify-between text-sm">
                <Text type="secondary">{t('vat')}:</Text>
                <Text>{formatCurrency(vatAmount)}</Text>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <Text type="secondary">{t('discount')}:</Text>
                <Text className="text-red-500">-{formatCurrency(discount)}</Text>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t-2 border-double border-gray-400 pt-2 mb-4">
            <div className="flex justify-between">
              <Title level={4} className="!mb-0">{t('total')}:</Title>
              <Title level={4} className="!mb-0 text-blue-600">
                {formatCurrency(total)}
              </Title>
            </div>
          </div>

          {/* Thank You */}
          <div className="text-center text-sm text-gray-500 border-t border-dashed border-gray-300 pt-3">
            <div>{t('thankYou')}</div>
            <div>{t('seeYouAgain')}</div>
          </div>
        </Card>

        {/* Action Buttons - hidden when printing */}
        <div className="max-w-md mx-auto mt-4 space-y-3 no-print">
          {onPrint && (
            <Button
              icon={<PrinterOutlined />}
              size="large"
              block
              onClick={onPrint}
            >
              {t('printInvoice')}
            </Button>
          )}
          {onShare && (
            <Button
              icon={<ShareAltOutlined />}
              size="large"
              block
              onClick={onShare}
            >
              {tCommon('share')}
            </Button>
          )}
          <Divider className="!my-3" />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            block
            onClick={onNewSale}
          >
            {t('newOrder')}
          </Button>
        </div>
      </div>
    </>
  )
}
