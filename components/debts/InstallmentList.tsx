'use client'

import { Table, Tag, Button, Typography } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DebtInstallment } from '@/lib/supabase/functions'

const { Text } = Typography

interface InstallmentListProps {
  installments: DebtInstallment[]
  onPayInstallment?: (installment: DebtInstallment) => void
}

export function InstallmentList({ installments, onPayInstallment }: InstallmentListProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')

  const getStatusBadge = (status: DebtInstallment['status']) => {
    switch (status) {
      case 'pending':
        return <Tag color="blue">{tCommon('pending')}</Tag>
      case 'partial':
        return <Tag color="orange">{tCommon('partial')}</Tag>
      case 'paid':
        return <Tag color="green">{tCommon('paid')}</Tag>
      case 'overdue':
        return <Tag color="red">{tCommon('overdue')}</Tag>
      default:
        return null
    }
  }

  const isOverdue = (installment: DebtInstallment) => {
    return installment.status === 'overdue' ||
      (new Date(installment.due_date) < new Date() && installment.status !== 'paid')
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'installment_number',
      key: 'installment_number',
      width: 40,
      render: (num: number) => <Text strong>{num}</Text>,
    },
    {
      title: t('dueDate'),
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string, record: DebtInstallment) => (
        <Text className={isOverdue(record) ? 'text-red-600' : ''}>
          {formatDate(date)}
        </Text>
      ),
    },
    {
      title: tCommon('amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: t('paidAmount'),
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      render: (amount: number) => (
        <Text className={amount > 0 ? 'text-green-600' : ''}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: tCommon('status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: DebtInstallment['status']) => getStatusBadge(status),
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_: unknown, record: DebtInstallment) => {
        if (record.status === 'paid') {
          return null
        }
        return (
          <Button
            type="primary"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => onPayInstallment?.(record)}
          >
            {t('payDebt')}
          </Button>
        )
      },
    },
  ]

  return (
    <Table
      dataSource={installments}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      rowClassName={(record) => isOverdue(record) ? 'bg-red-50' : ''}
      scroll={{ x: 500 }}
    />
  )
}
