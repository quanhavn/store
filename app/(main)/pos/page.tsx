'use client'

import { useState, useCallback, useEffect } from 'react'
import { FloatButton, Badge, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callFunction, api } from '@/lib/supabase/functions'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { OrderTabs } from '@/components/pos/OrderTabs'
import { MultiOrderCartSheet } from '@/components/pos/MultiOrderCartSheet'
import { PaymentMethods, type PaymentInfo, type DebtInfo, type DebtPaymentInfo } from '@/components/pos/PaymentMethods'
import { CustomerQuickAdd } from '@/components/customers'
import { CheckoutSuccess, type InvoiceData } from '@/components/pos/CheckoutSuccess'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { VariantSelectorModal, type ProductWithVariants, type ProductVariant } from '@/components/pos/VariantSelectorModal'
import { useMultiOrderStore, type CartItem } from '@/lib/stores/multiOrder'
import { useOnlineStatus, useAutoSync } from '@/lib/offline/hooks'
import {
  getCachedProducts,
  getCachedCategories,
  addPendingSale,
  syncProducts,
  syncCategories,
} from '@/lib/offline/sync'
import type { CachedProduct } from '@/lib/offline/db'

interface ProductUnit {
  id: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

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
  has_variants?: boolean
  has_units?: boolean
  variants?: ProductVariant[]
  units?: ProductUnit[]
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
  const [completedSale, setCompletedSale] = useState<InvoiceData>()
  const [showCustomerQuickAdd, setShowCustomerQuickAdd] = useState(false)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null)

  const supabase = createClient()
  const queryClient = useQueryClient()
  const multiOrder = useMultiOrderStore()
  const activeOrder = multiOrder.getActiveOrder()
  const itemCount = multiOrder.getItemCount()
  const total = multiOrder.getTotal()
  const orderCount = multiOrder.getOrderCount()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (orderCount === 0) {
      multiOrder.createOrder()
    }
  }, [orderCount, multiOrder])

  const { syncing: autoSyncing } = useAutoSync({
    enabled: true,
    onSyncComplete: (result) => {
      if (result.sales.synced > 0) {
        message.success(`Da dong bo ${result.sales.synced} don hang offline`)
      }
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (error) => {
      console.error('Auto-sync error:', error)
    },
  })

  useEffect(() => {
    if (isOnline) {
      syncProducts().catch(console.error)
      syncCategories().catch(console.error)
    }
  }, [isOnline])

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, categoryId, isOnline],
    queryFn: async () => {
      if (isOnline) {
        try {
          let query = supabase
            .from('products')
            .select('*, categories(id, name), product_variants(*), product_units(*)')
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
          
          interface ProductRow {
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
            has_variants?: boolean
            has_units?: boolean
            categories?: { id: string; name: string }
            product_variants?: (ProductVariant & { active?: boolean })[]
            product_units?: (ProductUnit & { active?: boolean })[]
          }
          
          return (data as ProductRow[] || []).map((p) => ({
            ...p,
            variants: p.product_variants?.filter((v) => v.active !== false) || [],
            units: p.product_units?.filter((u) => u.active !== false) || [],
          })) as Product[]
        } catch (error) {
          console.error('Online products fetch failed, using cache:', error)
        }
      }

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', isOnline],
    queryFn: async () => {
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
        }
      }

      const cachedCategories = await getCachedCategories()
      return cachedCategories as Category[]
    },
  })

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

  // Fetch store info for invoice display
  const { data: storeData } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore(),
    enabled: isOnline,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const createSaleMutation = useMutation({
    mutationFn: async ({ payments, debtInfo, debtPayment, orderSnapshot }: {
      payments: PaymentInfo[]
      debtInfo?: DebtInfo
      debtPayment?: DebtPaymentInfo
      orderSnapshot: {
        items: CartItem[]
        customerName?: string
        customerPhone?: string
        discount: number
        subtotal: number
        vatAmount: number
        total: number
      }
    }) => {
      if (!activeOrder) throw new Error('Không có đơn hàng')

      if (!isOnline) {
        const pendingSale = await addPendingSale(
          activeOrder.items,
          payments,
          {
            name: activeOrder.customer_name || undefined,
            phone: activeOrder.customer_phone || undefined,
            tax_code: activeOrder.customer_tax_code || undefined,
          },
          activeOrder.discount,
          activeOrder.note || undefined
        )

        return {
          invoice_no: `OFFLINE-${pendingSale.id.substring(8, 16).toUpperCase()}`,
          total: pendingSale.total,
          offline: true,
          orderSnapshot,
        }
      }

      const result = await callFunction<{ sale: { id: string }; invoice_no: string; debt?: { debt: { id: string } }; debt_payment?: { amount: number } }>('pos', {
        action: 'create',
        items: activeOrder.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          discount: item.discount,
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          unit_id: item.unit_id,
          unit_name: item.unit_name,
          conversion_rate: item.conversion_rate,
        })),
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount,
          bank_account_id: p.bank_account_id,
          bank_ref: p.bank_ref,
        })),
        customer_name: activeOrder.customer_name,
        customer_phone: activeOrder.customer_phone,
        customer_tax_code: activeOrder.customer_tax_code,
        customer_id: activeOrder.customer_id,
        create_debt: !!debtInfo,
        debt_type: debtInfo?.debt_type,
        debt_options: debtInfo ? {
          due_date: debtInfo.due_date,
          installments: debtInfo.installments,
          frequency: debtInfo.frequency,
          first_due_date: debtInfo.first_due_date,
        } : undefined,
        debt_payment: debtPayment ? {
          amount: debtPayment.amount,
        } : undefined,
        discount: activeOrder.discount,
        note: activeOrder.note,
      })

      return {
        invoice_no: result.invoice_no,
        total: orderSnapshot.total,
        offline: false,
        debt_amount: debtInfo?.amount,
        debt_paid: result.debt_payment?.amount,
        orderSnapshot,
      }
    },
    onSuccess: (data) => {
      const store = storeData?.store
      const invoiceData: InvoiceData = {
        invoiceNo: data.invoice_no,
        total: data.orderSnapshot.total,
        subtotal: data.orderSnapshot.subtotal,
        vatAmount: data.orderSnapshot.vatAmount,
        discount: data.orderSnapshot.discount,
        items: data.orderSnapshot.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          discount: item.discount,
          variant_name: item.variant_name,
          unit_name: item.unit_name,
        })),
        customerName: data.orderSnapshot.customerName,
        customerPhone: data.orderSnapshot.customerPhone,
        storeName: store?.name || undefined,
        storeAddress: store?.address || undefined,
        storePhone: store?.phone || undefined,
        completedAt: new Date(),
      }
      setCompletedSale(invoiceData)
      setStep('success')
      multiOrder.clearActiveOrder()

      if (data.offline) {
        message.info('Don hang da duoc luu offline. Se dong bo khi co mang.')
      }
      if (data.debt_paid) {
        message.success(`Da tru ${data.debt_paid.toLocaleString('vi-VN')}đ vao no cu`)
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
    setSearch(barcode)

    if (productsData) {
      const product = productsData.find(
        (p) => p.barcode === barcode || p.sku === barcode
      )
      if (product) {
        if (product.quantity <= 0) {
          message.warning('San pham da het hang')
          return
        }
        multiOrder.addItem({
          id: product.id,
          name: product.name,
          sell_price: product.sell_price,
          vat_rate: product.vat_rate,
          image_url: product.image_url,
        })
        message.success(`Da them ${product.name}`)
      }
    }
  }, [productsData, multiOrder])

  const handleProductClick = (product: Product) => {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product)
      setVariantModalOpen(true)
      return
    }

    if (product.quantity <= 0) {
      message.warning('San pham da het hang')
      return
    }

    const defaultUnit = product.units?.find(u => u.is_default) || product.units?.[0]
    
    multiOrder.addItem({
      id: product.id,
      name: product.name,
      sell_price: defaultUnit?.sell_price ?? product.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
      unit_id: defaultUnit?.id,
      unit_name: defaultUnit?.unit_name || product.unit,
      conversion_rate: defaultUnit?.conversion_rate || 1,
    })
    message.success(`Da them ${product.name}`)
  }

  const handleVariantSelect = (product: ProductWithVariants, variant: ProductVariant) => {
    multiOrder.addItemWithVariant({
      id: product.id,
      name: product.name,
      sell_price: variant.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
      variant_id: variant.id,
      variant_name: variant.name,
    })
    message.success(`Da them ${product.name} - ${variant.name}`)
  }

  const handleCheckout = () => {
    setCartOpen(false)
    setStep('payment')
  }

  const handlePaymentConfirm = (payments: PaymentInfo[], debtInfo?: DebtInfo, debtPayment?: DebtPaymentInfo) => {
    if (!activeOrder) return

    // Capture order snapshot before mutation clears the order
    const orderSnapshot = {
      items: [...activeOrder.items],
      customerName: activeOrder.customer_name || undefined,
      customerPhone: activeOrder.customer_phone || undefined,
      discount: activeOrder.discount,
      subtotal: multiOrder.getSubtotal(),
      vatAmount: multiOrder.getVatAmount(),
      total: multiOrder.getTotal(),
    }

    createSaleMutation.mutate({ payments, debtInfo, debtPayment, orderSnapshot })
  }

  const handleCustomerSelect = (customer: import('@/lib/supabase/functions').Customer | null) => {
    if (activeOrder) {
      multiOrder.setCustomer(activeOrder.id, customer)
    }
  }

  const handleCustomerCreate = () => {
    setShowCustomerQuickAdd(true)
  }

  const handleCustomerCreated = (customer: import('@/lib/supabase/functions').Customer) => {
    setShowCustomerQuickAdd(false)
    if (activeOrder) {
      multiOrder.setCustomer(activeOrder.id, customer)
    }
  }

  const handleNewSale = () => {
    setStep('pos')
    setCompletedSale(undefined)
    if (multiOrder.getOrderCount() === 0) {
      multiOrder.createOrder()
    }
  }

  const handleSyncComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }, [queryClient])

  if (step === 'success' && completedSale) {
    return (
      <CheckoutSuccess
        invoiceData={completedSale}
        onNewSale={handleNewSale}
        onPrint={() => window.print()}
      />
    )
  }

  if (step === 'payment') {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Thanh toan - {activeOrder?.label}</h1>
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            Ban dang offline. Don hang se duoc luu va dong bo khi co mang.
          </div>
        )}
        {showCustomerQuickAdd ? (
          <CustomerQuickAdd
            onSuccess={handleCustomerCreated}
            onCancel={() => setShowCustomerQuickAdd(false)}
          />
        ) : (
          <PaymentMethods
            total={total}
            onConfirm={handlePaymentConfirm}
            loading={createSaleMutation.isPending}
            bankAccounts={isOnline ? bankAccounts : []}
            customer={activeOrder?.customer || null}
            onCustomerSelect={handleCustomerSelect}
            onCustomerCreate={handleCustomerCreate}
            allowPartialPayment={isOnline}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
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
      </div>

      <OrderTabs />

      <div className="mb-4">
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

      <MultiOrderCartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />

      <VariantSelectorModal
        open={variantModalOpen}
        onClose={() => {
          setVariantModalOpen(false)
          setSelectedProductForVariant(null)
        }}
        product={selectedProductForVariant}
        onSelectVariant={handleVariantSelect}
      />
    </div>
  )
}
