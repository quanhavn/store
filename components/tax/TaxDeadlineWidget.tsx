'use client'

import { Card, Typography, Tag, Progress } from 'antd'
import { ClockCircleOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

export function TaxDeadlineWidget() {
  const now = new Date()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const currentYear = now.getFullYear()

  const { data, isLoading } = useQuery({
    queryKey: ['quarterly-tax', currentQuarter, currentYear],
    queryFn: () => api.tax.calculateQuarterly(currentQuarter, currentYear),
  })

  if (isLoading) {
    return (
      <Card loading className="mb-4" />
    )
  }

  const quarterlyTax = data?.quarterly_tax
  if (!quarterlyTax) return null

  const deadline = new Date(quarterlyTax.deadline)
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const getStatusColor = () => {
    if (daysRemaining <= 0) return 'red'
    if (daysRemaining <= 7) return 'orange'
    if (daysRemaining <= 14) return 'gold'
    return 'green'
  }

  const getStatusIcon = () => {
    if (daysRemaining <= 0) return <WarningOutlined />
    if (daysRemaining <= 7) return <ClockCircleOutlined />
    return <CheckCircleOutlined />
  }

  const formatDeadline = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const progressPercent = Math.max(0, Math.min(100, ((30 - daysRemaining) / 30) * 100))

  return (
    <Card
      className={`mb-4 border-l-4 ${
        daysRemaining <= 7 ? 'border-l-red-500 bg-red-50' :
        daysRemaining <= 14 ? 'border-l-orange-500 bg-orange-50' :
        'border-l-green-500 bg-green-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Text strong>Thue {quarterlyTax.period}</Text>
        </div>
        <Tag color={getStatusColor()}>
          {daysRemaining <= 0 ? 'Qua han!' :
           daysRemaining === 1 ? 'Con 1 ngay' :
           `Con ${daysRemaining} ngay`}
        </Tag>
      </div>

      <div className="text-sm text-gray-600 mb-2">
        Han nop: <strong>{formatDeadline(deadline)}</strong>
      </div>

      <Progress
        percent={progressPercent}
        size="small"
        showInfo={false}
        strokeColor={getStatusColor()}
        className="mb-3"
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded p-2">
          <Text type="secondary" className="text-xs">VAT</Text>
          <div className="font-semibold text-sm">{formatCurrency(quarterlyTax.vat_payable)}</div>
        </div>
        <div className="bg-white rounded p-2">
          <Text type="secondary" className="text-xs">TNCN</Text>
          <div className="font-semibold text-sm">{formatCurrency(quarterlyTax.pit_payable)}</div>
        </div>
        <div className="bg-white rounded p-2">
          <Text type="secondary" className="text-xs">Tong</Text>
          <div className="font-semibold text-sm text-red-600">{formatCurrency(quarterlyTax.total_tax_payable)}</div>
        </div>
      </div>
    </Card>
  )
}
