'use client'

import { Card, Typography, Row, Col, Tag } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

export function MonthSummaryWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  if (isLoading) {
    return <Card loading className="mb-4" />
  }

  const thisMonth = data?.thisMonth
  const comparison = data?.comparison

  return (
    <Card className="mb-4">
      <Text type="secondary" className="text-xs">THANG NAY</Text>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="text-center p-2 bg-blue-50 rounded">
          <Text type="secondary" className="text-xs block">Doanh thu</Text>
          <div className="font-bold text-blue-600">
            {formatCurrency(thisMonth?.revenue || 0)}
          </div>
          {(comparison?.revenueChange ?? 0) !== 0 && (
            <Tag
              color={(comparison?.revenueChange ?? 0) > 0 ? 'green' : 'red'}
              className="mt-1 text-xs"
              icon={(comparison?.revenueChange ?? 0) > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            >
              {(comparison?.revenueChange ?? 0) > 0 ? '+' : ''}{comparison?.revenueChange}%
            </Tag>
          )}
        </div>

        <div className="text-center p-2 bg-orange-50 rounded">
          <Text type="secondary" className="text-xs block">Chi phi</Text>
          <div className="font-bold text-orange-600">
            {formatCurrency(thisMonth?.expenses || 0)}
          </div>
        </div>

        <div className="text-center p-2 bg-green-50 rounded">
          <Text type="secondary" className="text-xs block">Loi nhuan</Text>
          <div className="font-bold text-green-600">
            {formatCurrency(thisMonth?.profit || 0)}
          </div>
        </div>
      </div>
    </Card>
  )
}
