import { createClient } from '@/lib/supabase/client'
import {
  db,
  generateOfflineId,
  type CachedProduct,
  type CachedCategory,
  type PendingSale,
  type SyncQueueItem,
  type CustomerInfo,
} from './db'
import type { CartItem } from '@/lib/stores/cart'
import type { PaymentInfo } from '@/components/pos/PaymentMethods'

const MAX_RETRIES = 3
const SYNC_META_KEYS = {
  LAST_PRODUCTS_SYNC: 'last_products_sync',
  LAST_CATEGORIES_SYNC: 'last_categories_sync',
}

// Type for product data from Supabase
interface SupabaseProduct {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  sell_price: number
  vat_rate: number | null
  quantity: number | null
  image_url: string | null
  updated_at: string | null
}

// Type for category data from Supabase
interface SupabaseCategory {
  id: string
  name: string
  sort_order: number | null
}

// Type for user data from Supabase
interface SupabaseUser {
  store_id: string | null
}

// ============================================
// Product Sync Functions
// ============================================

/**
 * Fetch all products from Supabase and cache them locally
 */
export async function syncProducts(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = createClient()

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, barcode, category_id, sell_price, vat_rate, quantity, image_url, updated_at')
      .eq('active', true)
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    if (!products) {
      return { success: true, count: 0 }
    }

    const typedProducts = products as SupabaseProduct[]

    // Clear existing products and insert new ones
    await db.transaction('rw', db.products, db.syncMeta, async () => {
      await db.products.clear()
      await db.products.bulkAdd(
        typedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || undefined,
          barcode: p.barcode || undefined,
          category_id: p.category_id || undefined,
          sell_price: p.sell_price,
          vat_rate: p.vat_rate ?? 0,
          quantity: p.quantity ?? 0,
          image_url: p.image_url || undefined,
          updated_at: p.updated_at || new Date().toISOString(),
        }))
      )

      // Update last sync timestamp
      await db.syncMeta.put({
        key: SYNC_META_KEYS.LAST_PRODUCTS_SYNC,
        value: new Date().toISOString(),
      })
    })

    return { success: true, count: typedProducts.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('syncProducts error:', message)
    return { success: false, count: 0, error: message }
  }
}

/**
 * Fetch all categories from Supabase and cache them locally
 */
export async function syncCategories(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = createClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, sort_order')
      .order('sort_order')
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    if (!categories) {
      return { success: true, count: 0 }
    }

    const typedCategories = categories as SupabaseCategory[]

    await db.transaction('rw', db.categories, db.syncMeta, async () => {
      await db.categories.clear()
      await db.categories.bulkAdd(
        typedCategories.map((c) => ({
          id: c.id,
          name: c.name,
          sort_order: c.sort_order ?? undefined,
        }))
      )

      await db.syncMeta.put({
        key: SYNC_META_KEYS.LAST_CATEGORIES_SYNC,
        value: new Date().toISOString(),
      })
    })

    return { success: true, count: typedCategories.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('syncCategories error:', message)
    return { success: false, count: 0, error: message }
  }
}

/**
 * Get cached products from local database
 */
export async function getCachedProducts(search?: string, categoryId?: string): Promise<CachedProduct[]> {
  try {
    let products = await db.products.toArray()

    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.barcode?.toLowerCase().includes(searchLower)
      )
    }

    if (categoryId) {
      products = products.filter((p) => p.category_id === categoryId)
    }

    return products
  } catch (error) {
    console.error('getCachedProducts error:', error)
    return []
  }
}

/**
 * Get cached categories from local database
 */
export async function getCachedCategories(): Promise<CachedCategory[]> {
  try {
    return await db.categories.orderBy('sort_order').toArray()
  } catch (error) {
    console.error('getCachedCategories error:', error)
    return []
  }
}

// ============================================
// Pending Sales Functions
// ============================================

/**
 * Add a sale to pending queue for later sync
 */
export async function addPendingSale(
  items: CartItem[],
  payments: PaymentInfo[],
  customer?: CustomerInfo,
  discount: number = 0,
  note?: string
): Promise<PendingSale> {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price - item.discount, 0)
  const vatAmount = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price - item.discount
    return sum + itemTotal * (item.vat_rate / 100)
  }, 0)
  const total = subtotal + vatAmount - discount

  const pendingSale: PendingSale = {
    id: generateOfflineId(),
    items,
    customer,
    payments,
    subtotal,
    vat_amount: vatAmount,
    discount,
    total,
    note,
    created_at: new Date().toISOString(),
    synced: false,
  }

  await db.pendingSales.add(pendingSale)

  // Also add to sync queue
  await addToSyncQueue('create_sale', pendingSale.id)

  return pendingSale
}

/**
 * Get all pending (unsynced) sales
 */
export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    return await db.pendingSales.filter((s) => !s.synced).toArray()
  } catch {
    return []
  }
}

/**
 * Get count of pending sales
 */
export async function getPendingSalesCount(): Promise<number> {
  try {
    return await db.pendingSales.filter((s) => !s.synced).count()
  } catch {
    return 0
  }
}

/**
 * Mark a pending sale as synced
 */
export async function markSaleAsSynced(id: string): Promise<void> {
  await db.pendingSales.update(id, { synced: true })
}

/**
 * Remove a pending sale (after successful sync or cancellation)
 */
export async function removePendingSale(id: string): Promise<void> {
  await db.pendingSales.delete(id)
}

// ============================================
// Sync Queue Functions
// ============================================

/**
 * Add item to sync queue
 */
