import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer } from '@/lib/supabase/functions'

const generateId = () => Math.random().toString(36).substring(2, 10)

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount: number
  image_url?: string
}

export interface Order {
  id: string
  label: string
  items: CartItem[]
  discount: number
  customer_name: string
  customer_phone: string
  customer_tax_code: string
  note: string
  createdAt: number

  // Customer and debt fields
  customer_id?: string
  customer?: Customer  // Cached customer object for display
  create_debt?: boolean
  debt_type?: 'credit' | 'installment'
  debt_options?: {
    due_date?: string
    installments?: number
    frequency?: 'weekly' | 'biweekly' | 'monthly'
    first_due_date?: string
  }
}

export interface MultiOrderStore {
  orders: Order[]
  activeOrderId: string | null
  maxOrders: number

  createOrder: (label?: string) => string
  deleteOrder: (orderId: string) => void
  setActiveOrder: (orderId: string) => void
  renameOrder: (orderId: string, label: string) => void

  addItem: (product: {
    id: string
    name: string
    sell_price: number
    vat_rate: number
    image_url?: string
  }) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setDiscount: (amount: number) => void
  setCustomerInfo: (name: string, phone: string, taxCode: string) => void
  setNote: (note: string) => void
  clearActiveOrder: () => void

  // Customer actions
  setCustomer: (orderId: string, customer: Customer | null) => void
  clearCustomer: (orderId: string) => void

  // Debt actions
  setDebtEnabled: (orderId: string, enabled: boolean) => void
  setDebtType: (orderId: string, type: 'credit' | 'installment') => void
  setDebtOptions: (orderId: string, options: Order['debt_options']) => void
  clearDebtOptions: (orderId: string) => void

  getActiveOrder: () => Order | null
  getSubtotal: () => number
  getVatAmount: () => number
  getTotal: () => number
  getItemCount: () => number
  getOrderCount: () => number
}

