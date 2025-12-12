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
  variant_id?: string
  variant_name?: string
  unit_id?: string
  unit_name?: string
  conversion_rate?: number
}

export interface InventoryStore {
  adjustmentType: AdjustmentType
  adjustmentItems: StockAdjustmentItem[]
  adjustmentNote: string
  recordExpense: boolean
  supplierName: string
  shouldNavigateToAdjustment: boolean
  paymentMethod: 'cash' | 'bank_transfer'
  bankAccountId: string | null

  // Actions
  setAdjustmentType: (type: AdjustmentType) => void
  setShouldNavigateToAdjustment: (value: boolean) => void
  addAdjustmentItem: (product: {
    id: string
    name: string
    quantity: number
    cost_price: number
    variant_id?: string
    variant_name?: string
    unit_id?: string
    unit_name?: string
    conversion_rate?: number
  }) => void
  addAdjustmentItemWithVariant: (product: {
    id: string
    name: string
    quantity: number
    cost_price: number
    variant_id: string
    variant_name: string
    unit_id?: string
    unit_name?: string
    conversion_rate?: number
  }) => void
  removeAdjustmentItem: (productId: string, variantId?: string, unitId?: string) => void
  updateAdjustmentQuantity: (productId: string, quantity: number, variantId?: string, unitId?: string) => void
  updateAdjustmentCost: (productId: string, cost: number | null, variantId?: string, unitId?: string) => void
  updateAdjustmentUnit: (productId: string, unit: { unit_id: string; unit_name: string; conversion_rate: number }, variantId?: string, unitId?: string) => void
  updateItemNote: (productId: string, note: string) => void
  setAdjustmentNote: (note: string) => void
  setRecordExpense: (record: boolean) => void
  setSupplierName: (name: string) => void
  setPaymentMethod: (method: 'cash' | 'bank_transfer') => void
  setBankAccountId: (id: string | null) => void
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
      recordExpense: true,
      supplierName: '',
      shouldNavigateToAdjustment: false,
      paymentMethod: 'cash',
      bankAccountId: null,

      setAdjustmentType: (type) => {
        set({ adjustmentType: type })
      },

      setShouldNavigateToAdjustment: (value) => {
        set({ shouldNavigateToAdjustment: value })
      },

      setPaymentMethod: (method) => {
        set({ paymentMethod: method })
      },

      setBankAccountId: (id) => {
        set({ bankAccountId: id })
      },

      addAdjustmentItem: (product) => {
        set((state) => {
          // Include unit_id in the key so same product with different units are treated as separate items
          let itemKey = product.id
          if (product.variant_id) itemKey += `-${product.variant_id}`
          if (product.unit_id) itemKey += `-${product.unit_id}`
          
          const existingItem = state.adjustmentItems.find((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey === itemKey
          })

          if (existingItem) {
            return {
              adjustmentItems: state.adjustmentItems.map((item) => {
                let existingKey = item.product_id
                if (item.variant_id) existingKey += `-${item.variant_id}`
                if (item.unit_id) existingKey += `-${item.unit_id}`
                return existingKey === itemKey
                  ? { ...item, adjustment_quantity: item.adjustment_quantity + 1 }
                  : item
              }),
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
                variant_id: product.variant_id,
                variant_name: product.variant_name,
                unit_id: product.unit_id,
                unit_name: product.unit_name,
                conversion_rate: product.conversion_rate,
              },
            ],
          }
        })
      },

      addAdjustmentItemWithVariant: (product) => {
        set((state) => {
          const itemKey = product.unit_id 
            ? `${product.id}-${product.variant_id}-${product.unit_id}`
            : `${product.id}-${product.variant_id}`
          const existingItem = state.adjustmentItems.find((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey === itemKey
          })

          if (existingItem) {
            return {
              adjustmentItems: state.adjustmentItems.map((item) => {
                let existingKey = item.product_id
                if (item.variant_id) existingKey += `-${item.variant_id}`
                if (item.unit_id) existingKey += `-${item.unit_id}`
                return existingKey === itemKey
                  ? { ...item, adjustment_quantity: item.adjustment_quantity + 1 }
                  : item
              }),
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
                variant_id: product.variant_id,
                variant_name: product.variant_name,
                unit_id: product.unit_id,
                unit_name: product.unit_name,
                conversion_rate: product.conversion_rate || 1,
              },
            ],
          }
        })
      },

      removeAdjustmentItem: (productId, variantId, unitId) => {
        let itemKey = productId
        if (variantId) itemKey += `-${variantId}`
        if (unitId) itemKey += `-${unitId}`
        set((state) => ({
          adjustmentItems: state.adjustmentItems.filter((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey !== itemKey
          }),
        }))
      },

      updateAdjustmentQuantity: (productId, quantity, variantId, unitId) => {
        if (quantity <= 0) {
          get().removeAdjustmentItem(productId, variantId, unitId)
          return
        }

        let itemKey = productId
        if (variantId) itemKey += `-${variantId}`
        if (unitId) itemKey += `-${unitId}`

        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey === itemKey
              ? { ...item, adjustment_quantity: quantity }
              : item
          }),
        }))
      },

      updateAdjustmentCost: (productId, cost, variantId, unitId) => {
        let itemKey = productId
        if (variantId) itemKey += `-${variantId}`
        if (unitId) itemKey += `-${unitId}`
        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey === itemKey ? { ...item, unit_cost: cost } : item
          }),
        }))
      },

      updateAdjustmentUnit: (productId, unit, variantId, unitId) => {
        let itemKey = productId
        if (variantId) itemKey += `-${variantId}`
        if (unitId) itemKey += `-${unitId}`
        set((state) => ({
          adjustmentItems: state.adjustmentItems.map((item) => {
            let existingKey = item.product_id
            if (item.variant_id) existingKey += `-${item.variant_id}`
            if (item.unit_id) existingKey += `-${item.unit_id}`
            return existingKey === itemKey 
              ? { 
                  ...item, 
                  unit_id: unit.unit_id, 
                  unit_name: unit.unit_name, 
                  conversion_rate: unit.conversion_rate 
                } 
              : item
          }),
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

      setRecordExpense: (record) => {
        set({ recordExpense: record })
      },

      setSupplierName: (name) => {
        set({ supplierName: name })
      },

      clearAdjustment: () => {
        set({
          adjustmentType: 'import',
          adjustmentItems: [],
          adjustmentNote: '',
          recordExpense: true,
          supplierName: '',
          paymentMethod: 'cash',
          bankAccountId: null,
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
