/**
 * Dynamic POS Components
 *
 * Dynamically imported POS-related components for better code splitting
 * and improved initial page load performance.
 *
 * The BarcodeScanner component includes the heavy html5-qrcode library,
 * so lazy loading it significantly reduces initial bundle size.
 *
 * Usage:
 * ```tsx
 * import { DynamicBarcodeScanner } from '@/components/pos/dynamic'
 *
 * <DynamicBarcodeScanner open={isOpen} onClose={handleClose} onScan={handleScan} />
 * ```
 */

import dynamic from 'next/dynamic'
import { Modal, Spin } from 'antd'
import { CameraOutlined } from '@ant-design/icons'
import { BarcodeScannerSkeleton } from '@/components/ui/Skeletons'

/**
 * Loading placeholder for barcode scanner modal
 */
function BarcodeScannerLoading() {
  return (
    <Modal
      title={
        <span>
          <CameraOutlined className="mr-2" />
          Quet ma vach
        </span>
      }
      open={true}
      footer={null}
      width={400}
      centered
      closable={false}
    >
      <div className="py-4">
        <BarcodeScannerSkeleton />
        <div className="text-center mt-4">
          <Spin size="large" />
          <p className="mt-2 text-gray-500">Dang tai camera...</p>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Dynamic Barcode Scanner
 * Lazy loaded to defer loading of the heavy html5-qrcode library
 *
 * Benefits:
 * - Reduces initial bundle size by ~100KB
 * - Camera is only initialized when the component is actually used
 * - Users who don't use barcode scanning don't pay the cost
 */
export const DynamicBarcodeScanner = dynamic(
  () => import('./BarcodeScanner').then((mod) => mod.BarcodeScanner),
  {
    loading: () => <BarcodeScannerLoading />,
    ssr: false,
  }
)

const DynamicPOSComponents = {
  DynamicBarcodeScanner,
}

export default DynamicPOSComponents
