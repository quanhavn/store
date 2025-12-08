'use client'

import { Card, Badge, Typography } from 'antd'
import { WarningOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const { Text } = Typography

export function AlertsWidget() {
  const t = useTranslations('dashboard')
  const tInventory = useTranslations('inventory')
  const tTax = useTranslations('tax')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  if (isLoading) {
    return null
  }

  const alerts = data?.alerts
  const hasAlerts = (alerts?.lowStockCount || 0) > 0 || (alerts?.taxDeadlineDays || 999) <= 30

  if (!hasAlerts) return null

  return (
    <div className="space-y-2 mb-4">
      {(alerts?.lowStockCount || 0) > 0 && (
        <Link href="/inventory">
          <Card
            size="small"
            className="bg-yellow-50 border-yellow-200 cursor-pointer hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Badge status="warning" />
              <WarningOutlined className="text-yellow-600" />
              <Text className="flex-1">
                <strong>{alerts?.lowStockCount}</strong> {tInventory('lowStock')}
              </Text>
            </div>
          </Card>
        </Link>
      )}

      {(alerts?.taxDeadlineDays ?? 999) <= 30 && (
        <Link href="/settings?tab=tax">
          <Card
            size="small"
            className={`cursor-pointer hover:shadow-sm ${
              (alerts?.taxDeadlineDays ?? 999) <= 7
                ? 'bg-red-50 border-red-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge status={(alerts?.taxDeadlineDays ?? 999) <= 7 ? 'error' : 'warning'} />
              <ClockCircleOutlined
                className={(alerts?.taxDeadlineDays ?? 999) <= 7 ? 'text-red-600' : 'text-orange-600'}
              />
              <Text className="flex-1">
                {alerts?.taxDeadlineDays} {tTax('quarterly')}
              </Text>
            </div>
          </Card>
        </Link>
      )}
    </div>
  )
}
