'use client'

import { useMemo } from 'react'
import { Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { useTranslations } from 'next-intl'
import { TodaySalesWidget } from './TodaySalesWidget'
import { MonthSummaryWidget } from './MonthSummaryWidget'
import { AlertsWidget } from './AlertsWidget'
import { RecentSalesWidget } from './RecentSalesWidget'
import {
  SalesLineChart,
  CategoryPieChart,
  TopProductsBarChart,
  PaymentMethodsPieChart,
  RevenueExpenseChart,
} from './charts'

export function DashboardSummary() {
  const t = useTranslations('reports')

  const { isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  // Calculate date range for last 30 days
  const dateRange = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    return {
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0],
    }
  }, [])

  const { data: salesAnalytics, isLoading: isSalesLoading } = useQuery({
    queryKey: ['sales-analytics', dateRange.dateFrom, dateRange.dateTo],
    queryFn: () => api.reports.salesAnalytics(dateRange.dateFrom, dateRange.dateTo),
  })

  const { data: financialAnalytics, isLoading: isFinancialLoading } = useQuery({
    queryKey: ['financial-analytics', dateRange.dateFrom, dateRange.dateTo],
    queryFn: () => api.reports.financialAnalytics(dateRange.dateFrom, dateRange.dateTo),
  })

  if (isDashboardLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary widgets */}
      <TodaySalesWidget />
      <MonthSummaryWidget />
      <AlertsWidget />

      {/* Charts Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {t('tabs.dashboard')}
        </h2>

        {/* Sales Line Chart - Full width */}
        <div className="mb-4">
          <SalesLineChart
            data={salesAnalytics?.dailySales || []}
            isLoading={isSalesLoading}
          />
        </div>

        {/* Revenue vs Expense Chart - Full width */}
        <div className="mb-4">
          <RevenueExpenseChart
            data={financialAnalytics?.monthlyTrend || []}
            isLoading={isFinancialLoading}
          />
        </div>

        {/* Pie Charts Grid - 2 columns on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <CategoryPieChart
            data={salesAnalytics?.byCategory || []}
            isLoading={isSalesLoading}
          />
          <PaymentMethodsPieChart
            data={salesAnalytics?.byPaymentMethod || []}
            isLoading={isSalesLoading}
          />
        </div>

        {/* Top Products Bar Chart - Full width */}
        <div className="mb-4">
          <TopProductsBarChart
            data={salesAnalytics?.topProducts || []}
            isLoading={isSalesLoading}
          />
        </div>
      </div>

      {/* Recent Sales */}
      <RecentSalesWidget />
    </div>
  )
}
