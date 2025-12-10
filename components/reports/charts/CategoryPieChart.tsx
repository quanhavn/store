'use client'

import { useMemo } from 'react'
import { Skeleton } from 'antd'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'

interface CategoryData {
  category: string
  revenue: number
  percentage: number
}

interface CategoryPieChartProps {
  data: CategoryData[]
  isLoading?: boolean
}

const COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: CategoryData & { fill: string }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-700">{data.category}</p>
      <p className="text-sm text-[#3ecf8e] font-semibold">
        {formatCurrency(data.revenue)}
      </p>
      <p className="text-xs text-gray-500">{data.percentage}%</p>
    </div>
  )
}

interface CustomLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomLabelProps) {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined ||
    percent < 0.05
  ) {
    return null
  }

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function CategoryPieChart({ data, isLoading }: CategoryPieChartProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton.Input active className="w-32 mb-4" />
        <div className="flex justify-center">
          <Skeleton.Avatar active size={180} shape="circle" />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          {t('revenue')} - {tCommon('category')}
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
        {t('revenue')} - {tCommon('category')}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={90}
              dataKey="revenue"
              nameKey="category"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value: string) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
