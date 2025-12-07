'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useOnlineStatus } from '@/lib/offline/hooks'
import {
  queueInvoiceCreation,
  syncPendingInvoices,
  getPendingInvoiceCount,
  getInvoiceDrafts,
  getInvoiceSyncQueueItems,
  retryFailedInvoice,
  removeInvoiceFromQueue,
  type InvoiceSyncResult,
} from '@/lib/offline/invoice-sync'
import type { BuyerInfo, InvoiceDraft, InvoiceSyncQueueItem } from '@/lib/offline/db'

interface CreateInvoiceParams {
  saleId: string
  buyerInfo: BuyerInfo
}

interface Invoice {
  id: string
  sale_id: string
  invoice_no: string | null
  invoice_symbol: string | null
  issue_date: string | null
  status: string | null
  provider: string | null
  created_at: string | null
  sales?: {
    invoice_no: string
    customer_name: string | null
    total: number
  }
}

export function useCreateInvoice() {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ saleId, buyerInfo }: CreateInvoiceParams) => {
      if (!isOnline) {
        const draft = await queueInvoiceCreation(saleId, buyerInfo)
        return { offline: true, draft }
      }

      const response = await supabase.functions.invoke('invoice', {
        body: {
          action: 'create',
          sale_id: saleId,
          buyer_name: buyerInfo.name,
          buyer_tax_code: buyerInfo.taxCode,
          buyer_address: buyerInfo.address,
          buyer_email: buyerInfo.email,
          buyer_phone: buyerInfo.phone,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const data = response.data as { error?: string; invoice?: Invoice }
      if (data?.error) {
        throw new Error(data.error)
      }

      return { offline: false, invoice: data.invoice }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-sync-queue'] })
    },
  })
}

export function useInvoiceList(storeId: string) {
  const supabase = createClient()

  const apiQuery = useQuery({
    queryKey: ['invoices', storeId],
    queryFn: async () => {
      const response = await supabase.functions.invoke('invoice', {
        body: {
          action: 'list',
          page: 1,
          limit: 100,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const data = response.data as { invoices?: Invoice[] }
      return data.invoices || []
    },
    enabled: !!storeId,
  })

  const draftsQuery = useQuery({
    queryKey: ['invoice-drafts'],
    queryFn: getInvoiceDrafts,
  })

  const invoices = apiQuery.data || []
  const drafts = draftsQuery.data || []

  const pendingDrafts = drafts.filter(
    (draft) => !invoices.some((inv) => inv.sale_id === draft.saleId)
  )

  return {
    invoices,
    pendingDrafts,
    isLoading: apiQuery.isLoading,
    error: apiQuery.error,
    refetch: () => {
      apiQuery.refetch()
      draftsQuery.refetch()
    },
  }
}

export function useInvoiceSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [queueItems, setQueueItems] = useState<InvoiceSyncQueueItem[]>([])

  const refresh = useCallback(async () => {
    const [count, items] = await Promise.all([
      getPendingInvoiceCount(),
      getInvoiceSyncQueueItems(),
    ])
    setPendingCount(count)
    setQueueItems(items)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  return {
    pendingCount,
    queueItems,
    refresh,
  }
}

interface UseSyncInvoicesOptions {
  onSyncComplete?: (result: InvoiceSyncResult) => void
  onError?: (error: Error) => void
  autoSyncOnOnline?: boolean
}

export function useSyncInvoices(options: UseSyncInvoicesOptions = {}) {
  const { onSyncComplete, onError, autoSyncOnOnline = true } = options
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<InvoiceSyncResult | null>(null)
  const wasOfflineRef = useRef(false)

  const triggerSync = useCallback(async () => {
    if (syncing || !isOnline) return

    try {
      setSyncing(true)
      const result = await syncPendingInvoices()
      setLastResult(result)
      onSyncComplete?.(result)

      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-sync-queue'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-drafts'] })
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setSyncing(false)
    }
  }, [syncing, isOnline, onSyncComplete, onError, queryClient])

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
    }
  }, [isOnline])

  useEffect(() => {
    if (autoSyncOnOnline && isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false
      triggerSync()
    }
  }, [autoSyncOnOnline, isOnline, triggerSync])

  const retryItem = useCallback(
    async (queueItemId: string) => {
      await retryFailedInvoice(queueItemId)
      await triggerSync()
    },
    [triggerSync]
  )

  const removeItem = useCallback(
    async (queueItemId: string) => {
      await removeInvoiceFromQueue(queueItemId)
      queryClient.invalidateQueries({ queryKey: ['invoice-sync-queue'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-drafts'] })
    },
    [queryClient]
  )

  return {
    syncing,
    lastResult,
    triggerSync,
    retryItem,
    removeItem,
    isOnline,
  }
}

export function useInvoiceAutoSync(options: Omit<UseSyncInvoicesOptions, 'autoSyncOnOnline'> = {}) {
  return useSyncInvoices({ ...options, autoSyncOnOnline: true })
}
