'use client'

import { useEffect, useMemo } from 'react'
import { Modal, Steps, Button, message, Space } from 'antd'
import {
  UploadOutlined,
  LinkOutlined,
  EyeOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { getEntityLabel } from '@/lib/import/types'
import { CSVUploadStep } from './CSVUploadStep'
import { CSVMappingStep } from './CSVMappingStep'
import { CSVPreviewStep } from './CSVPreviewStep'
import { CSVProgressStep } from './CSVProgressStep'

const STEP_ITEMS = [
  { title: 'Tải file', icon: <UploadOutlined /> },
  { title: 'Ghép cột', icon: <LinkOutlined /> },
  { title: 'Xem trước', icon: <EyeOutlined /> },
  { title: 'Import', icon: <LoadingOutlined /> },
]

export function CSVImportModal() {
  const queryClient = useQueryClient()
  const {
    isOpen,
    step,
    entityType,
    closeImport,
    setStep,
    csvColumns,
    columnMappings,
    parsedRows,
    validRowCount,
    progress,
    result,
    reset,
  } = useCSVImportStore()

  const currentStepIndex = useMemo(() => {
    switch (step) {
      case 'upload':
        return 0
      case 'mapping':
        return 1
      case 'preview':
        return 2
      case 'progress':
      case 'complete':
        return 3
      default:
        return 0
    }
  }, [step])

  const stepItems = useMemo(() => {
    return STEP_ITEMS.map((item, index) => {
      if (index === 3) {
        if (step === 'complete') {
          return { ...item, icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> }
        }
        if (step === 'progress') {
          return { ...item, icon: <LoadingOutlined /> }
        }
      }
      return item
    })
  }, [step])

  useEffect(() => {
    // Invalidate queries on successful import
    if (result?.success && result.importedCount > 0) {
      const queryKeys: string[] = []
      switch (entityType) {
        case 'category':
          queryKeys.push('categories')
          break
        case 'customer':
          queryKeys.push('customers')
          break
        case 'product':
          queryKeys.push('products')
          break
        case 'employee':
          queryKeys.push('employees')
          break
      }
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] })
      })
    }
  }, [result, entityType, queryClient])

  const handleClose = () => {
    if (progress.status === 'importing') {
      message.warning('Đang import, vui lòng đợi hoàn tất')
      return
    }
    closeImport()
  }

  const handleBack = () => {
    switch (step) {
      case 'mapping':
        setStep('upload')
        break
      case 'preview':
        setStep('mapping')
        break
    }
  }

  const handleNext = () => {
    switch (step) {
      case 'upload':
        if (csvColumns.length === 0) {
          message.error('Vui lòng tải file CSV')
          return
        }
        setStep('mapping')
        break
      case 'mapping':
        if (columnMappings.filter((m) => m.targetField).length === 0) {
          message.error('Vui lòng ghép ít nhất một cột')
          return
        }
        setStep('preview')
        break
      case 'preview':
        if (validRowCount === 0) {
          message.error('Không có dữ liệu hợp lệ để import')
          return
        }
        setStep('progress')
        break
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 'upload':
        return csvColumns.length > 0
      case 'mapping':
        return columnMappings.some((m) => m.targetField)
      case 'preview':
        return validRowCount > 0
      default:
        return false
    }
  }

  const canGoBack = () => {
    return step === 'mapping' || step === 'preview'
  }

  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return <CSVUploadStep />
      case 'mapping':
        return <CSVMappingStep />
      case 'preview':
        return <CSVPreviewStep />
      case 'progress':
      case 'complete':
        return <CSVProgressStep />
      default:
        return null
    }
  }

  const renderFooter = () => {
    if (step === 'complete') {
      return (
        <Space>
          <Button onClick={reset}>Import thêm</Button>
          <Button type="primary" onClick={handleClose}>
            Đóng
          </Button>
        </Space>
      )
    }

    return (
      <Space>
        <Button onClick={handleClose}>Hủy</Button>
        {canGoBack() && <Button onClick={handleBack}>Quay lại</Button>}
        <Button type="primary" onClick={handleNext} disabled={!canGoNext()}>
          {step === 'preview' ? `Import ${validRowCount} dòng` : 'Tiếp tục'}
        </Button>
      </Space>
    )
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={`Import ${getEntityLabel(entityType)}`}
      width={800}
      footer={renderFooter()}
      destroyOnHidden
      maskClosable={progress.status !== 'importing'}
      closable={progress.status !== 'importing'}
    >
      <Steps
        current={currentStepIndex}
        items={stepItems}
        size="small"
        className="mb-6"
      />
      <div className="min-h-[300px]">{renderStepContent()}</div>
    </Modal>
  )
}
