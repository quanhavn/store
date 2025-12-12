'use client'

import { useState, useCallback } from 'react'
import { Button, FloatButton, Dropdown, message } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductSearch } from '@/components/products/ProductSearch'
import { CategoryFilter } from '@/components/products/CategoryFilter'
import { ProductFormAdvanced } from '@/components/products/ProductFormAdvanced'
import { CSVImportModal } from '@/components/import'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import type { ProductAttribute, ProductUnit, ProductVariant } from '@/types/database'

interface Product {
  id: string
  name: string
  sell_price: number
  cost_price: number
  vat_rate: number
  pit_rate?: number
  quantity: number
  min_stock: number
  unit: string
  image_url?: string
  barcode?: string
  sku?: string
  category_id?: string
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

interface ProductFormData {
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  cost_price: number
  sell_price: number
  vat_rate: number
  pit_rate: number
  quantity: number
  min_stock: number
  unit: string
  image_url?: string
  has_variants?: boolean
  has_units?: boolean
}

interface UnitFormData {
  id?: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

interface VariantFormData {
  id?: string
  sku?: string
  barcode?: string
  name?: string
  cost_price?: number
  sell_price?: number
  quantity: number
  min_stock?: number
  attribute_values: { attribute_id: string; value_id: string }[]
  unit_prices?: { unit_id: string; sell_price?: number; cost_price?: number; barcode?: string; sku?: string }[]
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

  // Fetch attributes
  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const result = await api.attributes.list()
      return (result.attributes || []) as ProductAttribute[]
    },
  })

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async ({ data, units, variants }: { 
      data: ProductFormData
      units?: UnitFormData[]
      variants?: VariantFormData[]
    }) => {
      const result = await api.products.create({
        ...data,
        units: units?.map(u => ({
          unit_name: u.unit_name,
          conversion_rate: u.conversion_rate,
          barcode: u.barcode,
          sell_price: u.sell_price,
          cost_price: u.cost_price,
          is_base_unit: u.is_base_unit,
          is_default: u.is_default,
        })),
        variants: variants?.map(v => ({
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          cost_price: v.cost_price,
          sell_price: v.sell_price,
          quantity: v.quantity,
          min_stock: v.min_stock,
          attribute_values: v.attribute_values,
          unit_prices: v.unit_prices,
        })),
      })
      return result.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data, units, variants }: { 
      id: string
      data: ProductFormData
      units?: UnitFormData[]
      variants?: VariantFormData[]
    }) => {
      const result = await api.products.update(id, {
        ...data,
        units: units?.map(u => ({
          id: u.id?.startsWith('temp-') ? undefined : u.id,
          unit_name: u.unit_name,
          conversion_rate: u.conversion_rate,
          barcode: u.barcode,
          sell_price: u.sell_price,
          cost_price: u.cost_price,
          is_base_unit: u.is_base_unit,
          is_default: u.is_default,
        })),
        variants: variants?.map(v => ({
          id: v.id?.startsWith('temp-') ? undefined : v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          cost_price: v.cost_price,
          sell_price: v.sell_price,
          quantity: v.quantity,
          min_stock: v.min_stock,
          attribute_values: v.attribute_values,
          unit_prices: v.unit_prices,
        })),
      })
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

  const handleFormSubmit = async (
    data: ProductFormData, 
    units?: UnitFormData[], 
    variants?: VariantFormData[]
  ) => {
    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, data, units, variants })
    } else {
      await createMutation.mutateAsync({ data, units, variants })
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditProduct(undefined)
  }

  const handleCategoryCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }, [queryClient])

  const handleAttributesChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['attributes'] })
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

  // Prepare initial values for edit
  const initialFormValues = editProduct ? {
    name: editProduct.name,
    sku: editProduct.sku,
    barcode: editProduct.barcode,
    category_id: editProduct.category_id || editProduct.categories?.id,
    cost_price: editProduct.cost_price,
    sell_price: editProduct.sell_price,
    vat_rate: editProduct.vat_rate,
    pit_rate: editProduct.pit_rate || 0.5,
    quantity: editProduct.quantity,
    min_stock: editProduct.min_stock,
    unit: editProduct.unit,
    image_url: editProduct.image_url,
    has_variants: editProduct.has_variants,
    has_units: editProduct.has_units,
  } : undefined

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

      <ProductFormAdvanced
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        attributes={attributes}
        onAttributesChange={handleAttributesChange}
        initialValues={initialFormValues}
        initialUnits={editProduct?.units}
        initialVariants={editProduct?.variants}
        title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      />

      {/* CSV Import Modal */}
      <CSVImportModal />
    </div>
  )
}
