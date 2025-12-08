'use client'

import { useMemo } from 'react'
import { Skeleton } from 'antd'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'

interface DailySale {
  date: string
  revenue: number
  orders: number
}

interface SalesLineChartProps {
  data: DailySale[]
  isLoading?: boolean
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toLocaleString('vi-VN')
}

const formatFullCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: DailySale
  }>
  label?: string
  ordersLabel?: string
}

function CustomTooltip({ active, payload, label, ordersLabel = 'orders' }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-[#3ecf8e]">
        {formatFullCurrency(data.revenue)}
      </p>
      <p className="text-xs text-gray-500">
        {data.orders} {ordersLabel}
      </p>
    </div>
  )
}

export function SalesLineChart({ data, isLoading }: SalesLineChartProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tDashboard = useTranslations('dashboard')

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: formatDate(item.date),
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton.Input active className="w-32 mb-4" />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          {t('revenue')} - {t('daily')}
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          {tCommon('noData')}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-700 mb-4">
        {t('revenue')} - {t('daily')} (30)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={50}
            />
            <Tooltip content={<CustomTooltip ordersLabel={tCommon('orders')} />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3ecf8e"
              strokeWidth={2}
              dot={{ fill: '#3ecf8e', strokeWidth: 0, r: 3 }}
              activeDot={{ fill: '#3ecf8e', strokeWidth: 0, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
