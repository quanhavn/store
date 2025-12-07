'use client'

import { Skeleton } from 'antd'

/**
 * Chart Loading Skeleton
 * Used as a loading placeholder for chart components
 */
export function ChartSkeleton({
  height = 256,
  title,
}: {
  height?: number
  title?: string
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {title ? (
        <div className="text-base font-semibold text-gray-700 mb-4">{title}</div>
      ) : (
        <Skeleton.Input active className="w-32 mb-4" />
      )}
      <div style={{ height }} className="flex items-center justify-center">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    </div>
  )
}

/**
 * Pie Chart Loading Skeleton
 * Specific skeleton for pie charts with circular placeholder
 */
export function PieChartSkeleton({ title }: { title?: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {title ? (
        <div className="text-base font-semibold text-gray-700 mb-4">{title}</div>
      ) : (
        <Skeleton.Input active className="w-32 mb-4" />
      )}
      <div className="flex justify-center py-4">
        <Skeleton.Avatar active size={180} shape="circle" />
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <Skeleton.Button active size="small" />
        <Skeleton.Button active size="small" />
        <Skeleton.Button active size="small" />
      </div>
    </div>
  )
}

/**
 * Bar Chart Loading Skeleton
 * Specific skeleton for bar charts
 */
export function BarChartSkeleton({ title }: { title?: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {title ? (
        <div className="text-base font-semibold text-gray-700 mb-4">{title}</div>
      ) : (
        <Skeleton.Input active className="w-40 mb-4" />
      )}
      <div className="h-80">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    </div>
  )
}

/**
 * Line Chart Loading Skeleton
 * Specific skeleton for line charts
 */
export function LineChartSkeleton({ title }: { title?: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {title ? (
        <div className="text-base font-semibold text-gray-700 mb-4">{title}</div>
      ) : (
        <Skeleton.Input active className="w-32 mb-4" />
      )}
      <div className="h-64">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    </div>
  )
}

/**
 * Receipt Loading Skeleton
 * Used as a loading placeholder for receipt components
 */
export function ReceiptSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm max-w-sm mx-auto">
      {/* Store header */}
      <div className="text-center mb-4">
        <Skeleton.Input active className="w-32 mb-2" />
        <Skeleton.Input active size="small" className="w-48" />
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Invoice info */}
      <div className="space-y-2 mb-4">
        <Skeleton.Input active size="small" className="w-24" />
        <Skeleton.Input active size="small" className="w-36" />
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton.Input active size="small" className="w-32" />
            <Skeleton.Input active size="small" className="w-16" />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Total */}
      <div className="flex justify-between mb-4">
        <Skeleton.Input active className="w-24" />
        <Skeleton.Input active className="w-20" />
      </div>

      {/* Footer */}
      <div className="text-center">
        <Skeleton.Input active size="small" className="w-32" />
      </div>
    </div>
  )
}

/**
 * Barcode Scanner Loading Skeleton
 * Used as a loading placeholder for barcode scanner
 */
export function BarcodeScannerSkeleton() {
  return (
    <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full" />
          <Skeleton.Input active className="w-32" />
        </div>
      </div>
    </div>
  )
}

/**
 * Generic Card Loading Skeleton
 */
export function CardSkeleton({
  rows = 3,
  hasAvatar = false,
}: {
  rows?: number
  hasAvatar?: boolean
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <Skeleton active avatar={hasAvatar} paragraph={{ rows }} />
    </div>
  )
}

/**
 * Dashboard Widget Loading Skeleton
 */
export function DashboardWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton.Input active className="w-24" />
        <Skeleton.Avatar active size="small" />
      </div>
      <Skeleton.Input active size="large" className="w-32 mb-2" />
      <Skeleton.Input active size="small" className="w-20" />
    </div>
  )
}

const SkeletonComponents = {
  ChartSkeleton,
  PieChartSkeleton,
  BarChartSkeleton,
  LineChartSkeleton,
  ReceiptSkeleton,
  BarcodeScannerSkeleton,
  CardSkeleton,
  DashboardWidgetSkeleton,
}

export default SkeletonComponents
