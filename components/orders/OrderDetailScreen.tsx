'use client'

import {
  Drawer,
  Descriptions,
  Typography,
  Divider,
  Table,
  Spin,
  Tag,
  Alert,
  Button,
  Space,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PrinterOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type SaleWithDetails } from '@/lib/supabase/functions'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const { Title, Text, Paragraph } = Typography

interface OrderDetailScreenProps {
  saleId: string | null
  open: boolean
  onClose: () => void
  onPrint?: (sale: SaleWithDetails) => void
  onShare?: (sale: SaleWithDetails) => void
}

export function OrderDetailScreen({
  saleId,
  open,
  onClose,
  onPrint,
  onShare,
}: OrderDetailScreenProps) {
  const t = useTranslations('orders')
  const tCommon = useTranslations('common')
  const tPos = useTranslations('pos')

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    completed: { color: 'green', icon: <CheckCircleOutlined />, label: t('statusCompleted') },
    cancelled: { color: 'red', icon: <CloseCircleOutlined />, label: t('statusCancelled') },
    pending: { color: 'gold', icon: <ClockCircleOutlined />, label: t('statusPending') },
    refunded: { color: 'orange', icon: <CloseCircleOutlined />, label: t('statusRefunded') },
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: tPos('paymentCash'),
    bank_transfer: tPos('paymentBankTransfer'),
    momo: 'MoMo',
    zalopay: 'ZaloPay',
    vnpay: 'VNPay',
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => api.pos.getSale(saleId!),
    enabled: !!saleId && open,
  })

  const sale = data?.sale

  const status = sale?.status ? statusConfig[sale.status] : null

  const columns = [
    {
      title: t('product'),
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
      render: (name: string, record: SaleWithDetails['sale_items'][0]) => (
        <div>
          <div>{name}</div>
          {record.variant_name && (
            <Tag color="blue" className="text-xs mt-1">{record.variant_name}</Tag>
          )}
          {record.unit_name && (
            <Text type="secondary" className="text-xs">/{record.unit_name}</Text>
          )}
        </div>
      ),
    },
    {
      title: t('qty'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 50,
      align: 'center' as const,
    },
    {
      title: t('price'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: t('total'),
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
  ]

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <span>{t('orderDetail')}</span>
          {status && (
            <Tag color={status.color} icon={status.icon}>
              {status.label}
            </Tag>
          )}
        </div>
      }
      placement="bottom"
      height="95%"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !sale ? (
        <Alert
          type="error"
          message={t('orderNotFound')}
          showIcon
        />
      ) : (
        <div className="max-w-2xl mx-auto pb-24">
          {/* Order Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4 text-center">
            <Text type="secondary" className="text-sm">{t('orderNumber')}</Text>
            <Title level={3} className="!m-0 !mt-1">
              {sale.invoice_no}
            </Title>
            <Text type="secondary" className="text-xs">
              {formatDateTime(sale.completed_at || sale.created_at)}
            </Text>
          </div>

          {/* Customer Info */}
          {(sale.customer_name || sale.customer_phone) && (
            <>
              <Divider className="!my-4">{t('customerInfo')}</Divider>
              <Descriptions column={1} size="small" className="mb-4">
                {sale.customer_name && (
                  <Descriptions.Item label={t('customerName')}>
                    {sale.customer_name}
                  </Descriptions.Item>
                )}
                {sale.customer_phone && (
                  <Descriptions.Item label={t('customerPhone')}>
                    {sale.customer_phone}
                  </Descriptions.Item>
                )}
                {sale.customer_tax_code && (
                  <Descriptions.Item label={t('taxCode')}>
                    {sale.customer_tax_code}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}

          {/* Products */}
          <Divider className="!my-4">{t('orderItems')}</Divider>
          <Table
            dataSource={sale.sale_items}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            className="mb-4"
          />

          {/* Order Summary */}
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

          {/* Payment Info */}
          {sale.payments && sale.payments.length > 0 && (
            <>
              <Divider className="!my-4">{t('paymentInfo')}</Divider>
              <div className="space-y-2">
                {sale.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center bg-green-50 rounded-lg p-3">
                    <div>
                      <Tag color="green">{paymentMethodLabels[payment.method] || payment.method}</Tag>
                      {payment.bank_ref && (
                        <Text type="secondary" className="text-xs ml-2">
                          Ref: {payment.bank_ref}
                        </Text>
                      )}
                    </div>
                    <Text strong className="text-green-600">
                      {formatCurrency(payment.amount)}
                    </Text>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Note */}
          {sale.note && (
            <>
              <Divider className="!my-4">{tCommon('note')}</Divider>
              <Paragraph className="bg-gray-50 rounded-lg p-3 mb-0">
                {sale.note}
              </Paragraph>
            </>
          )}

          {/* Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
            <div className="max-w-2xl mx-auto">
              <Space className="w-full justify-center">
                {onPrint && (
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => onPrint(sale)}
                  >
                    {tCommon('print')}
                  </Button>
                )}
                {onShare && (
                  <Button
                    icon={<ShareAltOutlined />}
                    onClick={() => onShare(sale)}
                  >
                    {tCommon('share')}
                  </Button>
                )}
                <Button type="primary" onClick={onClose}>
                  {tCommon('close')}
                </Button>
              </Space>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
