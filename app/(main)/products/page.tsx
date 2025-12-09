'use client'

import { useState, useCallback } from 'react'
import { Button, FloatButton, Dropdown, message } from 'antd'
import { PlusOutlined, ReloadOutlined, UploadOutlined, MoreOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { ProductForm, type ProductFormData } from '@/components/products/ProductForm'
import { CSVImportModal } from '@/components/import'
import { useCSVImportStore } from '@/lib/stores/csv-import'

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
  variants?: Array<{
    id: string
    name: string
    quantity: number
    sell_price: number
    cost_price?: number
  }>
  units?: Array<{
    id: string
    unit_name: string
    conversion_rate: number
    sell_price?: number
    is_base_unit: boolean
    is_default: boolean
  }>
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
  const openImport = useCSVImportStore((state) => state.openImport)

  const queryClient = useQueryClient()

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, categoryId],
    queryFn: async () => {
      const result = await api.products.list({
        search: search || undefined,
        category_id: categoryId,
        limit: 50,
        include_variants: true,
        include_units: true,
      })
      return result.products as Product[]
    },
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await api.categories.list()
      return result.categories as Category[]
    },
  })

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const result = await api.products.create(data)
      return result.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: ProductFormData & { id: string }) => {
      const result = await api.products.update(id, data)
      return result.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleProductClick = async (product: Product) => {
    if (product.has_variants || product.has_units) {
      try {
        const result = await api.products.get(product.id, {
          include_variants: true,
          include_units: true,
        })
        setEditProduct(result.product as Product)
      } catch {
        setEditProduct(product)
      }
    } else {
      setEditProduct(product)
    }
    setFormOpen(true)
  }

  const handleFormSubmit = async (data: ProductFormData) => {
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

  const handleCategoryCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }, [queryClient])

  const importMenuItems: MenuProps['items'] = [
    {
      key: 'product',
      label: 'Import sản phẩm',
      icon: <UploadOutlined />,
      onClick: () => openImport('product'),
    },
    {
      key: 'category',
      label: 'Import danh mục',
      icon: <UploadOutlined />,
      onClick: () => openImport('category'),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Sản phẩm</h1>
          <Dropdown menu={{ items: importMenuItems }} placement="bottomRight">
            <Button icon={<UploadOutlined />}>Import CSV</Button>
          </Dropdown>
        </div>
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
        onCategoryCreated={handleCategoryCreated}
        initialValues={editProduct}
        title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      />

      {/* CSV Import Modal */}
      <CSVImportModal />
    </div>
  )
}
