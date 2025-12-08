'use client'

import { ReactNode } from 'react'
import { LazyLoadContainer, useLazyChart } from '@/lib/performance/lazy-load'
import {
  LineChartSkeleton,
  PieChartSkeleton,
  BarChartSkeleton,
  ChartSkeleton,
} from '@/components/ui/Skeletons'
import { useTranslations } from 'next-intl'

// ============================================================================
// Types
// ============================================================================

interface LazyChartWrapperProps {
  /** The chart component to render */
  children: ReactNode
  /** Type of chart for appropriate skeleton */
  type?: 'line' | 'pie' | 'bar' | 'generic'
  /** Title for the skeleton */
  title?: string
  /** Minimum height to prevent layout shift */
  minHeight?: number
  /** Root margin for intersection observer */
  rootMargin?: string
  /** Additional CSS class */
  className?: string
}

// ============================================================================
// Skeleton Map
// ============================================================================

const skeletonMap = {
  line: (title?: string) => <LineChartSkeleton title={title} />,
  pie: (title?: string) => <PieChartSkeleton title={title} />,
  bar: (title?: string) => <BarChartSkeleton title={title} />,
  generic: (title?: string) => <ChartSkeleton title={title} />,
}

// ============================================================================
// LazyChartWrapper Component
// ============================================================================

/**
 * LazyChartWrapper Component
 *
 * Wraps chart components with lazy loading behavior using
 * Intersection Observer. Charts are only rendered when they
 * enter the viewport, improving initial page load performance.
 *
 * Features:
 * - Deferred rendering until visible
 * - Type-specific loading skeletons
 * - Prevents layout shift with min-height
 * - Pre-loads 100px before entering viewport
 *
 * @example
 * ```tsx
 * <LazyChartWrapper type="line" title="Doanh thu theo ngay">
 *   <SalesLineChart data={salesData} />
 * </LazyChartWrapper>
 *
 * <LazyChartWrapper type="pie" title="Danh muc">
 *   <CategoryPieChart data={categoryData} />
 * </LazyChartWrapper>
 * ```
 */
export function LazyChartWrapper({
  children,
  type = 'generic',
  title,
  minHeight = 300,
  rootMargin = '100px',
  className = '',
}: LazyChartWrapperProps) {
  const skeleton = skeletonMap[type](title)

  return (
    <LazyLoadContainer
      placeholder={skeleton}
      minHeight={minHeight}
      rootMargin={rootMargin}
      className={className}
    >
      {children}
    </LazyLoadContainer>
  )
}

// ============================================================================
// Specific Chart Wrappers
// ============================================================================

/**
 * LazySalesLineChart Wrapper
 */
export function LazySalesLineChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('reports')

  return (
    <LazyChartWrapper
      type="line"
      title={`${t('revenue')} - ${t('daily')} (30)`}
      minHeight={300}
      className={className}
    >
      {children}
    </LazyChartWrapper>
  )
}

/**
 * LazyCategoryPieChart Wrapper
 */
export function LazyCategoryPieChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  return (
    <LazyChartWrapper
      type="pie"
      title={`${t('revenue')} - ${tCommon('category')}`}
      minHeight={320}
      className={className}
    >
      {children}
    </LazyChartWrapper>
  )
}

/**
 * LazyTopProductsBarChart Wrapper
 */
export function LazyTopProductsBarChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const tProducts = useTranslations('products')

  return (
    <LazyChartWrapper
      type="bar"
      title={`Top 10 ${tProducts('title')}`}
      minHeight={360}
      className={className}
    >
      {children}
    </LazyChartWrapper>
  )
}

/**
 * LazyPaymentMethodsPieChart Wrapper
 */
export function LazyPaymentMethodsPieChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('pos')

  return (
    <LazyChartWrapper
      type="pie"
      title={t('paymentMethod')}
      minHeight={320}
      className={className}
    >
      {children}
    </LazyChartWrapper>
  )
}

/**
 * LazyRevenueExpenseChart Wrapper
 */
export function LazyRevenueExpenseChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('reports')
  const tFinance = useTranslations('finance')

  return (
    <LazyChartWrapper
      type="generic"
      title={`${t('revenue')} vs ${tFinance('expense')}`}
      minHeight={360}
      className={className}
    >
      {children}
    </LazyChartWrapper>
  )
}

// ============================================================================
// Hook-based Lazy Loading
// ============================================================================

/**
 * Hook for manual lazy chart rendering control
 *
 * Use this when you need more control over the rendering logic.
 *
 * @example
 * ```tsx
 * function ReportsPage() {
 *   const salesChart = useLazyChartRender()
 *   const categoryChart = useLazyChartRender()
 *
 *   return (
 *     <div>
 *       <div ref={salesChart.ref}>
 *         {salesChart.shouldRender ? (
 *           <SalesLineChart data={data} />
 *         ) : (
 *           <LineChartSkeleton title="Doanh thu" />
 *         )}
 *       </div>
 *       <div ref={categoryChart.ref}>
 *         {categoryChart.shouldRender ? (
 *           <CategoryPieChart data={data} />
 *         ) : (
 *           <PieChartSkeleton title="Danh muc" />
 *         )}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useLazyChartRender(rootMargin = '100px') {
  return useLazyChart({ rootMargin })
}

const LazyChartComponents = {
  LazyChartWrapper,
  LazySalesLineChart,
  LazyCategoryPieChart,
  LazyTopProductsBarChart,
  LazyPaymentMethodsPieChart,
  LazyRevenueExpenseChart,
  useLazyChartRender,
}

// ============================================================================
// Exports
// ============================================================================

export default LazyChartComponents
