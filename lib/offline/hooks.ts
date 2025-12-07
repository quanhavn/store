'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCachedProducts,
  getCachedCategories,
  syncProducts,
  syncCategories,
  getPendingSalesCount,
  getSyncStatus,
  performFullSync,
  type SyncStatus,
  type FullSyncResult,
} from './sync'
import type { CachedProduct, CachedCategory } from './db'

// ============================================
// Online Status Hook
// ============================================

/**
 * Hook to detect online/offline state
 * Uses navigator.onLine and listens for online/offline events
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// ============================================
// Pending Sales Count Hook
// ============================================

/**
 * Hook to get and track pending sales count
 */
export function usePendingSalesCount(): {
  count: number
  refresh: () => Promise<void>
} {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const pendingCount = await getPendingSalesCount()
      setCount(pendingCount)
    } catch (error) {
      console.error('Error fetching pending sales count:', error)
    }
  }, [])

  useEffect(() => {
    refresh()

    // Poll for updates every 5 seconds
    const interval = setInterval(refresh, 5000)

    return () => clearInterval(interval)
  }, [refresh])

  return { count, refresh }
}

// ============================================
// Products Cache Hook
// ============================================

interface UseProductsCacheOptions {
  search?: string
  categoryId?: string
  autoRefresh?: boolean
}

interface UseProductsCacheResult {
  products: CachedProduct[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  syncFromServer: () => Promise<{ success: boolean; count: number; error?: string }>
}

/**
 * Hook to get products from cache with optional filtering
 */
export function useProductsCache(options: UseProductsCacheOptions = {}): UseProductsCacheResult {
  const { search, categoryId, autoRefresh = true } = options
  const [products, setProducts] = useState<CachedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const cachedProducts = await getCachedProducts(search, categoryId)
      setProducts(cachedProducts)
    } catch (err) {
      console.error('Error fetching cached products:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId])

  const syncFromServer = useCallback(async () => {
    const result = await syncProducts()
    if (result.success) {
      await refresh()
    }
    return result
  }, [refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when coming back online
  const isOnline = useOnlineStatus()
  useEffect(() => {
    if (isOnline && autoRefresh) {
      syncFromServer()
    }
  }, [isOnline, autoRefresh, syncFromServer])

  return { products, loading, error, refresh, syncFromServer }
}

// ============================================
// Categories Cache Hook
// ============================================

interface UseCategoriesCacheResult {
  categories: CachedCategory[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  syncFromServer: () => Promise<{ success: boolean; count: number; error?: string }>
}

/**
 * Hook to get categories from cache
 */
export function useCategoriesCache(): UseCategoriesCacheResult {
  const [categories, setCategories] = useState<CachedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const cachedCategories = await getCachedCategories()
      setCategories(cachedCategories)
    } catch (err) {
      console.error('Error fetching cached categories:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const syncFromServer = useCallback(async () => {
    const result = await syncCategories()
    if (result.success) {
      await refresh()
    }
    return result
  }, [refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when coming back online
  const isOnline = useOnlineStatus()
  useEffect(() => {
    if (isOnline) {
      syncFromServer()
    }
  }, [isOnline, syncFromServer])

  return { categories, loading, error, refresh, syncFromServer }
}

// ============================================
// Sync Status Hook
// ============================================

interface UseSyncStatusResult {
  status: SyncStatus
  loading: boolean
  refresh: () => Promise<void>
  performSync: () => Promise<FullSyncResult>
}

/**
 * Hook to get and track sync status
 */
export function useSyncStatus(): UseSyncStatusResult {
  const isOnline = useOnlineStatus()
  const [status, setStatus] = useState<SyncStatus>({
    pendingSalesCount: 0,
    failedSyncCount: 0,
    lastProductsSync: null,
    lastCategoriesSync: null,
    isOnline: true,
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const syncStatus = await getSyncStatus()
      setStatus({ ...syncStatus, isOnline })
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      setLoading(false)
    }
  }, [isOnline])

  const performSync = useCallback(async () => {
    const result = await performFullSync()
    await refresh()
    return result
  }, [refresh])

  useEffect(() => {
    refresh()

    // Poll for updates every 10 seconds
    const interval = setInterval(refresh, 10000)

    return () => clearInterval(interval)
  }, [refresh])

  // Update online status immediately
  useEffect(() => {
    setStatus((prev) => ({ ...prev, isOnline }))
  }, [isOnline])

  return { status, loading, refresh, performSync }
}

// ============================================
// Auto-Sync Hook
// ============================================

interface UseAutoSyncOptions {
  enabled?: boolean
  onSyncComplete?: (result: FullSyncResult) => void
  onError?: (error: Error) => void
}

/**
 * Hook that automatically syncs when coming back online
 */
export function useAutoSync(options: UseAutoSyncOptions = {}): {
  syncing: boolean
  lastSyncResult: FullSyncResult | null
  triggerSync: () => Promise<void>
} {
  const { enabled = true, onSyncComplete, onError } = options
  const isOnline = useOnlineStatus()
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<FullSyncResult | null>(null)
  const [wasOffline, setWasOffline] = useState(false)

  const triggerSync = useCallback(async () => {
    if (syncing) return

    try {
      setSyncing(true)
      const result = await performFullSync()
      setLastSyncResult(result)
      onSyncComplete?.(result)
    } catch (error) {
      console.error('Auto-sync error:', error)
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setSyncing(false)
    }
  }, [syncing, onSyncComplete, onError])

  // Track offline state
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    }
  }, [isOnline])

  // Auto-sync when coming back online
  useEffect(() => {
    if (enabled && isOnline && wasOffline) {
      setWasOffline(false)
      triggerSync()
    }
  }, [enabled, isOnline, wasOffline, triggerSync])

  return { syncing, lastSyncResult, triggerSync }
}
