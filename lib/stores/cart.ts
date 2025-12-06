import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount: number
  image_url?: string
}

export interface CartStore {
  items: CartItem[]
  discount: number
  customer_name: string
  customer_phone: string
  customer_tax_code: string
  note: string

  // Actions
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
  setCustomer: (name: string, phone: string, taxCode: string) => void
  setNote: (note: string) => void
  clear: () => void

  // Computed (as functions since Zustand doesn't support getters well)
  getSubtotal: () => number
  getVatAmount: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      customer_name: '',
      customer_phone: '',
      customer_tax_code: '',
      note: '',

      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product_id === product.id)

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product_id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                product_id: product.id,
                product_name: product.name,
                quantity: 1,
                unit_price: product.sell_price,
                vat_rate: product.vat_rate,
                discount: 0,
                image_url: product.image_url,
              },
            ],
          }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId ? { ...item, quantity } : item
          ),
        }))
      },

      updateItemDiscount: (productId, discount) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId ? { ...item, discount } : item
          ),
        }))
      },

      setDiscount: (amount) => {
        set({ discount: amount })
      },

      setCustomer: (name, phone, taxCode) => {
        set({
          customer_name: name,
          customer_phone: phone,
          customer_tax_code: taxCode,
        })
      },

      setNote: (note) => {
        set({ note })
      },

      clear: () => {
        set({
          items: [],
          discount: 0,
          customer_name: '',
          customer_phone: '',
          customer_tax_code: '',
          note: '',
        })
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price - item.discount,
          0
        )
      },

      getVatAmount: () => {
        return get().items.reduce((sum, item) => {
          const itemTotal = item.quantity * item.unit_price - item.discount
          return sum + itemTotal * (item.vat_rate / 100)
        }, 0)
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const vatAmount = get().getVatAmount()
        const discount = get().discount
        return subtotal + vatAmount - discount
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
