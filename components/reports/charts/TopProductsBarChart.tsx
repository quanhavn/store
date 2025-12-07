'use client'

import { useMemo } from 'react'
import { Skeleton } from 'antd'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TopProduct {
  product_name: string
  quantity_sold: number
  revenue: number
}

interface TopProductsBarChartProps {
  data: TopProduct[]
  isLoading?: boolean
  displayMode?: 'revenue' | 'quantity'
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

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: TopProduct
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
      <p className="text-sm font-medium text-gray-700 mb-1">
        {data.product_name}
      </p>
      <p className="text-sm text-[#3ecf8e] font-semibold">
        {formatFullCurrency(data.revenue)}
      </p>
      <p className="text-xs text-gray-500">
        Da ban: {data.quantity_sold} san pham
      </p>
    </div>
  )
}

export function TopProductsBarChart({
  data,
  isLoading,
  displayMode = 'revenue',
}: TopProductsBarChartProps) {
  const chartData = useMemo(() => {
    return data
      .slice(0, 10)
      .map(item => ({
        ...item,
        shortName: truncateText(item.product_name, 15),
      }))
      .reverse() // Reverse for horizontal bar chart to show highest at top
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton.Input active className="w-40 mb-4" />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          Top 10 san pham ban chay
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-400">
          Khong co du lieu
        </div>
      </div>
    )
  }

  const dataKey = displayMode === 'revenue' ? 'revenue' : 'quantity_sold'
  const formatter = displayMode === 'revenue' ? formatCurrency : (v: number) => v.toString()

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-700 mb-4">
        Top 10 san pham ban chay
        {displayMode === 'revenue' ? ' (doanh thu)' : ' (so luong)'}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatter}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === chartData.length - 1 ? '#3ecf8e' : '#6ee7b7'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
