/**
 * Dynamic Chart Components
 *
 * Dynamically imported chart components for better code splitting
 * and improved initial page load performance.
 *
 * Usage:
 * ```tsx
 * import { DynamicSalesLineChart } from '@/components/reports/charts/dynamic'
 *
 * <DynamicSalesLineChart data={salesData} isLoading={isLoading} />
 * ```
 */

import dynamic from 'next/dynamic'
import {
  LineChartSkeleton,
  PieChartSkeleton,
  BarChartSkeleton,
  ChartSkeleton,
} from '@/components/ui/Skeletons'

/**
 * Dynamic Sales Line Chart
 * Lazy loaded with a line chart skeleton placeholder
 */
export const DynamicSalesLineChart = dynamic(
  () => import('./SalesLineChart').then((mod) => mod.SalesLineChart),
  {
    loading: () => <LineChartSkeleton title="Doanh thu theo ngay (30 ngay)" />,
    ssr: false,
  }
)

/**
 * Dynamic Category Pie Chart
 * Lazy loaded with a pie chart skeleton placeholder
 */
export const DynamicCategoryPieChart = dynamic(
  () => import('./CategoryPieChart').then((mod) => mod.CategoryPieChart),
  {
    loading: () => <PieChartSkeleton title="Doanh thu theo danh muc" />,
    ssr: false,
  }
)

/**
 * Dynamic Top Products Bar Chart
 * Lazy loaded with a bar chart skeleton placeholder
 */
export const DynamicTopProductsBarChart = dynamic(
  () => import('./TopProductsBarChart').then((mod) => mod.TopProductsBarChart),
  {
    loading: () => <BarChartSkeleton title="Top 10 san pham ban chay" />,
    ssr: false,
  }
)

/**
 * Dynamic Payment Methods Pie Chart
 * Lazy loaded with a pie chart skeleton placeholder
 */
export const DynamicPaymentMethodsPieChart = dynamic(
  () => import('./PaymentMethodsPieChart').then((mod) => mod.PaymentMethodsPieChart),
  {
    loading: () => <PieChartSkeleton title="Phuong thuc thanh toan" />,
    ssr: false,
  }
)

/**
 * Dynamic Revenue Expense Chart
 * Lazy loaded with a chart skeleton placeholder
 */
export const DynamicRevenueExpenseChart = dynamic(
  () => import('./RevenueExpenseChart').then((mod) => mod.RevenueExpenseChart),
  {
    loading: () => <ChartSkeleton height={320} title="Doanh thu va chi phi" />,
    ssr: false,
  }
)

const DynamicChartComponents = {
  DynamicSalesLineChart,
  DynamicCategoryPieChart,
  DynamicTopProductsBarChart,
  DynamicPaymentMethodsPieChart,
  DynamicRevenueExpenseChart,
}

// Re-export all dynamic charts
export default DynamicChartComponents
