'use client'

import { Card, Typography, Skeleton, Statistic, Row, Col } from 'antd'
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  WalletOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface FinanceSummaryCardProps {
  period?: 'day' | 'week' | 'month' | 'year'
}

export function FinanceSummaryCard({ period = 'month' }: FinanceSummaryCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-summary', period],
    queryFn: () => api.finance.summary(period),
  })

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Hom nay'
      case 'week': return '7 ngay qua'
      case 'month': return 'Thang nay'
      case 'year': return 'Nam nay'
    }
  }

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    )
  }

  const summary = data?.summary

  return (
    <Card className="mb-4" title={<Text strong>Tong quan - {getPeriodLabel()}</Text>}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic
            title="Doanh thu"
            value={summary?.total_revenue || 0}
            precision={0}
            valueStyle={{ color: '#16a34a', fontSize: '18px' }}
            prefix={<RiseOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Chi phi"
            value={summary?.total_expenses || 0}
            precision={0}
            valueStyle={{ color: '#dc2626', fontSize: '18px' }}
            prefix={<FallOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Loi nhuan"
            value={summary?.net_profit || 0}
            precision={0}
            valueStyle={{
              color: (summary?.net_profit || 0) >= 0 ? '#16a34a' : '#dc2626',
              fontSize: '18px'
            }}
            prefix={<DollarOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Quy tien mat"
            value={summary?.cash_balance || 0}
            precision={0}
            valueStyle={{ color: '#2563eb', fontSize: '18px' }}
            prefix={<WalletOutlined />}
            suffix="d"
            formatter={(value) => value?.toLocaleString('vi-VN')}
          />
        </Col>
      </Row>
    </Card>
  )
}
