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
import { OrderDetailScreen } from '@/components/orders'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { VariantSelectorModal, type ProductWithVariants, type ProductVariant } from '@/components/pos/VariantSelectorModal'
import { UnitSelectorModal, type ProductWithUnits, type ProductUnit as ModalProductUnit } from '@/components/pos/UnitSelectorModal'
import { VariantUnitSelectorModal, type ProductWithVariantUnits } from '@/components/pos/VariantUnitSelectorModal'
import type { VariantUnitCombination } from '@/types/database'
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
  variant_unit_combinations?: VariantUnitCombination[]
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
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [showCustomerQuickAdd, setShowCustomerQuickAdd] = useState(false)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null)
  const [variantUnitModalOpen, setVariantUnitModalOpen] = useState(false)
  const [selectedProductForVariantUnit, setSelectedProductForVariantUnit] = useState<Product | null>(null)

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
            .select('*, categories(id, name), product_variants(*, variant_units(*)), product_units(*)')
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
          
          interface VariantUnitRow {
            unit_id: string
            sell_price?: number
            cost_price?: number
            barcode?: string
            active?: boolean
          }
          
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
            product_variants?: (ProductVariant & { active?: boolean; variant_units?: VariantUnitRow[] })[]
            product_units?: (ProductUnit & { active?: boolean })[]
          }
          
          return (data as ProductRow[] || []).map((p) => {
            const units = p.product_units?.filter((u) => u.active !== false) || []
            const baseUnit = units.find(u => u.is_base_unit)
            
            // Process variants and extract base unit prices from variant_units
            const variants = (p.product_variants?.filter((v) => v.active !== false) || []).map(variant => {
              // Find base unit entry in variant_units to extract prices
              const baseUnitEntry = variant.variant_units?.find(vu => 
                vu.active !== false && (baseUnit ? vu.unit_id === baseUnit.id : true)
              )
              return {
                ...variant,
                // Extract prices from variant_units for backwards compatibility
                sell_price: baseUnitEntry?.sell_price ?? variant.sell_price,
                cost_price: baseUnitEntry?.cost_price ?? variant.cost_price,
              }
            })
            
            let variant_unit_combinations: VariantUnitCombination[] | undefined
            if (p.has_variants && p.has_units && variants.length > 0 && units.length > 0) {
              variant_unit_combinations = []
              for (const variant of variants) {
                // Get base unit price for this variant (from variant_units or fallback to product)
                const variantBasePrice = variant.sell_price ?? p.sell_price
                const variantBaseCost = variant.cost_price ?? p.cost_price
                
                for (const unit of units) {
                  const variantUnit = variant.variant_units?.find(vu => vu.unit_id === unit.id && vu.active !== false)
                  // Priority: variant_units entry > unit price > calculated from base * conversion
                  const effectiveSellPrice = variantUnit?.sell_price ?? 
                    unit.sell_price ?? 
                    Math.round(variantBasePrice * unit.conversion_rate)
                  const effectiveCostPrice = variantUnit?.cost_price ?? 
                    unit.cost_price ?? 
                    Math.round(variantBaseCost * unit.conversion_rate)
                  
                  variant_unit_combinations.push({
                    product_id: p.id,
                    product_name: p.name,
                    variant_id: variant.id,
                    variant_name: variant.name || '',
                    variant_quantity: variant.quantity,
                    variant_sell_price: variantBasePrice,
                    variant_cost_price: variantBaseCost,
                    unit_id: unit.id,
                    unit_name: unit.unit_name,
                    conversion_rate: unit.conversion_rate,
                    is_base_unit: unit.is_base_unit,
                    variant_unit_id: null,
                    effective_sell_price: effectiveSellPrice,
                    effective_cost_price: effectiveCostPrice,
                    effective_barcode: variantUnit?.barcode ?? null,
                    display_name: `${variant.name} (${unit.unit_name})`,
                  })
                }
              }
            }
            
            return {
              ...p,
              variants,
              units,
              variant_unit_combinations,
            }
          }) as Product[]
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
        .select('id, bank_name, account_number, is_default')
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
        sale_id: result.sale.id,
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
        saleId: data.sale_id,
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
    // If product has both variants and units, show variant-unit selector
    if (product.has_variants && product.has_units && product.variants && product.variants.length > 0 && product.units && product.units.length > 0) {
      setSelectedProductForVariantUnit(product)
      setVariantUnitModalOpen(true)
      return
    }

    // If product only has variants (no units)
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product)
      setVariantModalOpen(true)
      return
    }

    // If product only has units (no variants)
    if (product.has_units && product.units && product.units.length > 1) {
      setSelectedProductForUnit(product)
      setUnitModalOpen(true)
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
      sell_price: variant.sell_price ?? product.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
      variant_id: variant.id,
      variant_name: variant.name,
    })
    message.success(`Da them ${product.name} - ${variant.name}`)
  }

  const handleUnitSelect = (product: ProductWithUnits, unit: ModalProductUnit, calculatedPrice: number) => {
    if (product.quantity <= 0) {
      message.warning('San pham da het hang')
      return
    }

    multiOrder.addItem({
      id: product.id,
      name: product.name,
      sell_price: calculatedPrice,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
      unit_id: unit.id,
      unit_name: unit.unit_name,
      conversion_rate: unit.conversion_rate,
    })
    message.success(`Da them ${product.name} (${unit.unit_name})`)
  }

  const handleVariantUnitSelect = (product: ProductWithVariantUnits, combination: VariantUnitCombination) => {
    if (combination.variant_quantity <= 0) {
      message.warning('San pham da het hang')
      return
    }

    multiOrder.addItemWithVariant({
      id: product.id,
      name: product.name,
      sell_price: combination.effective_sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
      variant_id: combination.variant_id,
      variant_name: combination.display_name,
      unit_id: combination.unit_id,
      unit_name: combination.unit_name,
      conversion_rate: combination.conversion_rate,
    })
    message.success(`Da them ${combination.display_name}`)
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
      <>
        <CheckoutSuccess
          invoiceData={completedSale}
          onNewSale={handleNewSale}
          onPrint={() => window.print()}
          onViewDetails={completedSale.saleId ? () => setOrderDetailOpen(true) : undefined}
        />
        <OrderDetailScreen
          saleId={completedSale.saleId || null}
          open={orderDetailOpen}
          onClose={() => setOrderDetailOpen(false)}
        />
      </>
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
            onBack={() => {
              setStep('pos')
              setCartOpen(true)
            }}
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

      <UnitSelectorModal
        open={unitModalOpen}
        onClose={() => {
          setUnitModalOpen(false)
          setSelectedProductForUnit(null)
        }}
        product={selectedProductForUnit}
        onSelectUnit={handleUnitSelect}
      />

      <VariantUnitSelectorModal
        open={variantUnitModalOpen}
        onClose={() => {
          setVariantUnitModalOpen(false)
          setSelectedProductForVariantUnit(null)
        }}
        product={selectedProductForVariantUnit as ProductWithVariantUnits}
        onSelectVariantUnit={handleVariantUnitSelect}
      />
    </div>
  )
}
