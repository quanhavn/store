/**
 * Performance Utilities
 *
 * A collection of utilities for measuring and reporting performance metrics.
 * These utilities help identify bottlenecks and optimize the application.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Web Vitals metric interface (compatible with Next.js)
 */
export interface WebVitalsMetric {
  id: string
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  entries: PerformanceEntry[]
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender'
}

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  name: string
  startTime: number
  duration: number
  timestamp: number
}

/**
 * Performance thresholds for web vitals
 */
export const WEB_VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Measure the performance of a synchronous operation
 *
 * @param name - Name of the measurement (for identification)
 * @param fn - Function to measure
 * @returns The result of the function
 *
 * @example
 * ```ts
 * const result = measureSync('heavy-calculation', () => {
 *   return calculateSomething()
 * })
 * ```
 */
export function measureSync<T>(name: string, fn: () => T): T {
  if (typeof performance === 'undefined') {
    return fn()
  }

  const startMark = `${name}-start`
  const endMark = `${name}-end`

  performance.mark(startMark)
  const result = fn()
  performance.mark(endMark)

  try {
    performance.measure(name, startMark, endMark)
    const measure = performance.getEntriesByName(name, 'measure')[0]

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${measure?.duration?.toFixed(2)}ms`)
    }

    // Clean up marks
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(name)
  } catch {
    // Ignore measurement errors
  }

  return result
}

/**
 * Measure the performance of an asynchronous operation
 *
 * @param name - Name of the measurement (for identification)
 * @param fn - Async function to measure
 * @returns Promise resolving to the result of the function
 *
 * @example
 * ```ts
 * const data = await measureAsync('fetch-products', async () => {
 *   return await fetchProducts()
 * })
 * ```
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof performance === 'undefined') {
    return fn()
  }

  const startMark = `${name}-start`
  const endMark = `${name}-end`

  performance.mark(startMark)
  const result = await fn()
  performance.mark(endMark)

  try {
    performance.measure(name, startMark, endMark)
    const measure = performance.getEntriesByName(name, 'measure')[0]

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${measure?.duration?.toFixed(2)}ms`)
    }

    // Clean up marks
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(name)
  } catch {
    // Ignore measurement errors
  }

  return result
}

/**
 * Create a performance measurement wrapper
 *
 * @param name - Base name for measurements
 * @returns Object with start and end functions
 *
 * @example
 * ```ts
 * const perf = measurePerformance('component-render')
 * perf.start()
 * // ... do work ...
 * const duration = perf.end()
 * ```
 */
