'use client'

import { Card, List, Typography, Empty } from 'antd'
import { ShoppingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

const { Text } = Typography

export function RecentSalesWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  if (isLoading) {
    return <Card loading />
  }

  const recentSales = data?.recentSales || []

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ShoppingOutlined />
          <span>Don hang gan day</span>
        </div>
      }
      size="small"
    >
      {recentSales.length === 0 ? (
        <Empty
          description="Chua co don hang"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          size="small"
          dataSource={recentSales}
          renderItem={(sale) => (
            <List.Item className="px-0">
              <div className="flex-1">
                <div className="flex justify-between">
                  <Text strong>{sale.invoice_no}</Text>
                  <Text className="text-green-600">{formatCurrency(sale.total)}</Text>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{sale.customer_name || 'Khach le'}</span>
                  <span>{dayjs(sale.completed_at).format('HH:mm')}</span>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}
