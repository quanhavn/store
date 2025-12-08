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
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'

interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit?: number
}

interface RevenueExpenseChartProps {
  data: MonthlyData[]
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

const formatMonth = (monthStr: string) => {
  // Assuming format is YYYY-MM or similar
  const parts = monthStr.split('-')
  if (parts.length >= 2) {
    return `T${parseInt(parts[1], 10)}`
  }
  return monthStr
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    color: string
    payload: MonthlyData
  }>
  label?: string
  revenueLabel?: string
  expenseLabel?: string
  profitLabel?: string
}

function CustomTooltip({ active, payload, label, revenueLabel = 'Revenue', expenseLabel = 'Expense', profitLabel = 'Profit' }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="space-y-1">
        <p className="text-sm">
          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3ecf8e' }} />
          <span className="text-gray-600">{revenueLabel}: </span>
          <span className="font-semibold text-[#3ecf8e]">
            {formatFullCurrency(data.revenue)}
          </span>
        </p>
        <p className="text-sm">
          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-gray-600">{expenseLabel}: </span>
          <span className="font-semibold text-[#ef4444]">
            {formatFullCurrency(data.expenses)}
          </span>
        </p>
        {data.profit !== undefined && (
          <p className="text-sm pt-1 border-t border-gray-100">
            <span className="text-gray-600">{profitLabel}: </span>
            <span className={`font-semibold ${data.profit >= 0 ? 'text-[#3ecf8e]' : 'text-[#ef4444]'}`}>
              {formatFullCurrency(data.profit)}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

export function RevenueExpenseChart({
  data,
  isLoading,
}: RevenueExpenseChartProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tFinance = useTranslations('finance')

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedMonth: formatMonth(item.month),
      profit: item.profit ?? item.revenue - item.expenses,
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton.Input active className="w-48 mb-4" />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          {t('revenue')} vs {tFinance('expense')}
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
        {t('revenue')} vs {tFinance('expense')}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="formattedMonth"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={55}
            />
            <Tooltip content={<CustomTooltip revenueLabel={t('revenue')} expenseLabel={tFinance('expense')} profitLabel={t('profit')} />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10 }}
              formatter={(value: string) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name={t('revenue')}
              stroke="#3ecf8e"
              strokeWidth={2}
              dot={{ fill: '#3ecf8e', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#3ecf8e', strokeWidth: 0, r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name={tFinance('expense')}
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#ef4444', strokeWidth: 0, r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
