// Offline support module for POS system
// Uses Dexie.js for IndexedDB storage

// Database and types
export {
  db,
  generateOfflineId,
  clearOfflineData,
  isDatabaseAvailable,
  type CachedProduct,
  type CachedCategory,
  type CustomerInfo,
  type PendingSale,
  type SyncQueueItem,
  type SyncMeta,
  type BuyerInfo,
  type InvoiceDraft,
  type InvoiceSyncQueueItem,
} from './db'

// Sync functions
export {
  syncProducts,
  syncCategories,
  getCachedProducts,
  getCachedCategories,
  addPendingSale,
  getPendingSales,
  getPendingSalesCount,
  markSaleAsSynced,
  removePendingSale,
  syncPendingSales,
  getSyncStatus,
  performFullSync,
  type SyncStatus,
  type FullSyncResult,
} from './sync'

// React hooks
export {
  useOnlineStatus,
  usePendingSalesCount,
  useProductsCache,
  useCategoriesCache,
  useSyncStatus,
  useAutoSync,
} from './hooks'

// Invoice sync
export {
  queueInvoiceCreation,
  queueInvoiceCancellation,
  syncPendingInvoices,
  getPendingInvoiceCount,
  getInvoiceDrafts,
  getInvoiceSyncQueueItems,
  retryFailedInvoice,
  removeInvoiceFromQueue,
  type InvoiceSyncResult,
} from './invoice-sync'