const createEmptyOrder = (label?: string): Order => ({
  id: generateId(),
  label: label || `Đơn ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
  items: [],
  discount: 0,
  customer_name: '',
  customer_phone: '',
  customer_tax_code: '',
  note: '',
  createdAt: Date.now(),
})

export const useMultiOrderStore = create<MultiOrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      activeOrderId: null,
      maxOrders: 10,

      createOrder: (label?: string) => {
        const state = get()
        if (state.orders.length >= state.maxOrders) {
          throw new Error(`Tối đa ${state.maxOrders} đơn hàng song song`)
        }
        const newOrder = createEmptyOrder(label)
        set({
          orders: [...state.orders, newOrder],
          activeOrderId: newOrder.id,
        })
        return newOrder.id
      },

      deleteOrder: (orderId: string) => {
        set((state) => {
          const newOrders = state.orders.filter((o) => o.id !== orderId)
          let newActiveId = state.activeOrderId

          if (state.activeOrderId === orderId) {
            newActiveId = newOrders.length > 0 ? newOrders[newOrders.length - 1].id : null
          }

          return {
            orders: newOrders,
            activeOrderId: newActiveId,
          }
        })
      },

      setActiveOrder: (orderId: string) => {
        set({ activeOrderId: orderId })
      },

      renameOrder: (orderId: string, label: string) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, label } : o
          ),
        }))
      },

      addItem: (product) => {
        set((state) => {
          const activeOrder = state.orders.find((o) => o.id === state.activeOrderId)
          if (!activeOrder) return state

          const existingItem = activeOrder.items.find((item) => item.product_id === product.id)

          const updatedItems = existingItem
            ? activeOrder.items.map((item) =>
                item.product_id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            : [
                ...activeOrder.items,
                {
                  product_id: product.id,
                  product_name: product.name,
                  quantity: 1,
                  unit_price: product.sell_price,
                  vat_rate: product.vat_rate,
                  discount: 0,
                  image_url: product.image_url,
                },
              ]

          return {
            orders: state.orders.map((o) =>
              o.id === state.activeOrderId ? { ...o, items: updatedItems } : o
            ),
          }
        })
      },

      removeItem: (productId) => {
        set((state) => {
          const activeOrder = state.orders.find((o) => o.id === state.activeOrderId)
          if (!activeOrder) return state

          return {
            orders: state.orders.map((o) =>
              o.id === state.activeOrderId
                ? { ...o, items: o.items.filter((item) => item.product_id !== productId) }
                : o
            ),
          }
        })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === state.activeOrderId
              ? {
                  ...o,
                  items: o.items.map((item) =>
                    item.product_id === productId ? { ...item, quantity } : item
                  ),
                }
              : o
          ),
        }))
      },

      updateItemDiscount: (productId, discount) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === state.activeOrderId
              ? {
                  ...o,
                  items: o.items.map((item) =>
                    item.product_id === productId ? { ...item, discount } : item
                  ),
                }
              : o
          ),
        }))
      },

      setDiscount: (amount) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === state.activeOrderId ? { ...o, discount: amount } : o
          ),
        }))
      },

      setCustomerInfo: (name, phone, taxCode) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === state.activeOrderId
              ? { ...o, customer_name: name, customer_phone: phone, customer_tax_code: taxCode }
              : o
          ),
        }))
      },

      // Customer actions
      setCustomer: (orderId, customer) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  customer_id: customer?.id,
                  customer: customer ?? undefined,
                  // Also update the legacy customer info fields for compatibility
                  customer_name: customer?.name || o.customer_name,
                  customer_phone: customer?.phone || o.customer_phone,
                  customer_tax_code: customer?.tax_code || o.customer_tax_code,
                }
              : o
          ),
        }))
      },

      clearCustomer: (orderId) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  customer_id: undefined,
                  customer: undefined,
                  // Clear debt options when customer is cleared (debt requires customer)
                  create_debt: undefined,
                  debt_type: undefined,
                  debt_options: undefined,
                }
              : o
          ),
        }))
      },

      // Debt actions
      setDebtEnabled: (orderId, enabled) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  create_debt: enabled,
                  // If disabling debt, also clear debt options
                  ...(enabled ? {} : { debt_type: undefined, debt_options: undefined }),
                }
              : o
          ),
        }))
      },

      setDebtType: (orderId, type) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, debt_type: type } : o
          ),
        }))
      },

      setDebtOptions: (orderId, options) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, debt_options: options } : o
          ),
        }))
      },

      clearDebtOptions: (orderId) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  create_debt: undefined,
                  debt_type: undefined,
                  debt_options: undefined,
                }
              : o
          ),
        }))
      },

      setNote: (note) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === state.activeOrderId ? { ...o, note } : o
          ),
        }))
      },

      clearActiveOrder: () => {
        set((state) => {
          const newOrders = state.orders.filter((o) => o.id !== state.activeOrderId)
          return {
            orders: newOrders,
            activeOrderId: newOrders.length > 0 ? newOrders[newOrders.length - 1].id : null,
          }
        })
      },

      getActiveOrder: () => {
        const state = get()
        return state.orders.find((o) => o.id === state.activeOrderId) || null
      },

      getSubtotal: () => {
        const activeOrder = get().getActiveOrder()
        if (!activeOrder) return 0
        return activeOrder.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price - item.discount,
          0
        )
      },

      getVatAmount: () => {
        const activeOrder = get().getActiveOrder()
        if (!activeOrder) return 0
        return activeOrder.items.reduce((sum, item) => {
          const itemTotal = item.quantity * item.unit_price - item.discount
          return sum + itemTotal * (item.vat_rate / 100)
        }, 0)
      },

      getTotal: () => {
        const activeOrder = get().getActiveOrder()
        if (!activeOrder) return 0
        const subtotal = get().getSubtotal()
        const vatAmount = get().getVatAmount()
        return subtotal + vatAmount - activeOrder.discount
      },

      getItemCount: () => {
        const activeOrder = get().getActiveOrder()
        if (!activeOrder) return 0
        return activeOrder.items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getOrderCount: () => {
        return get().orders.length
      },
    }),
    {
      name: 'multi-order-storage',
    }
  )
)
