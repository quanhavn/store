'use client'

import { useState, useCallback } from 'react'
import { FloatButton, Badge, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { CartSheet } from '@/components/pos/CartSheet'
import { PaymentMethods, type PaymentInfo } from '@/components/pos/PaymentMethods'
import { CheckoutSuccess } from '@/components/pos/CheckoutSuccess'
import { useCartStore } from '@/lib/stores/cart'

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
  const cart = useCartStore()
  const itemCount = cart.getItemCount()
  const total = cart.getTotal()

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, categoryId],
    queryFn: async () => {
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
    },
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order')
        .order('name')

      if (error) throw error
      return data as Category[]
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
  })

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (payments: PaymentInfo[]) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('store_id')
        .eq('id', user.id)
        .single()

      if (!userData) throw new Error('No store found')
      const storeId = (userData as { store_id: string }).store_id
      if (!storeId) throw new Error('No store found')

      // Generate invoice number
      const now = new Date()
      const prefix = `HD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
      const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .like('invoice_no', `${prefix}%`)

      const invoice_no = `${prefix}${String((count || 0) + 1).padStart(4, '0')}`

      // Calculate totals
      const subtotal = cart.getSubtotal()
      const vat_amount = cart.getVatAmount()
      const saleTotal = cart.getTotal()

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: storeId,
          user_id: user.id,
          invoice_no,
          subtotal,
          vat_amount,
          discount: cart.discount,
          total: saleTotal,
          status: 'completed',
          customer_name: cart.customer_name || null,
          customer_phone: cart.customer_phone || null,
          customer_tax_code: cart.customer_tax_code || null,
          note: cart.note || null,
          completed_at: new Date().toISOString(),
        } as never)
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.items.map((item) => ({
        sale_id: (sale as { id: string }).id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        vat_amount: (item.quantity * item.unit_price - item.discount) * (item.vat_rate / 100),
        discount: item.discount,
        total: item.quantity * item.unit_price - item.discount,
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems as never)

      if (itemsError) throw itemsError

      // Create payments
      const paymentRecords = payments.map((p) => ({
        sale_id: (sale as { id: string }).id,
        method: p.method,
        amount: p.amount,
        bank_account_id: p.bank_account_id || null,
        bank_ref: p.bank_ref || null,
      }))

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentRecords as never)

      if (paymentsError) throw paymentsError

      return { invoice_no, total: saleTotal }
    },
    onSuccess: (data) => {
      setCompletedSale(data)
      setStep('success')
      cart.clear()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleProductClick = (product: Product) => {
    if (product.quantity <= 0) {
      message.warning('Sản phẩm đã hết hàng')
      return
    }
    cart.addItem({
      id: product.id,
      name: product.name,
      sell_price: product.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
    })
    message.success(`Đã thêm ${product.name}`)
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
        <h1 className="text-xl font-bold mb-4">Thanh toán</h1>
        <PaymentMethods
          total={total}
          onConfirm={handlePaymentConfirm}
          loading={createSaleMutation.isPending}
          bankAccounts={bankAccounts}
        />
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold mb-4">Bán hàng</h1>
        <ProductSearch onSearch={handleSearch} />
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
