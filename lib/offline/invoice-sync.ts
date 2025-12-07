import { createClient } from '@/lib/supabase/client'
import {
  db,
  generateOfflineId,
  type BuyerInfo,
  type InvoiceDraft,
  type InvoiceSyncQueueItem,
} from './db'

const MAX_RETRIES = 3

export interface InvoiceSyncResult {
  synced: number
  failed: number
  remaining: number
  errors: string[]
}

export async function queueInvoiceCreation(
  saleId: string,
  buyerInfo: BuyerInfo
): Promise<InvoiceDraft> {
  const id = generateOfflineId()
  const now = new Date().toISOString()

  const draft: InvoiceDraft = {
    id,
    saleId,
    buyerInfo,
    status: 'pending',
    createdAt: now,
  }

  const queueItem: InvoiceSyncQueueItem = {
    id: generateOfflineId(),
    saleId,
    action: 'create',
    payload: { buyerInfo },
    status: 'pending',
    retryCount: 0,
    createdAt: now,
  }

  await db.transaction('rw', [db.invoiceDrafts, db.invoiceSyncQueue], async () => {
    await db.invoiceDrafts.add(draft)
    await db.invoiceSyncQueue.add(queueItem)
  })

  return draft
}

export async function queueInvoiceCancellation(
  saleId: string,
  invoiceId: string,
  reason: string
): Promise<InvoiceSyncQueueItem> {
  const queueItem: InvoiceSyncQueueItem = {
    id: generateOfflineId(),
    saleId,
    action: 'cancel',
    payload: { invoiceId, reason },
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  }

  await db.invoiceSyncQueue.add(queueItem)
  return queueItem
}

export async function getPendingInvoiceCount(): Promise<number> {
  try {
    return await db.invoiceSyncQueue
      .where('status')
      .anyOf(['pending', 'processing'])
      .count()
  } catch {
    return 0
  }
}

export async function getInvoiceDrafts(): Promise<InvoiceDraft[]> {
  try {
    return await db.invoiceDrafts.where('status').equals('pending').toArray()
  } catch {
    return []
  }
}

export async function getInvoiceSyncQueueItems(): Promise<InvoiceSyncQueueItem[]> {
  try {
    return await db.invoiceSyncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray()
  } catch {
    return []
  }
}

export async function syncPendingInvoices(): Promise<InvoiceSyncResult> {
  const result: InvoiceSyncResult = {
    synced: 0,
    failed: 0,
    remaining: 0,
    errors: [],
  }

  try {
    const pendingItems = await db.invoiceSyncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter((item) => item.retryCount < MAX_RETRIES)
      .toArray()

    if (pendingItems.length === 0) {
      return result
    }

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      result.errors.push('Not authenticated')
      result.remaining = pendingItems.length
      return result
    }

    for (const item of pendingItems) {
      try {
        await db.invoiceSyncQueue.update(item.id, { status: 'processing' })

        if (item.action === 'create') {
          const response = await supabase.functions.invoke('invoice', {
            body: {
              action: 'create',
              sale_id: item.saleId,
              buyer_name: item.payload.buyerInfo?.name,
              buyer_tax_code: item.payload.buyerInfo?.taxCode,
              buyer_address: item.payload.buyerInfo?.address,
              buyer_email: item.payload.buyerInfo?.email,
              buyer_phone: item.payload.buyerInfo?.phone,
            },
          })

          if (response.error) {
            throw new Error(response.error.message)
          }

          const data = response.data as { error?: string }
          if (data?.error) {
            throw new Error(data.error)
          }

          await db.transaction('rw', [db.invoiceSyncQueue, db.invoiceDrafts], async () => {
            await db.invoiceSyncQueue.update(item.id, {
              status: 'completed',
              processedAt: new Date().toISOString(),
            })

            const draft = await db.invoiceDrafts.where('saleId').equals(item.saleId).first()
            if (draft) {
              await db.invoiceDrafts.update(draft.id, { status: 'synced' })
            }
          })

          result.synced++
        } else if (item.action === 'cancel') {
          const response = await supabase.functions.invoke('invoice', {
            body: {
              action: 'cancel',
              invoice_id: item.payload.invoiceId,
              reason: item.payload.reason,
            },
          })

          if (response.error) {
            throw new Error(response.error.message)
          }

          const data = response.data as { error?: string }
          if (data?.error) {
            throw new Error(data.error)
          }

          await db.invoiceSyncQueue.update(item.id, {
            status: 'completed',
            processedAt: new Date().toISOString(),
          })

          result.synced++
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Invoice ${item.saleId}: ${message}`)
        result.failed++

        const newRetryCount = item.retryCount + 1
        await db.invoiceSyncQueue.update(item.id, {
          status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
          retryCount: newRetryCount,
          lastError: message,
        })

        if (newRetryCount >= MAX_RETRIES) {
          const draft = await db.invoiceDrafts.where('saleId').equals(item.saleId).first()
          if (draft) {
            await db.invoiceDrafts.update(draft.id, { status: 'failed' })
          }
        }
      }
    }

    result.remaining = await db.invoiceSyncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter((item) => item.retryCount < MAX_RETRIES)
      .count()
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

export async function retryFailedInvoice(queueItemId: string): Promise<void> {
  await db.invoiceSyncQueue.update(queueItemId, {
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
  })
}

export async function removeInvoiceFromQueue(queueItemId: string): Promise<void> {
  const item = await db.invoiceSyncQueue.get(queueItemId)
  if (item) {
    await db.transaction('rw', [db.invoiceSyncQueue, db.invoiceDrafts], async () => {
      await db.invoiceSyncQueue.delete(queueItemId)
      const draft = await db.invoiceDrafts.where('saleId').equals(item.saleId).first()
      if (draft) {
        await db.invoiceDrafts.delete(draft.id)
      }
    })
  }
}
