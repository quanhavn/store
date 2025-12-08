'use client'

import { Card, Typography, Spin, Statistic, Row, Col } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const { Text } = Typography

export function TodaySalesWidget() {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tDashboard = useTranslations('dashboard')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  if (isLoading) {
    return <Card loading className="mb-4" />
  }

  const today = data?.today

  return (
    <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50">
      <Text type="secondary" className="text-xs">{tCommon('today').toUpperCase()}</Text>
      <Row gutter={16} className="mt-2">
        <Col span={12}>
          <Statistic
            title={<span className="text-xs">{t('revenue')}</span>}
            value={today?.revenue || 0}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: '#3ecf8e', fontSize: '1.25rem' }}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={<span className="text-xs">{tDashboard('ordersCount')}</span>}
            value={today?.orders || 0}
            valueStyle={{ fontSize: '1.25rem' }}
            prefix={<ShoppingCartOutlined />}
            suffix={<span className="text-xs text-gray-400">{tCommon('orders')}</span>}
          />
        </Col>
      </Row>
      {(today?.orders || 0) > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {formatCurrency(today?.avgOrderValue || 0)}/{tCommon('orders')}
        </div>
      )}
    </Card>
  )
}
