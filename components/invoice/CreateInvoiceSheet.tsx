'use client'

import { useState } from 'react'
import { Drawer, Typography, Divider, Spin, Alert, Table, message } from 'antd'
import { FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { InvoiceForm, type InvoiceFormData } from './InvoiceForm'

const { Title, Text } = Typography

interface CreateInvoiceSheetProps {
  saleId: string | null
  open: boolean
  onClose: () => void
  onSuccess?: (invoiceNo: string) => void
}

export function CreateInvoiceSheet({ saleId, open, onClose, onSuccess }: CreateInvoiceSheetProps) {
  const [createdInvoiceNo, setCreatedInvoiceNo] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: saleData, isLoading: saleLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => api.pos.getSale(saleId!),
    enabled: !!saleId && open,
  })

  const sale = saleData?.sale

  const createMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => api.invoice.create({
      sale_id: saleId!,
      buyer_name: data.buyerName,
      buyer_tax_code: data.buyerTaxCode,
      buyer_address: data.buyerAddress,
      buyer_email: data.buyerEmail,
      buyer_phone: data.buyerPhone,
    }),
    onSuccess: (data) => {
      const invoiceNo = data.invoice?.invoice_no || data.viettel_response?.invoice_no
      setCreatedInvoiceNo(invoiceNo || 'Đã tạo')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success('Tạo hóa đơn thành công')
      onSuccess?.(invoiceNo || '')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Lỗi tạo hóa đơn')
    },
  })

  const handleClose = () => {
    setCreatedInvoiceNo(null)
    onClose()
  }

  const handleSubmit = async (data: InvoiceFormData) => {
    createMutation.mutate(data)
  }

  const itemColumns = [
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
      width: 40,
      align: 'center' as const,
    },
    {
      title: 'Thành tiền',
      key: 'total',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, record: { total: number; vat_amount: number | null }) =>
        formatCurrency((record.total ?? 0) + (record.vat_amount ?? 0)),
    },
  ]

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <FileTextOutlined className="text-white" />
          </div>
          <span>Tạo hóa đơn điện tử</span>
        </div>
      }
      placement="bottom"
      height="95%"
      open={open}
      onClose={handleClose}
      destroyOnClose
    >
      <div className="max-w-md mx-auto">
        {saleLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : !sale ? (
          <Alert
            type="error"
            message="Không tìm thấy đơn hàng"
            showIcon
          />
        ) : createdInvoiceNo ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircleOutlined className="text-green-500 text-4xl" />
            </div>
            <Title level={3} className="!mb-2">Tạo hóa đơn thành công</Title>
            <Text type="secondary">Số hóa đơn:</Text>
            <Title level={2} className="!mt-1 text-blue-600">{createdInvoiceNo}</Title>
            <button
              onClick={handleClose}
              className="mt-6 w-full h-12 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <Text type="secondary">Đơn hàng:</Text>
                <Text strong>{sale.invoice_no || saleId}</Text>
              </div>
              
              <Table
                dataSource={sale.items}
                columns={itemColumns}
                rowKey="product_id"
                pagination={false}
                size="small"
                className="mb-3"
              />

              <Divider className="!my-3" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <Text type="secondary">Tạm tính:</Text>
                  <Text>{formatCurrency(sale.subtotal ?? 0)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">VAT:</Text>
                  <Text>{formatCurrency(sale.vat_amount ?? 0)}</Text>
                </div>
                {(sale.discount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <Text type="secondary">Giảm giá:</Text>
                    <Text className="text-red-500">-{formatCurrency(sale.discount ?? 0)}</Text>
                  </div>
                )}
                <Divider className="!my-2" />
                <div className="flex justify-between">
                  <Text strong>Tổng cộng:</Text>
                  <Text strong className="text-blue-600 text-lg">
                    {formatCurrency(sale.total ?? 0)}
                  </Text>
                </div>
              </div>
            </div>

            <Divider className="!my-4">Thông tin người mua</Divider>

            <InvoiceForm
              initialValues={{
                buyerName: sale.customer_name || '',
                buyerTaxCode: sale.customer_tax_code || '',
                buyerPhone: sale.customer_phone || '',
              }}
              onSubmit={handleSubmit}
              loading={createMutation.isPending}
              submitText="Phát hành hóa đơn"
            />

            {createMutation.isError && (
              <Alert
                type="error"
                message={createMutation.error instanceof Error ? createMutation.error.message : 'Lỗi tạo hóa đơn'}
                showIcon
                className="mt-4"
              />
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}
