'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Modal, Button, Typography, Alert, Spin, Space } from 'antd'
import { CameraOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const { Text, Title } = Typography

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
]

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isStartingRef = useRef(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
  }, [])

  const handleClose = useCallback(async () => {
    await stopScanner()
    setLastScanned(null)
    setError(null)
    setLoading(true)
    onClose()
  }, [onClose, stopScanner])

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || !containerRef.current) return

    isStartingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Stop any existing scanner
      await stopScanner()

      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach(track => track.stop())

      // Create scanner instance
      const scanner = new Html5Qrcode('barcode-scanner-container', {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      })
      scannerRef.current = scanner

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras()
      if (cameras.length === 0) {
        throw new Error('Khong tim thay camera')
      }

      // Prefer back camera
      const backCamera = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      )
      const cameraId = backCamera?.id || cameras[0].id

      // Start scanning
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          // Haptic feedback on successful scan
          if (navigator.vibrate) {
            navigator.vibrate(200)
          }

          setLastScanned(decodedText)
          onScan(decodedText)

          // Auto close after successful scan
          handleClose()
        },
        () => {
          // Ignore scan failures (continuous scanning)
        }
      )

      setLoading(false)
    } catch (err) {
      console.error('Scanner error:', err)

      let errorMessage = 'Khong the khoi dong camera'

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
          errorMessage = 'Vui long cap quyen truy cap camera de quet ma vach'
        } else if (err.name === 'NotFoundError' || err.message.includes('Khong tim thay')) {
          errorMessage = 'Khong tim thay camera tren thiet bi'
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera dang duoc su dung boi ung dung khac'
        } else if (err.message.includes('secure context') || err.message.includes('HTTPS')) {
          errorMessage = 'Can HTTPS de su dung camera'
        }
      }

      setError(errorMessage)
      setLoading(false)
    } finally {
      isStartingRef.current = false
    }
  }, [onScan, stopScanner, handleClose])

  const handleRetry = useCallback(() => {
    setError(null)
    startScanner()
  }, [startScanner])

  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        startScanner()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }
  }, [open, startScanner, stopScanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          <span>Quet ma vach</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      centered
      destroyOnHidden
      closeIcon={<CloseOutlined />}
    >
      <div className="relative">
        {/* Scanner container */}
        <div
          id="barcode-scanner-container"
          ref={containerRef}
          className="w-full aspect-video bg-black rounded-lg overflow-hidden"
          style={{ minHeight: 250 }}
        />

        {/* Loading overlay */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-center">
              <Spin size="large" />
              <Text className="block mt-2 text-white">Dang khoi dong camera...</Text>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg p-4">
            <div className="text-center">
              <Alert
                type="error"
                message="Loi camera"
                description={error}
                showIcon
                className="mb-4"
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRetry}
              >
                Thu lai
              </Button>
            </div>
          </div>
        )}

        {/* Last scanned display */}
        {lastScanned && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Text type="success" strong>
              Da quet: {lastScanned}
            </Text>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-center">
          <Text type="secondary" className="text-sm">
            Huong camera vao ma vach de quet
          </Text>
        </div>

        {/* Supported formats info */}
        <div className="mt-2 text-center">
          <Text type="secondary" className="text-xs">
            Ho tro: EAN-13, EAN-8, Code-128, Code-39, UPC-A, QR Code
          </Text>
        </div>
      </div>
    </Modal>
  )
}

export default BarcodeScanner
