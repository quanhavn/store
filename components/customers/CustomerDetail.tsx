'use client'

import { Drawer, Descriptions, Tag, Button, Divider, Spin, Empty, List, Typography } from 'antd'
import { EditOutlined, PhoneOutlined, EnvironmentOutlined, BankOutlined, FileTextOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { formatCurrency, formatPhone, formatDate } from '@/lib/utils'

const { Text } = Typography

interface CustomerDetailProps {
  open: boolean
  onClose: () => void
  customerId: string | null
  onEdit?: () => void
}

export function CustomerDetail({ open, onClose, customerId, onEdit }: CustomerDetailProps) {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const tDebts = useTranslations('debts')

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.customers.get(customerId!),
    enabled: !!customerId && open,
  })

  const customer = data?.customer

  if (!customerId) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={customer?.name || t('customerDetail')}
      placement="bottom"
      height="85%"
      extra={
        customer && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            {tCommon('edit')}
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : !customer ? (
        <Empty description={t('notFound')} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {customer.total_debt > 0 ? (
              <Tag color="red">{tDebts('debt')} {formatCurrency(customer.total_debt)}</Tag>
            ) : (
              <Tag color="green">{tDebts('noDebt')}</Tag>
            )}
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={<><PhoneOutlined /> {tCommon('phone')}</>}>
              <a href={`tel:${customer.phone}`}>{formatPhone(customer.phone)}</a>
            </Descriptions.Item>
            {customer.address && (
              <Descriptions.Item label={<><EnvironmentOutlined /> {tCommon('address')}</>}>
                {customer.address}
              </Descriptions.Item>
            )}
            {customer.tax_code && (
              <Descriptions.Item label={<><BankOutlined /> {t('taxCode')}</>}>
                {customer.tax_code}
              </Descriptions.Item>
            )}
            {customer.notes && (
              <Descriptions.Item label={<><FileTextOutlined /> {tCommon('note')}</>}>
                {customer.notes}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider orientationMargin={0}>
            <span className="text-sm">{tDebts('debtInfo')}</span>
          </Divider>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(customer.total_debt || 0)}
              </div>
              <div className="text-xs text-gray-500">{t('totalDebt')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-orange-600">
                {customer.active_debts || 0}
              </div>
              <div className="text-xs text-gray-500">{tDebts('debtInvoices')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-purple-600">
                {customer.overdue_debts || 0}
              </div>
              <div className="text-xs text-gray-500">{tDebts('overdue')}</div>
            </div>
          </div>

          {customer.debts && customer.debts.length > 0 && (
            <>
              <Divider orientationMargin={0}>
                <span className="text-sm">{tDebts('debtItems')}</span>
              </Divider>

              <List
                size="small"
                dataSource={customer.debts}
                renderItem={(debt: { id: string; invoice_no: string; total_amount: number; remaining_amount: number; created_at: string; is_overdue: boolean }) => (
                  <List.Item className="!px-0">
                    <div className="flex justify-between w-full">
                      <div>
                        <Text strong>{debt.invoice_no}</Text>
                        <div className="text-xs text-gray-500">
                          {formatDate(debt.created_at)}
                          {debt.is_overdue && (
                            <Tag color="red" className="ml-2">{tDebts('overdue')}</Tag>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(debt.remaining_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          / {formatCurrency(debt.total_amount)}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </>
          )}
        </div>
      )}
    </Drawer>
  )
}
