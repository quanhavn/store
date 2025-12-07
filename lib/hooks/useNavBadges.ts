'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'

interface NavBadges {
  inventory: number
  isLoading: boolean
}

export function useNavBadges(): NavBadges {
  const { data: inventorySummary, isLoading } = useQuery({
    queryKey: ['nav-badges-inventory'],
    queryFn: async () => {
      const result = await api.inventory.summary()
      return result.summary
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const lowStockCount = inventorySummary?.low_stock_count ?? 0
  const outOfStockCount = inventorySummary?.out_of_stock_count ?? 0

  return {
    inventory: lowStockCount + outOfStockCount,
    isLoading,
  }
}
