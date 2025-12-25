import type { PersistStorage, StorageValue } from 'zustand/middleware'

const CURRENT_STORE_KEY = 'current-store-id'

export function getCurrentStoreId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CURRENT_STORE_KEY)
}

export function setCurrentStoreId(storeId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CURRENT_STORE_KEY, storeId)
}

export function createStoreAwareStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name: string): StorageValue<T> | null => {
      if (typeof window === 'undefined') return null
      const storeId = getCurrentStoreId()
      const actualKey = storeId ? `${name}-${storeId}` : name
      const value = localStorage.getItem(actualKey)
      if (!value) return null
      try {
        return JSON.parse(value) as StorageValue<T>
      } catch {
        return null
      }
    },
    setItem: (name: string, value: StorageValue<T>) => {
      if (typeof window === 'undefined') return
      const storeId = getCurrentStoreId()
      const actualKey = storeId ? `${name}-${storeId}` : name
      localStorage.setItem(actualKey, JSON.stringify(value))
    },
    removeItem: (name: string) => {
      if (typeof window === 'undefined') return
      const storeId = getCurrentStoreId()
      const actualKey = storeId ? `${name}-${storeId}` : name
      localStorage.removeItem(actualKey)
    },
  }
}
