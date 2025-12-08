'use client'

import { Card, Typography, Skeleton, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface TodaySummary {
  cashIn: number
  cashOut: number
}

interface CashBalanceCardProps {
  onCashIn?: () => void
  onCashOut?: () => void
}

export function CashBalanceCard({ onCashIn, onCashOut }: CashBalanceCardProps) {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')

  // Fetch current cash balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => api.finance.cashBalance(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch today's transactions for summary
  const today = new Date().toISOString().split('T')[0]
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['cash-transactions-today', today],
    queryFn: () => api.finance.cashTransactions({ date_from: today, date_to: today, limit: 100 }),
  })

  const todaySummary: TodaySummary = {
    cashIn: txData?.transactions?.reduce((sum, tx) => sum + (tx.debit || 0), 0) || 0,
    cashOut: txData?.transactions?.reduce((sum, tx) => sum + (tx.credit || 0), 0) || 0,
  }

  const isLoading = balanceLoading || txLoading

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  const balance = balanceData?.balance || 0

  return (
    <Card className="mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
          <WalletOutlined className="text-white text-xl" />
        </div>
        <div>
          <Text type="secondary" className="text-sm">{t('cashBalance')}</Text>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3">
          <Statistic
            title={<span className="text-xs">{t('receivedToday')}</span>}
            value={todaySummary.cashIn}
            precision={0}
            valueStyle={{ color: '#16a34a', fontSize: '16px' }}
            prefix={<ArrowUpOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </div>
        <div className="bg-white rounded-lg p-3">
          <Statistic
            title={<span className="text-xs">{t('spentToday')}</span>}
            value={todaySummary.cashOut}
            precision={0}
            valueStyle={{ color: '#dc2626', fontSize: '16px' }}
            prefix={<ArrowDownOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCashIn}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowUpOutlined /> {t('cashIn')}
        </button>
        <button
          onClick={onCashOut}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowDownOutlined /> {t('cashOut')}
        </button>
      </div>
    </Card>
  )
}
