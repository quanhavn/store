'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
  type ReactNode,
} from 'react'

// ============================================================================
// Types
// ============================================================================

interface UseIntersectionObserverOptions {
  /** Root element for intersection (default: viewport) */
  root?: Element | null
  /** Margin around root element */
  rootMargin?: string
  /** Visibility threshold(s) to trigger callback */
  threshold?: number | number[]
  /** Only trigger once when element becomes visible */
  triggerOnce?: boolean
  /** Skip observation (useful for conditional loading) */
  skip?: boolean
}

interface UseIntersectionObserverReturn {
  /** Ref to attach to the target element */
  ref: RefObject<HTMLDivElement>
  /** Whether the element is currently in view */
  isIntersecting: boolean
  /** The IntersectionObserverEntry (null before first intersection) */
  entry: IntersectionObserverEntry | null
}

interface LazyLoadContainerProps {
  /** Content to render when in view */
  children: ReactNode
  /** Placeholder to show before content loads */
  placeholder?: ReactNode
  /** Height of the placeholder (prevents layout shift) */
  minHeight?: number | string
  /** Root margin for intersection observer */
  rootMargin?: string
  /** CSS class for the container */
  className?: string
  /** Callback when element becomes visible */
  onVisible?: () => void
}

// ============================================================================
// Intersection Observer Hook
// ============================================================================

/**
 * Custom hook for using Intersection Observer
 *
 * Features:
 * - Lazy loads content when it enters the viewport
 * - Supports trigger-once mode for one-time loading
 * - Configurable root margin for early loading
 * - SSR-safe with proper cleanup
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { ref, isIntersecting } = useIntersectionObserver({
 *     triggerOnce: true,
 *     rootMargin: '100px', // Load 100px before visible
 *   })
 *
 *   return (
 *     <div ref={ref}>
 *       {isIntersecting ? <HeavyChart /> : <ChartSkeleton />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    skip = false,
  } = options

  const ref = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const frozen = useRef(false)

  useEffect(() => {
    // Skip if already triggered once or explicitly skipped
    if (skip || (triggerOnce && frozen.current)) {
      return
    }

    const element = ref.current
    if (!element) return

    // Check if IntersectionObserver is available (SSR safety)
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume visible
      setIsIntersecting(true)
      return
    }

    const observer = new IntersectionObserver(
      ([intersectionEntry]) => {
        const isCurrentlyIntersecting = intersectionEntry.isIntersecting

        setIsIntersecting(isCurrentlyIntersecting)
        setEntry(intersectionEntry)

        // Freeze if trigger once and now visible
        if (triggerOnce && isCurrentlyIntersecting) {
          frozen.current = true
          observer.disconnect()
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [root, rootMargin, threshold, triggerOnce, skip])

  return { ref, isIntersecting, entry }
}

// ============================================================================
// Lazy Load Container Component
// ============================================================================

/**
 * LazyLoadContainer Component
 *
 * A wrapper component that defers rendering of children until
 * the container enters the viewport. Perfect for below-the-fold
 * content like charts and heavy components.
 *
 * Features:
 * - Renders placeholder until visible
 * - Prevents layout shift with minHeight
 * - Configurable visibility trigger point
 * - One-time loading (doesn't unload when scrolled away)
 *
 * @example
 * ```tsx
 * <LazyLoadContainer
 *   placeholder={<ChartSkeleton />}
 *   minHeight={300}
 *   rootMargin="50px"
 * >
 *   <SalesChart data={data} />
 * </LazyLoadContainer>
 * ```
 */
export function LazyLoadContainer({
  children,
  placeholder,
  minHeight = 200,
  rootMargin = '50px',
  className = '',
  onVisible,
}: LazyLoadContainerProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    triggerOnce: true,
    rootMargin,
  })

  // Call onVisible callback when element becomes visible
  useEffect(() => {
    if (isIntersecting && onVisible) {
      onVisible()
    }
  }, [isIntersecting, onVisible])

  const containerStyle = !isIntersecting
    ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }
    : undefined

  return (
    <div ref={ref} className={className} style={containerStyle}>
      {isIntersecting ? children : placeholder}
    </div>
  )
}

// ============================================================================
// Lazy Load Hooks for Charts
// ============================================================================

