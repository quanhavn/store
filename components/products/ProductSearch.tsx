'use client'

import { Input, Button, Tooltip } from 'antd'
import { SearchOutlined, ScanOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

// Dynamic import for BarcodeScanner (client-only, no SSR)
const BarcodeScanner = dynamic(
  () => import('@/components/pos/BarcodeScanner'),
  { ssr: false }
)

interface ProductSearchProps {
  onSearch: (value: string) => void
  onBarcodeScanned?: (barcode: string) => void
  placeholder?: string
  debounceMs?: number
  showScanner?: boolean
}

export function ProductSearch({
  onSearch,
  onBarcodeScanned,
  placeholder,
  debounceMs = 300,
  showScanner = false,
}: ProductSearchProps) {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const [value, setValue] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const defaultPlaceholder = `${tCommon('search')} ${t('productName').toLowerCase()}, ${t('barcode').toLowerCase()}...`

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, onSearch, debounceMs])

  const handleOpenScanner = useCallback(() => {
    setScannerOpen(true)
  }, [])

  const handleCloseScanner = useCallback(() => {
    setScannerOpen(false)
  }, [])

  const handleBarcodeScanned = useCallback((barcode: string) => {
    // Set the barcode in the search input
    setValue(barcode)

    // Call the callback if provided
    if (onBarcodeScanned) {
      onBarcodeScanned(barcode)
    }
  }, [onBarcodeScanned])

  return (
    <>
      <div className="flex gap-2">
        <Input
          size="large"
          placeholder={placeholder || defaultPlaceholder}
          prefix={<SearchOutlined className="text-gray-400" />}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          allowClear
          className="rounded-lg flex-1"
        />
        {showScanner && (
          <Tooltip title={t('scanBarcode')}>
            <Button
              size="large"
              icon={<ScanOutlined />}
              onClick={handleOpenScanner}
              className="flex items-center justify-center"
            />
          </Tooltip>
        )}
      </div>

      {showScanner && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={handleCloseScanner}
          onScan={handleBarcodeScanned}
        />
      )}
    </>
  )
}
