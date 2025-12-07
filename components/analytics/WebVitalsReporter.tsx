'use client'

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'
import { reportWebVitals as sendMetrics, type WebVitalsMetric } from '@/lib/performance'

/**
 * WebVitalsReporter Component
 *
 * A client component that reports Core Web Vitals metrics.
 * Should be placed once in the app layout.
 *
 * Metrics reported:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { WebVitalsReporter } from '@/components/analytics/WebVitalsReporter'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <WebVitalsReporter />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Cast to our extended type
    const webVitalMetric: WebVitalsMetric = {
      id: metric.id,
      name: metric.name as WebVitalsMetric['name'],
      value: metric.value,
      rating: metric.rating as WebVitalsMetric['rating'],
      delta: metric.delta,
      entries: metric.entries,
      navigationType: metric.navigationType as WebVitalsMetric['navigationType'],
    }

    sendMetrics(webVitalMetric)
  })

  return null
}

export default WebVitalsReporter
