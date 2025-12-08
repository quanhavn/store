'use client'

import { Card, Typography, Skeleton, Statistic, Row, Col } from 'antd'
import {
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'

const { Text } = Typography

export function DebtSummaryCard() {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')
  const { data, isLoading } = useQuery({
    queryKey: ['debt-summary'],
    queryFn: () => api.debts.summary(),
  })

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    )
  }

  const summary = data?.summary

  return (
    <Card className="mb-4" title={<Text strong>{t('title')}</Text>}>
      <Row gutter={[16, 16]}>
        {/* Total outstanding */}
        <Col span={24}>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Text type="secondary" className="text-sm block mb-1">{t('totalDebt')}</Text>
            <div className="text-3xl font-bold text-blue-600">
              {summary?.total_outstanding?.toLocaleString('vi-VN') || 0}
              <span className="text-base font-normal ml-1">d</span>
            </div>
          </div>
        </Col>

        {/* Customers with debt */}
        <Col span={12}>
          <Statistic
            title={tCommon('customersWithDebt')}
            value={summary?.total_customers_with_debt || 0}
            prefix={<UserOutlined />}
            valueStyle={{ fontSize: '18px' }}
            suffix={tCommon('people')}
          />
        </Col>

        {/* Active debts */}
        <Col span={12}>
          <Statistic
            title={tCommon('activeDebts')}
            value={summary?.active_debts || 0}
            prefix={<FileTextOutlined />}
            valueStyle={{ fontSize: '18px' }}
            suffix={tCommon('items')}
          />
        </Col>

        {/* Overdue section */}
        <Col span={24}>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WarningOutlined className="text-red-600" />
                <Text type="secondary">{tCommon('overdue')}</Text>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-red-600">
                  {summary?.overdue_debts || 0} {tCommon('items')}
                </div>
                <div className="text-sm text-red-500">
                  {(summary?.overdue_amount || 0).toLocaleString('vi-VN')}d
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* Collected this month */}
        <Col span={24}>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircleOutlined className="text-green-600" />
                <Text type="secondary">{tCommon('collectedThisMonth')}</Text>
              </div>
              <div className="text-lg font-semibold text-green-600">
                {(summary?.collected_this_month || 0).toLocaleString('vi-VN')}d
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )
}
