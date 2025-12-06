'use client'

import { Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { TodaySalesWidget } from './TodaySalesWidget'
import { MonthSummaryWidget } from './MonthSummaryWidget'
import { AlertsWidget } from './AlertsWidget'
import { RecentSalesWidget } from './RecentSalesWidget'

export function DashboardSummary() {
  const { isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TodaySalesWidget />
      <MonthSummaryWidget />
      <AlertsWidget />
      <RecentSalesWidget />
    </div>
  )
}
