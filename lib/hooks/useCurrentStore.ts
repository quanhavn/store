'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/supabase/functions'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Store = Database['public']['Tables']['stores']['Row']

interface UserStoreItem {
  id: string
  name: string
  role: 'owner' | 'manager' | 'staff'
  is_default: boolean
}

interface Subscription {
  plan_id: string
  plan_name?: string
  status: string
  expires_at?: string
  features?: Record<string, boolean>
}

interface UserStoreResponse {
  store: Store | null
  user_stores?: UserStoreItem[]
  max_stores?: number
  subscription?: Subscription
  needs_setup?: boolean
  needs_onboarding?: boolean
}

interface UseCurrentStoreReturn {
  currentStore: Store | null
  userStores: UserStoreItem[]
  isLoading: boolean
  isSwitching: boolean
  canCreateStore: boolean
  maxStores: number
  subscription: Subscription | null
  switchStore: (storeId: string) => Promise<void>
  createStore: (storeName: string, phone?: string) => Promise<{ success: boolean; store_id?: string; error?: string }>
}

export function useCurrentStore(): UseCurrentStoreReturn {
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check auth state before making API calls
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore() as Promise<UserStoreResponse>,
    staleTime: 1000 * 60 * 5,
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: (failureCount, error) => {
      if (error?.message?.includes('Not authenticated')) {
        return false
      }
      return failureCount < 2
    },
  })

  const { mutateAsync: switchStoreMutation, isPending: isSwitching } = {
    mutateAsync: async (storeId: string) => {
      await api.store.switchStore(storeId)
      await queryClient.invalidateQueries({ queryKey: ['user-store'] })
      window.location.reload()
    },
    isPending: false,
  }

  const switchStore = async (storeId: string) => {
    await api.store.switchStore(storeId)
    await queryClient.invalidateQueries({ queryKey: ['user-store'] })
    window.location.reload()
  }

  const maxStores = data?.max_stores ?? 1
  const canCreateStore = (data?.user_stores?.length ?? 0) < maxStores

  const createStore = async (storeName: string, phone?: string) => {
    const result = await api.store.createStore(storeName, phone)
    if (result.success && result.store_id) {
      await queryClient.invalidateQueries({ queryKey: ['user-store'] })
      // Switch to the new store
      await api.store.switchStore(result.store_id)
      window.location.reload()
    }
    return result
  }

  return {
    currentStore: data?.store ?? null,
    userStores: data?.user_stores ?? [],
    isLoading,
    isSwitching,
    canCreateStore,
    maxStores,
    subscription: data?.subscription ?? null,
    switchStore,
    createStore,
  }
}
