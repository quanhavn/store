'use client'

import { useState } from 'react'
import { Card, List, Typography, Empty } from 'antd'
import { ShoppingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { OrderDetailScreen } from '@/components/orders'

const { Text } = Typography

interface RecentSale {
  id: string
  invoice_no: string
  customer_name?: string | null
  total: number
  completed_at: string
}

export function RecentSalesWidget() {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId)
    setDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedSaleId(null)
  }

  if (isLoading) {
    return <Card loading />
  }

  const recentSales: RecentSale[] = data?.recentSales || []

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined />
            <span>{t('sales')}</span>
          </div>
        }
        size="small"
      >
        {recentSales.length === 0 ? (
          <Empty
            description={tCommon('noData')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={recentSales}
            renderItem={(sale) => (
              <List.Item
                className="px-0 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded transition-colors"
                onClick={() => handleSelectSale(sale.id)}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <Text strong>{sale.invoice_no}</Text>
                    <Text className="text-green-600">{formatCurrency(sale.total)}</Text>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{sale.customer_name || t('customer')}</span>
                    <span>{dayjs(sale.completed_at).format('HH:mm')}</span>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <OrderDetailScreen
        saleId={selectedSaleId}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </>
  )
}
