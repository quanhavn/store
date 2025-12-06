import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AdjustmentType = 'import' | 'export' | 'adjustment'

export interface StockAdjustmentItem {
  product_id: string
  product_name: string
  current_quantity: number
  adjustment_quantity: number
  unit_cost: number | null
  note: string
}

export interface InventoryStore {
  adjustmentType: AdjustmentType
  adjustmentItems: StockAdjustmentItem[]
  adjustmentNote: string

  // Actions
  setAdjustmentType: (type: AdjustmentType) => void
  addAdjustmentItem: (product: {
    id: string
    name: string
    quantity: number
    cost_price: number
  }) => void
  removeAdjustmentItem: (productId: string) => void
  updateAdjustmentQuantity: (productId: string, quantity: number) => void
  updateAdjustmentCost: (productId: string, cost: number | null) => void
  updateItemNote: (productId: string, note: string) => void
  setAdjustmentNote: (note: string) => void
  clearAdjustment: () => void

  // Computed
  getItemCount: () => number
  getTotalValue: () => number
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      adjustmentType: 'import',
      adjustmentItems: [],
      adjustmentNote: '',

      setAdjustmentType: (type) => {
        set({ adjustmentType: type })
      },

      addAdjustmentItem: (product) => {
        set((state) => {
          const existingItem = state.adjustmentItems.find(
            (item) => item.product_id === product.id
          )

          if (existingItem) {
            return {
              adjustmentItems: state.adjustmentItems.map((item) =>
                item.product_id === product.id
                  ? { ...item, adjustment_quantity: item.adjustment_quantity + 1 }
                  : item
              ),
            }
          }

          return {
            adjustmentItems: [
              ...state.adjustmentItems,
              {
                product_id: product.id,
                product_name: product.name,
                current_quantity: product.quantity,
                adjustment_quantity: 1,
                unit_cost: product.cost_price,
                note: '',
              },
            ],
          }
        })
      },

      removeAdjustmentItem: (productId) => {
        set((state) => ({
          adjustmentItems: state.adjustmentItems.filter(
            (item) => item.product_id !== productId
          ),
        }))
      },

      updateAdjustmentQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeAdjustmentItem(productId)
          return
        }

        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) =>
            item.product_id === productId
              ? { ...item, adjustment_quantity: quantity }
              : item
          ),
        }))
      },

      updateAdjustmentCost: (productId, cost) => {
        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) =>
            item.product_id === productId ? { ...item, unit_cost: cost } : item
          ),
        }))
      },

      updateItemNote: (productId, note) => {
        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) =>
            item.product_id === productId ? { ...item, note } : item
          ),
        }))
      },

      setAdjustmentNote: (note) => {
        set({ adjustmentNote: note })
      },

      clearAdjustment: () => {
        set({
          adjustmentType: 'import',
          adjustmentItems: [],
          adjustmentNote: '',
        })
      },

      getItemCount: () => {
        return get().adjustmentItems.reduce(
          (sum, item) => sum + item.adjustment_quantity,
          0
        )
      },

      getTotalValue: () => {
        return get().adjustmentItems.reduce((sum, item) => {
          const cost = item.unit_cost || 0
          return sum + item.adjustment_quantity * cost
        }, 0)
      },
    }),
    {
      name: 'inventory-adjustment-storage',
    }
  )
)
