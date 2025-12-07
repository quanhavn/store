'use client'

import { Drawer, Descriptions, Typography, Divider, Table, Spin, Tag, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { InvoiceActions } from './InvoiceActions'

const { Title, Text } = Typography

interface InvoiceDetailProps {
  invoiceId: string | null
  open: boolean
  onClose: () => void
  onStatusChange?: () => void
}

const statusConfig: Record<string, { color: string; label: string }> = {
  issued: { color: 'green', label: 'Đã phát hành' },
  cancelled: { color: 'red', label: 'Đã hủy' },
  pending: { color: 'gold', label: 'Chờ xử lý' },
  error: { color: 'red', label: 'Lỗi' },
}

export function InvoiceDetail({ invoiceId, open, onClose, onStatusChange }: InvoiceDetailProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.invoice.get(invoiceId!),
    enabled: !!invoiceId && open,
  })

  const invoice = data?.invoice
  const sale = invoice?.sales as {
    id: string
    invoice_no: string
    customer_name?: string
    customer_phone?: string
    customer_tax_code?: string
    subtotal: number
    vat_amount: number
    discount: number
    total: number
    completed_at: string
    sale_items: Array<{
      product_name: string
      quantity: number
      unit_price: number
      vat_rate: number
      vat_amount: number
      total: number
    }>
  } | null

  const handleStatusChange = () => {
    refetch()
    onStatusChange?.()
  }

  const status = invoice ? (statusConfig[invoice.status] || { color: 'default', label: invoice.status }) : null

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 50,
      align: 'center' as const,
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'VAT',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      width: 50,
      align: 'center' as const,
      render: (value: number) => `${value}%`,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right' as const,
      render: (_: number, record: { total: number; vat_amount: number }) => 
        formatCurrency(record.total + record.vat_amount),
    },
  ]

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <span>Chi tiết hóa đơn</span>
          {status && (
            <Tag color={status.color}>{status.label}</Tag>
          )}
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !invoice ? (
        <Alert
          type="error"
          message="Không tìm thấy hóa đơn"
          showIcon
        />
      ) : (
        <div className="max-w-2xl mx-auto pb-20">
          {invoice.error_message && (
            <Alert
              type="error"
              message="Lỗi hóa đơn"
              description={invoice.error_message}
              showIcon
              className="mb-4"
            />
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <Text type="secondary" className="text-sm">Số hóa đơn</Text>
            <Title level={3} className="!m-0 !mt-1">
              {invoice.invoice_no || 'Chờ cấp số'}
            </Title>
            {invoice.invoice_symbol && (
              <Text type="secondary">Ký hiệu: {invoice.invoice_symbol}</Text>
            )}
          </div>

          <Descriptions column={1} size="small" className="mb-4">
            <Descriptions.Item label="Ngày phát hành">
              {invoice.issue_date ? formatDateTime(invoice.issue_date) : 'Chưa phát hành'}
            </Descriptions.Item>
            <Descriptions.Item label="Mã tra cứu">
              {invoice.lookup_code || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">
              {invoice.provider === 'viettel' ? 'Viettel SINVOICE' : invoice.provider || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider className="!my-4">Thông tin người mua</Divider>

          <Descriptions column={1} size="small" className="mb-4">
            <Descriptions.Item label="Tên người mua">
              {sale?.customer_name || 'Khách lẻ'}
            </Descriptions.Item>
            {sale?.customer_tax_code && (
              <Descriptions.Item label="Mã số thuế">
                {sale.customer_tax_code}
              </Descriptions.Item>
            )}
            {sale?.customer_phone && (
              <Descriptions.Item label="Số điện thoại">
                {sale.customer_phone}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider className="!my-4">Chi tiết đơn hàng</Divider>

          {sale?.sale_items && (
            <>
              <Table
                dataSource={sale.sale_items}
                columns={columns}
                rowKey="product_name"
                pagination={false}
                size="small"
                className="mb-4"
              />

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <Text type="secondary">Tạm tính:</Text>
                  <Text>{formatCurrency(sale.subtotal)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Thuế VAT:</Text>
                  <Text>{formatCurrency(sale.vat_amount)}</Text>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between">
                    <Text type="secondary">Giảm giá:</Text>
                    <Text className="text-red-500">-{formatCurrency(sale.discount)}</Text>
                  </div>
                )}
                <Divider className="!my-2" />
                <div className="flex justify-between">
                  <Title level={5} className="!m-0">Tổng cộng:</Title>
                  <Title level={5} className="!m-0 text-blue-600">
                    {formatCurrency(sale.total)}
                  </Title>
                </div>
              </div>
            </>
          )}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <div className="max-w-2xl mx-auto">
              <InvoiceActions
                invoiceId={invoice.id}
                status={invoice.status}
                onSuccess={handleStatusChange}
              />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
