/**
 * Dynamic Receipt Components
 *
 * Dynamically imported receipt components for better code splitting
 * and improved initial page load performance.
 *
 * Receipt components include heavy logic for thermal printing
 * and PDF generation, so they benefit from lazy loading.
 *
 * Usage:
 * ```tsx
 * import { DynamicPrintButton, DynamicReceiptTemplate } from '@/components/receipt/dynamic'
 *
 * <DynamicPrintButton receiptData={receiptData} />
 * ```
 */

import dynamic from 'next/dynamic'
import { ReceiptSkeleton } from '@/components/ui/Skeletons'
import { Button, Spin } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'

/**
 * Loading placeholder for print button
 */
function PrintButtonSkeleton() {
  return (
    <Button disabled icon={<PrinterOutlined />}>
      <Spin size="small" className="ml-2" />
    </Button>
  )
}

/**
 * Dynamic Receipt Template
 * Lazy loaded with a receipt skeleton placeholder
 */
export const DynamicReceiptTemplate = dynamic(
  () => import('./ReceiptTemplate').then((mod) => mod.ReceiptTemplate),
  {
    loading: () => <ReceiptSkeleton />,
    ssr: false,
  }
)

/**
 * Dynamic Receipt Preview
 * Lazy loaded with a receipt skeleton placeholder
 */
export const DynamicReceiptPreview = dynamic(
  () => import('./ReceiptTemplate').then((mod) => mod.ReceiptPreview),
  {
    loading: () => (
      <div className="bg-gray-100 p-4 min-h-screen">
        <ReceiptSkeleton />
      </div>
    ),
    ssr: false,
  }
)

/**
 * Dynamic Print Button
 * Lazy loaded to defer loading of print logic
 */
export const DynamicPrintButton = dynamic(
  () => import('./PrintButton').then((mod) => mod.PrintButton),
  {
    loading: () => <PrintButtonSkeleton />,
    ssr: false,
  }
)

/**
 * Dynamic Quick Print Button
 * Lazy loaded to defer loading of print logic
 */
export const DynamicQuickPrintButton = dynamic(
  () => import('./PrintButton').then((mod) => mod.QuickPrintButton),
  {
    loading: () => (
      <Button type="text" size="small" disabled icon={<PrinterOutlined />}>
        <Spin size="small" className="ml-1" />
      </Button>
    ),
    ssr: false,
  }
)

const DynamicReceiptComponents = {
  DynamicReceiptTemplate,
  DynamicReceiptPreview,
  DynamicPrintButton,
  DynamicQuickPrintButton,
}

// Re-export all dynamic receipt components
export default DynamicReceiptComponents
