'use client'

import { useState, useCallback } from 'react'
import { Button, FloatButton, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { ProductForm } from '@/components/products/ProductForm'

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

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product>()

  const supabase = createClient()
  const queryClient = useQueryClient()

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

      const { data, error } = await query.limit(50)
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

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Product, 'id'>) => {
      const { data: result, error } = await supabase
        .from('products')
        .insert(data as never)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('products')
        .update(data as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleProductClick = (product: Product) => {
    setEditProduct(product)
    setFormOpen(true)
  }

  const handleFormSubmit = async (data: Omit<Product, 'id'>) => {
    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditProduct(undefined)
  }

  return (
    <div className="p-4 pb-20">
      <div className="mb-4">
        <h1 className="text-xl font-bold mb-4">Sản phẩm</h1>
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
      />

      <FloatButton
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditProduct(undefined)
          setFormOpen(true)
        }}
        style={{ right: 24, bottom: 80 }}
      />

      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        categories={categories}
        initialValues={editProduct}
        title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      />
    </div>
  )
}
