'use client'

import { Table, Tag, Button, Typography } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DebtInstallment } from '@/lib/supabase/functions'

const { Text } = Typography

interface InstallmentListProps {
  installments: DebtInstallment[]
  onPayInstallment?: (installment: DebtInstallment) => void
}

export function InstallmentList({ installments, onPayInstallment }: InstallmentListProps) {
  const getStatusBadge = (status: DebtInstallment['status']) => {
    switch (status) {
      case 'pending':
        return <Tag color="blue">Chua tra</Tag>
      case 'partial':
        return <Tag color="orange">Tra mot phan</Tag>
      case 'paid':
        return <Tag color="green">Da tra</Tag>
      case 'overdue':
        return <Tag color="red">Qua han</Tag>
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
      title: 'Han tra',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string, record: DebtInstallment) => (
        <Text className={isOverdue(record) ? 'text-red-600' : ''}>
          {formatDate(date)}
        </Text>
      ),
    },
    {
      title: 'So tien',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Da tra',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      render: (amount: number) => (
        <Text className={amount > 0 ? 'text-green-600' : ''}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Trang thai',
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
            Tra
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
