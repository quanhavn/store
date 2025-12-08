'use client'

import { Drawer, Descriptions, Typography, Divider, Table, Spin, Tag, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
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

export function InvoiceDetail({ invoiceId, open, onClose, onStatusChange }: InvoiceDetailProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const tCustomers = useTranslations('customers')
  const tProducts = useTranslations('products')

  const statusConfig: Record<string, { color: string; label: string }> = {
    issued: { color: 'green', label: t('invoiceStatus.issued') },
    cancelled: { color: 'red', label: t('invoiceStatus.cancelled') },
    pending: { color: 'gold', label: t('invoiceStatus.pending') },
    error: { color: 'red', label: t('invoiceStatus.error') },
  }

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
      title: t('product'),
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
    },
    {
      title: t('qty'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 50,
      align: 'center' as const,
    },
    {
      title: t('unitPrice'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: t('vat'),
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      width: 50,
      align: 'center' as const,
      render: (value: number) => `${value}%`,
    },
    {
      title: t('lineTotal'),
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
          <span>{t('invoiceDetail')}</span>
          {status && (
            <Tag color={status.color}>{status.label}</Tag>
          )}
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !invoice ? (
        <Alert
          type="error"
          message={t('invoiceNotFound')}
          showIcon
        />
      ) : (
        <div className="max-w-2xl mx-auto pb-20">
          {invoice.error_message && (
            <Alert
              type="error"
              message={t('invoiceError')}
              description={invoice.error_message}
              showIcon
              className="mb-4"
            />
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <Text type="secondary" className="text-sm">{t('invoiceNumber')}</Text>
            <Title level={3} className="!m-0 !mt-1">
              {invoice.invoice_no || t('awaitingNumber')}
            </Title>
            {invoice.invoice_symbol && (
              <Text type="secondary">{t('invoiceSymbol')}: {invoice.invoice_symbol}</Text>
            )}
          </div>

          <Descriptions column={1} size="small" className="mb-4">
            <Descriptions.Item label={t('issueDate')}>
              {invoice.issue_date ? formatDateTime(invoice.issue_date) : t('notYetIssued')}
            </Descriptions.Item>
            <Descriptions.Item label={t('lookupCode')}>
              {invoice.lookup_code || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('provider')}>
              {invoice.provider === 'viettel' ? 'Viettel SINVOICE' : invoice.provider || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider className="!my-4">{t('buyerInfo')}</Divider>

          <Descriptions column={1} size="small" className="mb-4">
            <Descriptions.Item label={t('buyerName')}>
              {sale?.customer_name || t('retailCustomer')}
            </Descriptions.Item>
            {sale?.customer_tax_code && (
              <Descriptions.Item label={t('taxCode')}>
                {sale.customer_tax_code}
              </Descriptions.Item>
            )}
            {sale?.customer_phone && (
              <Descriptions.Item label={t('phone')}>
                {sale.customer_phone}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider className="!my-4">{t('orderDetails')}</Divider>

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
                  <Text type="secondary">{t('subtotal')}:</Text>
                  <Text>{formatCurrency(sale.subtotal)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">{t('vatAmount')}:</Text>
                  <Text>{formatCurrency(sale.vat_amount)}</Text>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between">
                    <Text type="secondary">{t('discount')}:</Text>
                    <Text className="text-red-500">-{formatCurrency(sale.discount)}</Text>
                  </div>
                )}
                <Divider className="!my-2" />
                <div className="flex justify-between">
                  <Title level={5} className="!m-0">{t('grandTotal')}:</Title>
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
