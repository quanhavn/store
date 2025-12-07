'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * Optimized React Query Provider
 *
 * Performance optimizations:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 *   This reduces unnecessary refetches and API calls
 * - gcTime (garbage collection time, formerly cacheTime): 10 minutes
 *   Unused data is kept in memory for 10 minutes before being garbage collected
 * - refetchOnWindowFocus: false - Prevents refetch when user returns to tab
 *   This saves bandwidth and reduces server load
 * - retry: 1 - Only retry failed requests once
 *   Faster failure feedback for users, reduces load on failing services
 *
 * These settings are optimized for a retail/POS application where:
 * - Data doesn't change frequently (products, categories)
 * - Users may switch between apps frequently
 * - Network connectivity may be unreliable
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            // Reduces API calls for frequently accessed data
            staleTime: 5 * 60 * 1000, // 5 minutes

            // Unused data is garbage collected after 10 minutes
            // Provides good cache hit rate while managing memory
            gcTime: 10 * 60 * 1000, // 10 minutes

            // Don't refetch when window regains focus
            // Saves bandwidth, especially important for mobile/PWA
            refetchOnWindowFocus: false,

            // Only retry failed requests once
            // Faster error feedback for users
            retry: 1,

            // Don't refetch on reconnect by default
            // The app handles offline mode separately
            refetchOnReconnect: false,

            // Prevent refetch on mount if data is fresh
            refetchOnMount: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