async function addToSyncQueue(
  action: SyncQueueItem['action'],
  payloadId: string
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: generateOfflineId(),
    action,
    payload: { saleId: payloadId },
    status: 'pending',
    retries: 0,
    created_at: new Date().toISOString(),
  }

  await db.syncQueue.add(queueItem)
}

/**
 * Sync all pending sales to the server
 */
export async function syncPendingSales(): Promise<{
  success: boolean
  synced: number
  failed: number
  errors: string[]
}> {
  const result = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    const pendingSales = await getPendingSales()

    if (pendingSales.length === 0) {
      return result
    }

    const supabase = createClient()

    // Get current user and store
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      result.success = false
      result.errors.push('Not authenticated')
      return result
    }

    const { data: userData } = await supabase
      .from('users')
      .select('store_id')
      .eq('id', user.id)
      .single()

    const typedUserData = userData as SupabaseUser | null

    if (!typedUserData?.store_id) {
      result.success = false
      result.errors.push('No store found')
      return result
    }

    const storeId = typedUserData.store_id

    for (const sale of pendingSales) {
      try {
        // Generate invoice number
        const now = new Date(sale.created_at)
        const prefix = `HD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
        const { count } = await supabase
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .like('invoice_no', `${prefix}%`)

        const invoice_no = `${prefix}${String((count || 0) + 1).padStart(4, '0')}`

        // Create sale
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            store_id: storeId,
            user_id: user.id,
            invoice_no,
            subtotal: sale.subtotal,
            vat_amount: sale.vat_amount,
            discount: sale.discount,
            total: sale.total,
            status: 'completed',
            customer_name: sale.customer?.name || null,
            customer_phone: sale.customer?.phone || null,
            customer_tax_code: sale.customer?.tax_code || null,
            note: sale.note || null,
            completed_at: sale.created_at,
          } as never)
          .select()
          .single()

        if (saleError) throw saleError

        const createdSale = saleData as { id: string }

        // Create sale items
        const saleItems = sale.items.map((item) => ({
          sale_id: createdSale.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          vat_amount: (item.quantity * item.unit_price - item.discount) * (item.vat_rate / 100),
          discount: item.discount,
          total: item.quantity * item.unit_price - item.discount,
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems as never)

        if (itemsError) throw itemsError

        // Create payments
        const paymentRecords = sale.payments.map((p) => ({
          sale_id: createdSale.id,
          method: p.method,
          amount: p.amount,
          bank_account_id: p.bank_account_id || null,
          bank_ref: p.bank_ref || null,
        }))

        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(paymentRecords as never)

        if (paymentsError) throw paymentsError

        // Mark as synced and remove from queue
        await markSaleAsSynced(sale.id)
        await removePendingSale(sale.id)

        // Remove from sync queue by finding matching items
        const queueItems = await db.syncQueue
          .filter((q) => {
            const payload = q.payload as { saleId?: string }
            return q.action === 'create_sale' && payload.saleId === sale.id
          })
          .toArray()

        for (const qi of queueItems) {
          await db.syncQueue.delete(qi.id)
        }

        result.synced++
      } catch (error) {
        result.failed++
        const message = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Sale ${sale.id}: ${message}`)

        // Update retry count in sync queue
        const queueItem = await db.syncQueue
          .filter((q) => {
            const payload = q.payload as { saleId?: string }
            return q.action === 'create_sale' && payload.saleId === sale.id
          })
          .first()

        if (queueItem) {
          if (queueItem.retries >= MAX_RETRIES - 1) {
            await db.syncQueue.update(queueItem.id, {
              status: 'failed',
              retries: queueItem.retries + 1,
              error: message,
            })
          } else {
            await db.syncQueue.update(queueItem.id, {
              retries: queueItem.retries + 1,
              error: message,
            })
          }
        }
      }
    }

    result.success = result.failed === 0
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

// ============================================
// Sync Status Functions
// ============================================

export interface SyncStatus {
  pendingSalesCount: number
  failedSyncCount: number
  lastProductsSync: string | null
  lastCategoriesSync: string | null
  isOnline: boolean
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const [
      pendingSalesCount,
      failedSyncCount,
      lastProductsSyncMeta,
      lastCategoriesSyncMeta,
    ] = await Promise.all([
      getPendingSalesCount(),
      db.syncQueue.where('status').equals('failed').count(),
      db.syncMeta.get(SYNC_META_KEYS.LAST_PRODUCTS_SYNC),
      db.syncMeta.get(SYNC_META_KEYS.LAST_CATEGORIES_SYNC),
    ])

    return {
      pendingSalesCount,
      failedSyncCount,
      lastProductsSync: lastProductsSyncMeta?.value || null,
      lastCategoriesSync: lastCategoriesSyncMeta?.value || null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    }
  } catch (error) {
    console.error('getSyncStatus error:', error)
    return {
      pendingSalesCount: 0,
      failedSyncCount: 0,
      lastProductsSync: null,
      lastCategoriesSync: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    }
  }
}

// Define the full sync result type
export type FullSyncResult = {
  products: { success: boolean; count: number; error?: string }
  categories: { success: boolean; count: number; error?: string }
  sales: { success: boolean; synced: number; failed: number; errors: string[] }
}

/**
 * Perform full sync (products + categories + pending sales)
 */
export async function performFullSync(): Promise<FullSyncResult> {
  const [productsResult, categoriesResult, salesResult] = await Promise.all([
    syncProducts(),
    syncCategories(),
    syncPendingSales(),
  ])

  return {
    products: productsResult,
    categories: categoriesResult,
    sales: salesResult,
  }
}
