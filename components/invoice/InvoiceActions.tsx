'use client'

import { useState } from 'react'
import { Button, Modal, Input, message, Space } from 'antd'
import {
  FilePdfOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  EditOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'

interface InvoiceActionsProps {
  invoiceId: string
  status: string
  onSuccess?: () => void
  compact?: boolean
}

export function InvoiceActions({ invoiceId, status, onSuccess, compact = false }: InvoiceActionsProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const queryClient = useQueryClient()

  const downloadPdfMutation = useMutation({
    mutationFn: () => api.invoice.downloadPdf(invoiceId),
    onSuccess: (data) => {
      const byteCharacters = atob(data.file_data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success(t('downloadedPdf'))
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : t('pdfError'))
    },
  })

  const downloadXmlMutation = useMutation({
    mutationFn: () => api.invoice.downloadXml(invoiceId),
    onSuccess: (data) => {
      const byteCharacters = atob(data.file_data)
      const blob = new Blob([byteCharacters], { type: 'application/xml' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success(t('downloadedXml'))
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : t('xmlError'))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.invoice.cancel(invoiceId, cancelReason),
    onSuccess: () => {
      message.success(t('invoiceCancelled'))
      setCancelModalOpen(false)
      setCancelReason('')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      onSuccess?.()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : t('cancelError'))
    },
  })

  const handleCancel = () => {
    if (cancelReason.trim().length < 5) {
      message.warning(t('cancelReasonMinChars'))
      return
    }
    cancelMutation.mutate()
  }

  const isIssued = status === 'issued'
  const canDownload = isIssued || status === 'pending'

  if (compact) {
    return (
      <Space size="small">
        {canDownload && (
          <>
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => downloadPdfMutation.mutate()}
              loading={downloadPdfMutation.isPending}
            />
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => downloadXmlMutation.mutate()}
              loading={downloadXmlMutation.isPending}
            />
          </>
        )}
        {isIssued && (
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => setCancelModalOpen(true)}
          />
        )}
        <Modal
          title={t('cancelInvoice')}
          open={cancelModalOpen}
          onCancel={() => setCancelModalOpen(false)}
          onOk={handleCancel}
          okText={t('confirmCancel')}
          cancelText={tCommon('close')}
          okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
        >
          <p className="mb-2">{t('cancelReasonRequired')}</p>
          <Input.TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder={t('cancelReasonPlaceholder')}
          />
        </Modal>
      </Space>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {canDownload && (
          <>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => downloadPdfMutation.mutate()}
              loading={downloadPdfMutation.isPending}
              block
            >
              {t('downloadPdf')}
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => downloadXmlMutation.mutate()}
              loading={downloadXmlMutation.isPending}
              block
            >
              {t('downloadXml')}
            </Button>
          </>
        )}

        {isIssued && (
          <>
            <Button
              icon={<EditOutlined />}
              disabled
              block
            >
              {t('adjust')}
            </Button>
            <Button
              icon={<SwapOutlined />}
              disabled
              block
            >
              {t('replace')}
            </Button>
            <Button
              icon={<CloseCircleOutlined />}
              danger
              onClick={() => setCancelModalOpen(true)}
              className="col-span-2"
              block
            >
              {t('cancelInvoice')}
            </Button>
          </>
        )}
      </div>

      <Modal
        title={t('cancelEInvoice')}
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCancelModalOpen(false)}>
            {tCommon('close')}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={handleCancel}
            loading={cancelMutation.isPending}
          >
            {t('confirmCancel')}
          </Button>,
        ]}
      >
        <p className="mb-4 text-gray-600">
          {t('cancelWarning')}
        </p>
        <Input.TextArea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder={t('cancelReasonPlaceholder')}
          status={cancelReason.length > 0 && cancelReason.length < 5 ? 'error' : undefined}
        />
        {cancelReason.length > 0 && cancelReason.length < 5 && (
          <p className="text-red-500 text-sm mt-1">
            {t('needMoreChars', { count: 5 - cancelReason.length })}
          </p>
        )}
      </Modal>
    </>
  )
}