/**
 * Hook for lazy loading chart components
 *
 * @param options - Intersection observer options
 * @returns Object with ref, visibility state, and render helper
 *
 * @example
 * ```tsx
 * function ReportsPage() {
 *   const chart1 = useLazyChart()
 *   const chart2 = useLazyChart()
 *
 *   return (
 *     <div>
 *       <div ref={chart1.ref}>
 *         {chart1.shouldRender ? <SalesChart /> : <ChartSkeleton />}
 *       </div>
 *       <div ref={chart2.ref}>
 *         {chart2.shouldRender ? <CategoryChart /> : <ChartSkeleton />}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useLazyChart(
  options: Omit<UseIntersectionObserverOptions, 'triggerOnce'> = {}
) {
  const { ref, isIntersecting } = useIntersectionObserver({
    ...options,
    triggerOnce: true,
    rootMargin: options.rootMargin || '100px', // Pre-load 100px before visible
  })

  return {
    ref,
    shouldRender: isIntersecting,
    isVisible: isIntersecting,
  }
}

// ============================================================================
// Deferred Script Loading
// ============================================================================

/**
 * Load a script dynamically with defer behavior
 *
 * @param src - Script URL
 * @param options - Load options
 * @returns Promise that resolves when script loads
 *
 * @example
 * ```ts
 * // Load analytics script after user interaction
 * document.addEventListener('click', () => {
 *   loadScript('https://analytics.example.com/script.js', { defer: true })
 * }, { once: true })
 * ```
 */
export function loadScript(
  src: string,
  options: {
    defer?: boolean
    async?: boolean
    id?: string
    onLoad?: () => void
    onError?: (error: Error) => void
  } = {}
): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (options.id && document.getElementById(options.id)) {
      resolve(document.getElementById(options.id) as HTMLScriptElement)
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.defer = options.defer ?? true
    script.async = options.async ?? false

    if (options.id) {
      script.id = options.id
    }

    script.onload = () => {
      options.onLoad?.()
      resolve(script)
    }

    script.onerror = () => {
      const error = new Error(`Failed to load script: ${src}`)
      options.onError?.(error)
      reject(error)
    }

    document.body.appendChild(script)
  })
}

/**
 * Load a script when the user interacts with the page
 *
 * This is useful for non-critical scripts that don't need to
 * load immediately (e.g., analytics, chat widgets).
 *
 * @param src - Script URL
 * @param options - Load options
 *
 * @example
 * ```tsx
 * // In a client component
 * useEffect(() => {
 *   loadScriptOnInteraction('https://chat.example.com/widget.js')
 * }, [])
 * ```
 */
export function loadScriptOnInteraction(
  src: string,
  options: Parameters<typeof loadScript>[1] = {}
): void {
  if (typeof window === 'undefined') return

  const events = ['mousedown', 'touchstart', 'keydown', 'scroll']
  let loaded = false

  const handleInteraction = () => {
    if (loaded) return
    loaded = true

    // Remove all listeners
    events.forEach((event) => {
      document.removeEventListener(event, handleInteraction)
    })

    // Load the script
    loadScript(src, options)
  }

  // Add listeners for first interaction
  events.forEach((event) => {
    document.addEventListener(event, handleInteraction, {
      once: true,
      passive: true,
    })
  })
}

// ============================================================================
// Idle Callback Utilities
// ============================================================================

/**
 * Run a callback when the browser is idle
 *
 * Falls back to setTimeout if requestIdleCallback is not available.
 *
 * @param callback - Function to run when idle
 * @param options - Options including timeout
 * @returns Cancel function
 *
 * @example
 * ```ts
 * // Prefetch data when idle
 * const cancel = runWhenIdle(() => {
 *   prefetchNextPageData()
 * }, { timeout: 2000 })
 *
 * // Cancel if needed
 * cancel()
 * ```
 */
export function runWhenIdle(
  callback: () => void,
  options: { timeout?: number } = {}
): () => void {
  const { timeout = 5000 } = options

  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(id)
  }

  // Fallback to setTimeout
  const id = setTimeout(callback, 1)
  return () => clearTimeout(id)
}

/**
 * Hook to run code when the browser is idle
 *
 * @param callback - Function to run when idle
 * @param deps - Dependency array
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useIdleCallback(() => {
 *     // Prefetch or precompute something
 *     prefetchRelatedProducts()
 *   }, [productId])
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useIdleCallback(
  callback: () => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const cancel = runWhenIdle(() => {
      callbackRef.current()
    })

    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ============================================================================
// Prefetch Utilities
// ============================================================================

/**
 * Prefetch a URL when the browser is idle
 *
 * @param url - URL to prefetch
 *
 * @example
 * ```ts
 * // Prefetch next page when idle
 * prefetchWhenIdle('/products/popular')
 * ```
 */
export function prefetchWhenIdle(url: string): void {
  runWhenIdle(() => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  })
}

const lazyLoadUtils = {
  useIntersectionObserver,
  LazyLoadContainer,
  useLazyChart,
  loadScript,
  loadScriptOnInteraction,
  runWhenIdle,
  useIdleCallback,
  prefetchWhenIdle,
}

// ============================================================================
// Exports
// ============================================================================

export default lazyLoadUtils
