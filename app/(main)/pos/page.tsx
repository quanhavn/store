'use client'

import { useState, useCallback, useEffect } from 'react'
import { FloatButton, Badge, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callFunction } from '@/lib/supabase/functions'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { CartSheet } from '@/components/pos/CartSheet'
import { PaymentMethods, type PaymentInfo } from '@/components/pos/PaymentMethods'
import { CheckoutSuccess } from '@/components/pos/CheckoutSuccess'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { useCartStore } from '@/lib/stores/cart'
import { useOnlineStatus, useAutoSync } from '@/lib/offline/hooks'
import {
  getCachedProducts,
  getCachedCategories,
  addPendingSale,
  syncProducts,
  syncCategories,
} from '@/lib/offline/sync'
import type { CachedProduct } from '@/lib/offline/db'

interface Product {
  id: string
  name: string
  sell_price: number
  cost_price: number
  vat_rate: number
  quantity: number
  min_stock: number
  unit: string
  image_url?: string
  barcode?: string
  sku?: string
  categories?: { id: string; name: string }
}

interface Category {
  id: string
  name: string
}

type CheckoutStep = 'pos' | 'payment' | 'success'

export default function POSPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [step, setStep] = useState<CheckoutStep>('pos')
  const [cartOpen, setCartOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<{ invoice_no: string; total: number }>()

  const supabase = createClient()
  const queryClient = useQueryClient()
  const cart = useCartStore()
  const itemCount = cart.getItemCount()
  const total = cart.getTotal()
  const isOnline = useOnlineStatus()

  // Auto-sync when coming back online
  const { syncing: autoSyncing } = useAutoSync({
    enabled: true,
    onSyncComplete: (result) => {
      if (result.sales.synced > 0) {
        message.success(`Da dong bo ${result.sales.synced} don hang offline`)
      }
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (error) => {
      console.error('Auto-sync error:', error)
    },
  })

  // Initial sync of products and categories to cache
  useEffect(() => {
    if (isOnline) {
      syncProducts().catch(console.error)
      syncCategories().catch(console.error)
    }
  }, [isOnline])

  // Fetch products - use online API when available, fallback to cache
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, categoryId, isOnline],
    queryFn: async () => {
      // Try online first
      if (isOnline) {
        try {
          let query = supabase
            .from('products')
            .select('*, categories(id, name)')
            .eq('active', true)
            .order('name')

          if (search) {
            query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
          }

          if (categoryId) {
            query = query.eq('category_id', categoryId)
          }

          const { data, error } = await query.limit(100)
          if (error) throw error
          return data as Product[]
        } catch (error) {
          console.error('Online products fetch failed, using cache:', error)
          // Fall through to cache
        }
      }

      // Offline or online fetch failed - use cache
      const cachedProducts = await getCachedProducts(search, categoryId)
      return cachedProducts.map((p: CachedProduct) => ({
        id: p.id,
        name: p.name,
        sell_price: p.sell_price,
        cost_price: 0,
        vat_rate: p.vat_rate,
        quantity: p.quantity,
        min_stock: 0,
        unit: '',
        image_url: p.image_url,
        barcode: p.barcode,
        sku: p.sku,
        categories: p.category_id ? { id: p.category_id, name: '' } : undefined,
      })) as Product[]
    },
  })

  // Fetch categories - use online API when available, fallback to cache
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', isOnline],
    queryFn: async () => {
      // Try online first
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .order('sort_order')
            .order('name')

          if (error) throw error
          return data as Category[]
        } catch (error) {
          console.error('Online categories fetch failed, using cache:', error)
          // Fall through to cache
        }
      }

      // Offline or online fetch failed - use cache
      const cachedCategories = await getCachedCategories()
      return cachedCategories as Category[]
    },
  })

  // Fetch bank accounts for payment
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number')
        .order('is_default', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: isOnline,
  })

  // Create sale mutation - handles both online and offline
  const createSaleMutation = useMutation({
    mutationFn: async (payments: PaymentInfo[]) => {
      // If offline, save to pending sales
      if (!isOnline) {
        const pendingSale = await addPendingSale(
          cart.items,
          payments,
          {
            name: cart.customer_name || undefined,
            phone: cart.customer_phone || undefined,
            tax_code: cart.customer_tax_code || undefined,
          },
          cart.discount,
          cart.note || undefined
        )

        return {
          invoice_no: `OFFLINE-${pendingSale.id.substring(8, 16).toUpperCase()}`,
          total: pendingSale.total,
          offline: true,
        }
      }

      // Online - create sale via Edge Function
      const saleTotal = cart.getTotal()

      const result = await callFunction<{ sale: { id: string }; invoice_no: string }>('pos', {
        action: 'create',
        items: cart.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          discount: item.discount,
        })),
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount,
          bank_account_id: p.bank_account_id,
          bank_ref: p.bank_ref,
        })),
        customer_name: cart.customer_name,
        customer_phone: cart.customer_phone,
        customer_tax_code: cart.customer_tax_code,
        discount: cart.discount,
        note: cart.note,
      })

      return { invoice_no: result.invoice_no, total: saleTotal, offline: false }
    },
    onSuccess: (data) => {
      setCompletedSale({ invoice_no: data.invoice_no, total: data.total })
      setStep('success')
      cart.clear()

      if (data.offline) {
        message.info('Don hang da duoc luu offline. Se dong bo khi co mang.')
      }
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleBarcodeScanned = useCallback((barcode: string) => {
    // When barcode is scanned, search for the product
    setSearch(barcode)

    // Also try to auto-add to cart if product is found
    if (productsData) {
      const product = productsData.find(
        (p) => p.barcode === barcode || p.sku === barcode
      )
      if (product) {
        if (product.quantity <= 0) {
          message.warning('San pham da het hang')
          return
        }
        cart.addItem({
          id: product.id,
          name: product.name,
          sell_price: product.sell_price,
          vat_rate: product.vat_rate,
          image_url: product.image_url,
        })
        message.success(`Da them ${product.name}`)
      }
    }
  }, [productsData, cart])

  const handleProductClick = (product: Product) => {
    if (product.quantity <= 0) {
      message.warning('San pham da het hang')
      return
    }
    cart.addItem({
      id: product.id,
      name: product.name,
      sell_price: product.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
    })
    message.success(`Da them ${product.name}`)
  }

  const handleCheckout = () => {
    setCartOpen(false)
    setStep('payment')
  }

  const handlePaymentConfirm = (payments: PaymentInfo[]) => {
    createSaleMutation.mutate(payments)
  }

  const handleNewSale = () => {
    setStep('pos')
    setCompletedSale(undefined)
  }

  const handleSyncComplete = useCallback(() => {
    // Refresh product list after sync
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }, [queryClient])

  if (step === 'success' && completedSale) {
    return (
      <CheckoutSuccess
        invoiceNo={completedSale.invoice_no}
        total={completedSale.total}
        onNewSale={handleNewSale}
        onPrint={() => window.print()}
      />
    )
  }

  if (step === 'payment') {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Thanh toan</h1>
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            Ban dang offline. Don hang se duoc luu va dong bo khi co mang.
          </div>
        )}
        <PaymentMethods
          total={total}
          onConfirm={handlePaymentConfirm}
          loading={createSaleMutation.isPending}
          bankAccounts={isOnline ? bankAccounts : []}
        />
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      {/* Offline Indicator */}
      <div className="mb-4">
        <OfflineIndicator
          showBanner={!isOnline}
          showSyncButton
          onSyncComplete={handleSyncComplete}
        />
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-bold mb-4">
          Ban hang
          {autoSyncing && <span className="text-sm font-normal text-gray-500 ml-2">(dang dong bo...)</span>}
        </h1>
        <ProductSearch
          onSearch={handleSearch}
          onBarcodeScanned={handleBarcodeScanned}
          showScanner
        />
      </div>

      <div className="mb-4">
        <CategoryFilter
          categories={categories}
          selectedId={categoryId}
          onChange={setCategoryId}
        />
      </div>

      <ProductGrid
        products={productsData || []}
        loading={productsLoading}
        onProductClick={handleProductClick}
        showAddToCart
      />

      <FloatButton
        type="primary"
        icon={
          <Badge count={itemCount} size="small" offset={[0, 0]}>
            <ShoppingCartOutlined className="text-white text-xl" />
          </Badge>
        }
        onClick={() => setCartOpen(true)}
        style={{ right: 24, bottom: 80, width: 56, height: 56 }}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </div>
  )
}
