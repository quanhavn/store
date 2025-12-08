'use client'

import { Card, Tag, Progress, Typography } from 'antd'
import { UserOutlined, CalendarOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DebtWithCustomer, DebtInstallment } from '@/lib/supabase/functions'

const { Text } = Typography

// Extended type for UI that includes customer info in a flat structure
export interface DebtDisplayData {
  id: string
  store_id: string
  customer_id: string
  customer_name: string
  customer_phone: string | null
  debt_type: 'credit' | 'installment'
  original_amount: number
  remaining_amount: number
  due_date: string | null
  status: 'active' | 'overdue' | 'paid' | 'cancelled'
  sale_id: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  installments?: DebtInstallment[]
}

// Helper to transform DebtWithCustomer to DebtDisplayData
export function transformDebtForDisplay(debt: DebtWithCustomer): DebtDisplayData {
  return {
    id: debt.id,
    store_id: debt.store_id,
    customer_id: debt.customer_id,
    customer_name: debt.customer?.name || '',
    customer_phone: debt.customer?.phone || null,
    debt_type: debt.debt_type,
    original_amount: debt.original_amount,
    remaining_amount: debt.remaining_amount,
    due_date: debt.due_date,
    status: debt.status,
    sale_id: debt.sale_id,
    notes: debt.notes,
    created_at: debt.created_at,
    created_by: debt.created_by,
  }
}

interface DebtCardProps {
  debt: DebtDisplayData
  onClick?: () => void
}

export function DebtCard({ debt, onClick }: DebtCardProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')
  const tCustomers = useTranslations('customers')

  const paidAmount = debt.original_amount - debt.remaining_amount
  const paidPercentage = debt.original_amount > 0
    ? Math.round((paidAmount / debt.original_amount) * 100)
    : 0

  const getStatusBadge = (status: DebtDisplayData['status']) => {
    switch (status) {
      case 'active':
        return <Tag color="blue">{tCommon('active')}</Tag>
      case 'overdue':
        return <Tag color="red">{tCommon('overdue')}</Tag>
      case 'paid':
        return <Tag color="green">{tCommon('paid')}</Tag>
      case 'cancelled':
        return <Tag color="default">{tCommon('cancelled')}</Tag>
      default:
        return null
    }
  }

  const getDebtTypeTag = (type: DebtDisplayData['debt_type']) => {
    switch (type) {
      case 'credit':
        return <Tag color="purple">{t('credit')}</Tag>
      case 'installment':
        return <Tag color="orange">{t('installment')}</Tag>
      default:
        return null
    }
  }

  const isOverdue = debt.status === 'overdue' ||
    (debt.due_date && new Date(debt.due_date) < new Date() && debt.status === 'active')

  return (
    <Card
      hoverable
      className="cursor-pointer"
      onClick={onClick}
      size="small"
    >
      <div className="space-y-3">
        {/* Header: Customer info and status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UserOutlined className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <Text strong className="truncate block">{debt.customer_name || tCustomers('customer')}</Text>
              {debt.customer_phone && (
                <Text type="secondary" className="text-xs">{debt.customer_phone}</Text>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {getStatusBadge(debt.status)}
            {getDebtTypeTag(debt.debt_type)}
          </div>
        </div>

        {/* Amount info */}
        <div className="flex items-center justify-between">
          <div>
            <Text type="secondary" className="text-xs block">{t('remainingAmount')}</Text>
            <Text strong className={`text-lg ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
              {formatCurrency(debt.remaining_amount)}
            </Text>
          </div>
          <div className="text-right">
            <Text type="secondary" className="text-xs block">{t('totalDebt')}</Text>
            <Text className="text-sm">{formatCurrency(debt.original_amount)}</Text>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <Text type="secondary">{t('paidAmount')}: {formatCurrency(paidAmount)}</Text>
            <Text type="secondary">{paidPercentage}%</Text>
          </div>
          <Progress
            percent={paidPercentage}
            showInfo={false}
            strokeColor={isOverdue ? '#dc2626' : '#2563eb'}
            size="small"
          />
        </div>

        {/* Due date */}
        {debt.due_date && (
          <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
            <CalendarOutlined />
            <span>
              {isOverdue ? `${tCommon('overdue')}: ` : `${t('dueDate')}: `}
              {formatDate(debt.due_date)}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
