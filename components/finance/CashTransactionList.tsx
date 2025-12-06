'use client'

import { List, Tag, Empty, Spin, Typography } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, type CashTransaction } from '@/lib/supabase/functions'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const { Text } = Typography

interface CashTransactionListProps {
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export function CashTransactionList({ dateFrom, dateTo, limit = 20 }: CashTransactionListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-transactions', dateFrom, dateTo, limit],
    queryFn: () => api.finance.cashTransactions({
      date_from: dateFrom,
      date_to: dateTo,
      limit,
    }),
  })

  const transactions = data?.transactions || []

  const getReferenceLabel = (type: string | null) => {
    switch (type) {
      case 'sale': return { color: 'green', text: 'Ban hang' }
      case 'expense': return { color: 'orange', text: 'Chi phi' }
      case 'salary': return { color: 'purple', text: 'Luong' }
      case 'adjustment': return { color: 'blue', text: 'Dieu chinh' }
      default: return { color: 'default', text: 'Khac' }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <Empty
        image={<InboxOutlined className="text-5xl text-gray-300" />}
        description="Chua co giao dich nao"
      />
    )
  }

  return (
    <List
      dataSource={transactions}
      renderItem={(tx: CashTransaction) => {
        const isIncome = tx.debit > 0
        const amount = isIncome ? tx.debit : tx.credit
        const ref = getReferenceLabel(tx.reference_type)

        return (
          <List.Item className="!px-0 !py-3">
            <div className="w-full flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isIncome ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isIncome ? (
                  <ArrowUpOutlined className="text-green-600" />
                ) : (
                  <ArrowDownOutlined className="text-red-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tx.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Tag color={ref.color} className="text-xs m-0">{ref.text}</Tag>
                  <Text type="secondary" className="text-xs">
                    {formatDateTime(tx.created_at)}
                  </Text>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(amount)}
                </div>
                <Text type="secondary" className="text-xs">
                  SD: {formatCurrency(tx.balance)}
                </Text>
              </div>
            </div>
          </List.Item>
        )
      }}
    />
  )
}
