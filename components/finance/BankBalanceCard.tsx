'use client'

import { Card, Typography, Skeleton, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, BankOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface TodaySummary {
  bankIn: number
  bankOut: number
}

interface BankBalanceCardProps {
  onBankIn?: () => void
  onBankOut?: () => void
}

export function BankBalanceCard({ onBankIn, onBankOut }: BankBalanceCardProps) {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
    refetchInterval: 30000,
  })

  const today = new Date().toISOString().split('T')[0]
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['bank-transactions-today', today],
    queryFn: () => api.finance.bankTransactions({ date_from: today, date_to: today, limit: 100 }),
  })

  const accounts = accountsData?.bank_accounts || []
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

  const todaySummary: TodaySummary = {
    bankIn: txData?.transactions?.reduce((sum, tx) => sum + (tx.debit || 0), 0) || 0,
    bankOut: txData?.transactions?.reduce((sum, tx) => sum + (tx.credit || 0), 0) || 0,
  }

  const isLoading = accountsLoading || txLoading

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  return (
    <Card className="mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
          <BankOutlined className="text-white text-xl" />
        </div>
        <div>
          <Text type="secondary" className="text-sm">{t('totalBankBalance')}</Text>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(totalBalance)}
          </div>
          <Text type="secondary" className="text-xs">{t('accountCount', { count: accounts.length })}</Text>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3">
          <Statistic
            title={<span className="text-xs">{t('receivedToday')}</span>}
            value={todaySummary.bankIn}
            precision={0}
            valueStyle={{ color: '#2563eb', fontSize: '16px' }}
            prefix={<ArrowUpOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </div>
        <div className="bg-white rounded-lg p-3">
          <Statistic
            title={<span className="text-xs">{t('spentToday')}</span>}
            value={todaySummary.bankOut}
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
          onClick={onBankIn}
          disabled={accounts.length === 0}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowUpOutlined /> {t('deposit')}
        </button>
        <button
          onClick={onBankOut}
          disabled={accounts.length === 0}
          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowDownOutlined /> {t('withdraw')}
        </button>
      </div>
    </Card>
  )
}
