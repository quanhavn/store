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
import { api } from '@/lib/supabase/functions'

interface InvoiceActionsProps {
  invoiceId: string
  status: string
  onSuccess?: () => void
  compact?: boolean
}

export function InvoiceActions({ invoiceId, status, onSuccess, compact = false }: InvoiceActionsProps) {
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
      
      message.success('Đã tải xuống PDF')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Lỗi tải PDF')
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
      
      message.success('Đã tải xuống XML')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Lỗi tải XML')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.invoice.cancel(invoiceId, cancelReason),
    onSuccess: () => {
      message.success('Đã hủy hóa đơn')
      setCancelModalOpen(false)
      setCancelReason('')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      onSuccess?.()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Lỗi hủy hóa đơn')
    },
  })

  const handleCancel = () => {
    if (cancelReason.trim().length < 5) {
      message.warning('Lý do hủy phải có ít nhất 5 ký tự')
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
          title="Hủy hóa đơn"
          open={cancelModalOpen}
          onCancel={() => setCancelModalOpen(false)}
          onOk={handleCancel}
          okText="Xác nhận hủy"
          cancelText="Đóng"
          okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
        >
          <p className="mb-2">Vui lòng nhập lý do hủy hóa đơn (tối thiểu 5 ký tự):</p>
          <Input.TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="VD: Sai thông tin người mua..."
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
              Tải PDF
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => downloadXmlMutation.mutate()}
              loading={downloadXmlMutation.isPending}
              block
            >
              Tải XML
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
              Điều chỉnh
            </Button>
            <Button
              icon={<SwapOutlined />}
              disabled
              block
            >
              Thay thế
            </Button>
            <Button
              icon={<CloseCircleOutlined />}
              danger
              onClick={() => setCancelModalOpen(true)}
              className="col-span-2"
              block
            >
              Hủy hóa đơn
            </Button>
          </>
        )}
      </div>

      <Modal
        title="Hủy hóa đơn điện tử"
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCancelModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={handleCancel}
            loading={cancelMutation.isPending}
          >
            Xác nhận hủy
          </Button>,
        ]}
      >
        <p className="mb-4 text-gray-600">
          Hóa đơn đã hủy không thể khôi phục. Vui lòng nhập lý do hủy (tối thiểu 5 ký tự):
        </p>
        <Input.TextArea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder="VD: Sai thông tin người mua, khách hàng yêu cầu hủy..."
          status={cancelReason.length > 0 && cancelReason.length < 5 ? 'error' : undefined}
        />
        {cancelReason.length > 0 && cancelReason.length < 5 && (
          <p className="text-red-500 text-sm mt-1">
            Cần thêm {5 - cancelReason.length} ký tự nữa
          </p>
        )}
      </Modal>
    </>
  )
}
