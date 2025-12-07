import Dexie, { Table } from 'dexie'
import type { CartItem } from '@/lib/stores/cart'
import type { PaymentInfo } from '@/components/pos/PaymentMethods'

// Cached product for offline POS
export interface CachedProduct {
  id: string
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  sell_price: number
  vat_rate: number
  quantity: number
  image_url?: string
  updated_at: string
}

// Cached category for offline filtering
export interface CachedCategory {
  id: string
  name: string
  sort_order?: number
}

// Customer info for pending sales
export interface CustomerInfo {
  name?: string
  phone?: string
  tax_code?: string
}

// Pending sale to be synced when online
export interface PendingSale {
  id: string
  items: CartItem[]
  customer?: CustomerInfo
  payments: PaymentInfo[]
  subtotal: number
  vat_amount: number
  discount: number
  total: number
  note?: string
  created_at: string
  synced: boolean
}

// Sync queue item for tracking sync operations
export interface SyncQueueItem {
  id: string
  action: 'create_sale' | 'update_product' | 'other'
  payload: unknown
  status: 'pending' | 'syncing' | 'failed'
  retries: number
  created_at: string
  error?: string
}

// Sync metadata for tracking sync state
export interface SyncMeta {
  key: string
  value: string
}

// Buyer info for e-invoice
export interface BuyerInfo {
  name?: string
  taxCode?: string
  address?: string
  email?: string
  phone?: string
}

// Invoice draft for offline creation
export interface InvoiceDraft {
  id: string
  saleId: string
  buyerInfo: BuyerInfo
  status: 'pending' | 'synced' | 'failed'
  createdAt: string
}

// Invoice sync queue item
export interface InvoiceSyncQueueItem {
  id: string
  saleId: string
  action: 'create' | 'cancel'
  payload: {
    buyerInfo?: BuyerInfo
    reason?: string
    invoiceId?: string
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: string
  processedAt?: string
}

class StoreManagementDB extends Dexie {
  products!: Table<CachedProduct>
  categories!: Table<CachedCategory>
  pendingSales!: Table<PendingSale>
  syncQueue!: Table<SyncQueueItem>
  syncMeta!: Table<SyncMeta>
  invoiceDrafts!: Table<InvoiceDraft>
  invoiceSyncQueue!: Table<InvoiceSyncQueueItem>

  constructor() {
    super('StoreManagementDB')

    this.version(1).stores({
      products: 'id, name, sku, barcode, category_id, updated_at',
      categories: 'id, name, sort_order',
      pendingSales: 'id, synced, created_at',
      syncQueue: 'id, action, status, created_at',
      syncMeta: 'key',
    })

    this.version(2).stores({
      products: 'id, name, sku, barcode, category_id, updated_at',
      categories: 'id, name, sort_order',
      pendingSales: 'id, synced, created_at',
      syncQueue: 'id, action, status, created_at',
      syncMeta: 'key',
      invoiceDrafts: 'id, saleId, status, createdAt',
      invoiceSyncQueue: 'id, saleId, action, status, createdAt',
    })
  }
}

// Singleton database instance
export const db = new StoreManagementDB()

// Helper function to generate unique IDs for offline records
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Helper to clear all offline data (e.g., on logout)
export async function clearOfflineData(): Promise<void> {
  await db.transaction('rw', [db.products, db.categories, db.pendingSales, db.syncQueue, db.syncMeta, db.invoiceDrafts, db.invoiceSyncQueue], async () => {
    await db.products.clear()
    await db.categories.clear()
    await db.pendingSales.clear()
    await db.syncQueue.clear()
    await db.syncMeta.clear()
    await db.invoiceDrafts.clear()
    await db.invoiceSyncQueue.clear()
  })
}

// Helper to check if database is available
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.syncMeta.count()
    return true
  } catch {
    return false
  }
}