export function measurePerformance(name: string) {
  const startMark = `${name}-start`
  const endMark = `${name}-end`
  let startTime = 0

  return {
    start() {
      if (typeof performance !== 'undefined') {
        performance.mark(startMark)
        startTime = performance.now()
      }
    },

    end(): number {
      if (typeof performance === 'undefined') {
        return 0
      }

      performance.mark(endMark)
      const endTime = performance.now()
      const duration = endTime - startTime

      try {
        performance.measure(name, startMark, endMark)

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
        }

        // Clean up
        performance.clearMarks(startMark)
        performance.clearMarks(endMark)
        performance.clearMeasures(name)
      } catch {
        // Ignore errors
      }

      return duration
    },

    /**
     * Create a checkpoint within the measurement
     */
    checkpoint(checkpointName: string) {
      if (typeof performance !== 'undefined') {
        const elapsed = performance.now() - startTime
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${name}/${checkpointName}: ${elapsed.toFixed(2)}ms`)
        }
      }
    },
  }
}

// ============================================================================
// Web Vitals Reporting
// ============================================================================

/**
 * Get rating for a web vital metric
 */
function getRating(
  name: WebVitalsMetric['name'],
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name]
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Format web vitals metric for logging
 */
function formatMetric(metric: WebVitalsMetric): string {
  const rating = getRating(metric.name, metric.value)
  const emoji = rating === 'good' ? '✓' : rating === 'needs-improvement' ? '!' : '✗'
  const value =
    metric.name === 'CLS'
      ? metric.value.toFixed(3)
      : `${metric.value.toFixed(0)}ms`

  return `[${emoji}] ${metric.name}: ${value} (${rating})`
}

/**
 * Report Web Vitals metrics
 *
 * This function is designed to be used with Next.js's built-in
 * web vitals reporting. It logs metrics in development and can
 * send them to an analytics service in production.
 *
 * @param metric - Web Vitals metric from Next.js
 *
 * @example
 * ```ts
 * // In app/layout.tsx or a client component
 * export function reportWebVitals(metric: WebVitalsMetric) {
 *   reportWebVitals(metric)
 * }
 * ```
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', formatMetric(metric))
  }

  // In production, send to analytics
  // Uncomment and configure for your analytics service
  /*
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
  */

  // Send to custom analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      id: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    })

    // Use sendBeacon for reliability (works even on page unload)
    // Uncomment and configure endpoint when ready to collect metrics
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // navigator.sendBeacon('/api/analytics/vitals', body)
      void body // Suppress unused variable warning
    } else {
      // fetch('/api/analytics/vitals', {
      //   method: 'POST',
      //   body,
      //   keepalive: true,
      // })
      void body // Suppress unused variable warning
    }
  }
}

// ============================================================================
// Component Performance
// ============================================================================

/**
 * Log component render time (development only)
 *
 * @param componentName - Name of the component
 * @param startTime - Performance.now() value from component mount
 *
 * @example
 * ```ts
 * function MyComponent() {
 *   const startTime = performance.now()
 *
 *   useEffect(() => {
 *     logRenderTime('MyComponent', startTime)
 *   }, [])
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function logRenderTime(componentName: string, startTime: number): void {
  if (process.env.NODE_ENV !== 'development') return
  if (typeof performance === 'undefined') return

  const duration = performance.now() - startTime
  console.log(`[Render] ${componentName}: ${duration.toFixed(2)}ms`)
}

// ============================================================================
// Memory Monitoring
// ============================================================================

/**
 * Get current memory usage (if available)
 *
 * Note: Only works in Chromium-based browsers with the
 * performance.memory API enabled.
 *
 * @returns Memory info or null if not available
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usedMB: number
  percentUsed: number
} | null {
  if (typeof performance === 'undefined') return null

  const memory = (performance as Performance & {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }).memory

  if (!memory) return null

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    percentUsed: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
  }
}

/**
 * Log memory usage (development only)
 */
export function logMemoryUsage(label?: string): void {
  if (process.env.NODE_ENV !== 'development') return

  const memory = getMemoryUsage()
  if (!memory) return

  console.log(
    `[Memory${label ? ` - ${label}` : ''}] ${memory.usedMB}MB used (${memory.percentUsed}%)`
  )
}

// ============================================================================
// Resource Loading
// ============================================================================

/**
 * Get resource loading metrics
 *
 * @returns Array of resource timing entries with key metrics
 */
export function getResourceMetrics(): Array<{
  name: string
  type: string
  duration: number
  size: number
  protocol: string
}> {
  if (typeof performance === 'undefined') return []

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  return entries.map((entry) => ({
    name: entry.name,
    type: entry.initiatorType,
    duration: Math.round(entry.duration),
    size: entry.transferSize || 0,
    protocol: entry.nextHopProtocol || 'unknown',
  }))
}

/**
 * Log slow resources (development only)
 *
 * @param threshold - Minimum duration in ms to log (default: 1000ms)
 */
export function logSlowResources(threshold = 1000): void {
  if (process.env.NODE_ENV !== 'development') return

  const resources = getResourceMetrics().filter((r) => r.duration > threshold)

  if (resources.length === 0) return

  console.group('[Slow Resources]')
  resources.forEach((r) => {
    console.log(`${r.type}: ${r.name} - ${r.duration}ms`)
  })
  console.groupEnd()
}

// ============================================================================
// Navigation Timing
// ============================================================================

/**
 * Get navigation timing metrics
 *
 * @returns Navigation timing data or null
 */
export function getNavigationTiming(): {
  dns: number
  connection: number
  tls: number
  ttfb: number
  download: number
  domInteractive: number
  domComplete: number
  loadComplete: number
} | null {
  if (typeof performance === 'undefined') return null

  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  const nav = entries[0]

  if (!nav) return null

  return {
    dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
    connection: Math.round(nav.connectEnd - nav.connectStart),
    tls: Math.round(nav.requestStart - nav.secureConnectionStart),
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    download: Math.round(nav.responseEnd - nav.responseStart),
    domInteractive: Math.round(nav.domInteractive - nav.fetchStart),
    domComplete: Math.round(nav.domComplete - nav.fetchStart),
    loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart),
  }
}

/**
 * Log navigation timing (development only)
 */
export function logNavigationTiming(): void {
  if (process.env.NODE_ENV !== 'development') return

  // Wait for load to complete
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = getNavigationTiming()
        if (!timing) return

        console.group('[Navigation Timing]')
        console.log(`DNS: ${timing.dns}ms`)
        console.log(`Connection: ${timing.connection}ms`)
        console.log(`TLS: ${timing.tls}ms`)
        console.log(`TTFB: ${timing.ttfb}ms`)
        console.log(`Download: ${timing.download}ms`)
        console.log(`DOM Interactive: ${timing.domInteractive}ms`)
        console.log(`DOM Complete: ${timing.domComplete}ms`)
        console.log(`Load Complete: ${timing.loadComplete}ms`)
        console.groupEnd()
      }, 0)
    })
  }
}

const performanceUtils = {
  measureSync,
  measureAsync,
  measurePerformance,
  reportWebVitals,
  logRenderTime,
  getMemoryUsage,
  logMemoryUsage,
  getResourceMetrics,
  logSlowResources,
  getNavigationTiming,
  logNavigationTiming,
  WEB_VITALS_THRESHOLDS,
}

// ============================================================================
// Exports
// ============================================================================

export default performanceUtils
