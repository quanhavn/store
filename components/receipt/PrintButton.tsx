'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Button, Modal, message, Radio, Space } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { ReceiptTemplate, type ReceiptProps } from './ReceiptTemplate'
import type { PaperWidth } from '@/lib/receipt/thermal-commands'

interface PrintButtonProps {
  receiptData: Omit<ReceiptProps, 'paperWidth'>
  buttonText?: string
  buttonSize?: 'small' | 'middle' | 'large'
  buttonType?: 'default' | 'primary' | 'dashed' | 'link' | 'text'
  showIcon?: boolean
  block?: boolean
  className?: string
}

/**
 * PrintButton Component
 *
 * A button that opens a receipt preview modal and allows printing
 * to thermal printers using browser's print functionality with
 * print-specific CSS for thermal paper formatting.
 */
export function PrintButton({
  receiptData,
  buttonText,
  buttonSize = 'middle',
  buttonType = 'default',
  showIcon = true,
  block = false,
  className,
}: PrintButtonProps) {
  const t = useTranslations('pos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paperWidth, setPaperWidth] = useState<PaperWidth>('MM_58')
  const [isPrinting, setIsPrinting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handlePrint = useCallback(() => {
    setIsPrinting(true)

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600')

    if (!printWindow) {
      message.error(t('cannotOpenPrintWindow'))
      setIsPrinting(false)
      return
    }

    // Get the receipt HTML content
    const receiptContent = printRef.current?.innerHTML || ''

    // Build the print document
    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${t('invoice')} - ${receiptData.sale.invoice_no || ''}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === 'MM_58' ? '11px' : '12px'};
              line-height: 1.4;
              background: #fff;
              color: #000;
            }
            @page {
              size: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} auto;
              margin: 0;
            }
            @media print {
              body {
                width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'};
              }
            }
            .receipt-container {
              width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'};
              max-width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'};
              padding: 2mm;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printDocument)
    printWindow.document.close()

    setIsPrinting(false)
    message.success(t('printCommandSent'))
  }, [paperWidth, receiptData.sale.invoice_no, t])

  // Inline print using window.print() with CSS media queries
  const handleDirectPrint = useCallback(() => {
    setIsPrinting(true)

    // Apply print-specific styles
    const styleId = 'thermal-print-styles'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #receipt-print-area,
        #receipt-print-area * {
          visibility: visible;
        }
        #receipt-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'};
        }
        @page {
          size: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} auto;
          margin: 0;
        }
      }
    `

    // Trigger print
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }, [paperWidth])

  return (
    <>
      <Button
        type={buttonType}
        size={buttonSize}
        icon={showIcon ? <PrinterOutlined /> : undefined}
        onClick={handleOpenModal}
        block={block}
        className={className}
      >
        {buttonText || t('printInvoice')}
      </Button>

      <Modal
        title={t('previewInvoice')}
        open={isModalOpen}
        onCancel={handleCloseModal}
        width={paperWidth === 'MM_58' ? 320 : 400}
        footer={[
          <div key="paper-select" style={{ float: 'left', marginTop: '4px' }}>
            <Radio.Group
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value)}
              size="small"
            >
              <Radio.Button value="MM_58">58mm</Radio.Button>
              <Radio.Button value="MM_80">80mm</Radio.Button>
            </Radio.Group>
          </div>,
          <Button key="close" onClick={handleCloseModal}>
            {t('close')}
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            loading={isPrinting}
          >
            {t('printInvoice')}
          </Button>,
        ]}
        styles={{
          body: {
            backgroundColor: '#f5f5f5',
            padding: '16px',
            maxHeight: '70vh',
            overflowY: 'auto',
          },
        }}
      >
        <div ref={printRef} id="receipt-print-area">
          <ReceiptTemplate {...receiptData} paperWidth={paperWidth} />
        </div>
      </Modal>
    </>
  )
}

/**
 * Quick Print Button - prints directly without preview
 */
export function QuickPrintButton({
  receiptData,
  buttonText,
  buttonSize = 'small',
  paperWidth = 'MM_58',
}: {
  receiptData: Omit<ReceiptProps, 'paperWidth'>
  buttonText?: string
  buttonSize?: 'small' | 'middle' | 'large'
  paperWidth?: PaperWidth
}) {
  const t = useTranslations('pos')
  const [isPrinting, setIsPrinting] = useState(false)

  const handleQuickPrint = useCallback(() => {
    setIsPrinting(true)

    // Create hidden iframe for printing
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

    if (!iframeDoc) {
      message.error(t('cannotCreatePrintFrame'))
      setIsPrinting(false)
      return
    }

    // Build receipt HTML
    const receiptHtml = buildReceiptHtml(receiptData, paperWidth)

    iframeDoc.open()
    iframeDoc.write(receiptHtml)
    iframeDoc.close()

    // Wait for content to load then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          setIsPrinting(false)
          message.success(t('printCommandSent'))
        }, 100)
      }, 100)
    }
  }, [receiptData, paperWidth, t])

  return (
    <Button
      type="text"
      size={buttonSize}
      icon={<PrinterOutlined />}
      onClick={handleQuickPrint}
      loading={isPrinting}
    >
      {buttonText || t('quickPrint')}
    </Button>
  )
}

/**
 * Build receipt HTML string for iframe printing
 */
function buildReceiptHtml(
  receiptData: Omit<ReceiptProps, 'paperWidth'>,
  paperWidth: PaperWidth
): string {
  const { store, sale, items, payments, cashier, showQrCode, qrCodeUrl } = receiptData

  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + 'd'
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN')
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  const paymentLabels: Record<string, string> = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyen khoan',
    momo: 'MoMo',
    zalopay: 'ZaloPay',
    vnpay: 'VNPay',
  }

  const totalAmount = sale.total || 0
  const cashReceived = payments.reduce((sum, p) => sum + p.amount, 0)
  const change =
    payments.find((p) => p.method === 'cash')?.amount && payments[0].amount > totalAmount
      ? payments[0].amount - totalAmount
      : 0

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${paperWidth === 'MM_58' ? '11px' : '12px'};
            line-height: 1.4;
            width: ${paperWidth === 'MM_58' ? '58mm' : '80mm'};
            padding: 2mm;
            color: #000;
          }
          @page { size: ${paperWidth === 'MM_58' ? '58mm' : '80mm'} auto; margin: 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .row { display: flex; justify-content: space-between; }
          .dashed { border-top: 1px dashed #000; margin: 4px 0; }
          .double { border-top: 2px double #000; margin: 4px 0; }
          .small { font-size: ${paperWidth === 'MM_58' ? '10px' : '11px'}; }
          .right { text-align: right; }
          .item { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: ${paperWidth === 'MM_58' ? '13px' : '14px'}">
            ${store.name?.toUpperCase() || 'CUA HANG'}
          </div>
          ${store.address ? `<div class="small">${store.address}</div>` : ''}
          ${store.phone ? `<div class="small">DT: ${store.phone}</div>` : ''}
          ${store.tax_code ? `<div class="small">MST: ${store.tax_code}</div>` : ''}
        </div>
        <div class="double"></div>
        <div class="center bold">HOA DON BAN HANG</div>
        <div class="double"></div>
        <div>So HD: ${sale.invoice_no || '---'}</div>
        ${sale.completed_at ? `<div>Ngày: ${formatDate(sale.completed_at)} ${formatTime(sale.completed_at)}</div>` : ''}
        ${cashier ? `<div>Thu ngan: ${cashier}</div>` : ''}
        ${sale.customer_name ? `<div>KH: ${sale.customer_name}</div>` : ''}
        ${sale.customer_phone ? `<div>SDT: ${sale.customer_phone}</div>` : ''}
        ${sale.customer_tax_code ? `<div>MST KH: ${sale.customer_tax_code}</div>` : ''}
        <div class="dashed"></div>
        <div class="bold">San pham</div>
        <div class="dashed"></div>
        ${items
          .map(
            (item) => `
          <div class="item">
            <div>${item.product_name}</div>
            <div class="right">${item.quantity}x${formatCurrency(item.unit_price)} = ${formatCurrency(item.total)}</div>
            ${item.discount && item.discount > 0 ? `<div class="right small">Giam: -${formatCurrency(item.discount)}</div>` : ''}
          </div>
        `
          )
          .join('')}
        <div class="dashed"></div>
        <div class="row"><span>Tam tinh:</span><span>${formatCurrency(sale.subtotal || 0)}</span></div>
        ${sale.discount && sale.discount > 0 ? `<div class="row"><span>Giam gia:</span><span>-${formatCurrency(sale.discount)}</span></div>` : ''}
        <div class="double"></div>
        <div class="row bold" style="font-size: ${paperWidth === 'MM_58' ? '13px' : '14px'}">
          <span>TONG CONG:</span><span>${formatCurrency(totalAmount)}</span>
        </div>
        <div class="double"></div>
        ${payments.map((p) => `<div class="row"><span>Thanh toan (${paymentLabels[p.method] || p.method}):</span><span>${formatCurrency(p.amount)}</span></div>`).join('')}
        ${change > 0 ? `<div class="row"><span>Tien nhan:</span><span>${formatCurrency(cashReceived)}</span></div><div class="row"><span>Tien thua:</span><span>${formatCurrency(change)}</span></div>` : ''}
        ${sale.note ? `<div class="dashed"></div><div class="small">Ghi chu: ${sale.note}</div>` : ''}
        <div class="dashed"></div>
        <div class="center" style="margin-top: 8px;">
          <div class="bold">Cam on quy khach!</div>
          <div>Hen gap lai</div>
        </div>
        ${
          showQrCode !== false
            ? `
          <div class="center" style="margin-top: 8px;">
            <div style="width: 60px; height: 60px; border: 1px solid #000; margin: 4px auto; display: flex; align-items: center; justify-content: center; font-size: 8px;">[QR Code]</div>
            <div style="font-size: 9px;">Tra cuu hoa don dien tu</div>
            ${qrCodeUrl ? `<div style="font-size: 8px; word-break: break-all;">${qrCodeUrl}</div>` : ''}
          </div>
        `
            : ''
        }
        <div style="height: 20mm;"></div>
      </body>
    </html>
  `
}

export default PrintButton
