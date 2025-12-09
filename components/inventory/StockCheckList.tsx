'use client'

import { useState, useCallback } from 'react'
import { List, Input, Spin, Empty, Tag, Typography } from 'antd'
import { SearchOutlined, InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  quantity: number
  min_stock: number
  cost_price: number
  sell_price: number
  categories?: { id: string; name: string } | null
  has_variants?: boolean
  has_units?: boolean
  variants?: Array<{
    id: string
    name: string
    quantity: number
    sell_price: number
    cost_price?: number
  }>
}

export function StockCheckList() {
  const t = useTranslations('inventory')
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-stock', search],
    queryFn: async () => {
      const result = await api.products.list({
        search: search || undefined,
        limit: 100,
        include_variants: true,
        include_units: true,
      })
      return result.products as Product[]
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const getDisplayQuantity = (product: Product) => {
    const hasVariants = product.has_variants && product.variants && product.variants.length > 0
    return hasVariants
      ? product.variants!.reduce((sum, v) => sum + v.quantity, 0)
      : product.quantity
  }

  const getStockStatus = (product: Product) => {
    const displayQuantity = getDisplayQuantity(product)
    if (displayQuantity <= 0) {
      return { color: 'red', text: t('outOfStock') }
    }
    if (displayQuantity <= product.min_stock) {
      return { color: 'orange', text: t('runningLow') }
    }
    return { color: 'green', text: t('inStock') }
  }

  const getTotalValue = () => {
    return products.reduce((sum, p) => {
      const hasVariants = p.has_variants && p.variants && p.variants.length > 0
      if (hasVariants) {
        return sum + p.variants!.reduce((vSum, v) => vSum + v.quantity * (v.cost_price ?? p.cost_price), 0)
      }
      return sum + p.quantity * p.cost_price
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Input
        placeholder={t('searchProductPlaceholder')}
        prefix={<SearchOutlined className="text-gray-400" />}
        onChange={(e) => handleSearch(e.target.value)}
        className="mb-4"
        allowClear
      />

      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <Text type="secondary">{t('totalInventoryValue')}:</Text>
          <Text strong className="text-blue-600">{formatCurrency(getTotalValue())}</Text>
        </div>
        <div className="flex justify-between items-center mt-1">
          <Text type="secondary">{t('productCount')}:</Text>
          <Text>{products.length}</Text>
        </div>
      </div>

      {products.length === 0 ? (
        <Empty
          image={<InboxOutlined className="text-5xl text-gray-300" />}
          description={t('noProductsFound')}
        />
      ) : (
        <List
          dataSource={products}
          renderItem={(product) => {
            const status = getStockStatus(product)
            const displayQuantity = getDisplayQuantity(product)
            const hasVariants = product.has_variants && product.variants && product.variants.length > 0
            return (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.barcode && <span className="ml-2">| {product.barcode}</span>}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {product.categories && (
                          <Tag color="blue" className="text-xs">{product.categories.name}</Tag>
                        )}
                        {hasVariants && (
                          <Tag color="purple" className="text-xs">{t('variantCount', { count: product.variants!.length })}</Tag>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg">
                        {displayQuantity} <span className="text-sm font-normal text-gray-500">{product.unit}</span>
                      </div>
                      <Tag color={status.color} className="mt-1">{status.text}</Tag>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{t('minimum')}: {product.min_stock} {product.unit}</span>
                    <span>{t('costPrice')}: {formatCurrency(product.cost_price)}</span>
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      )}
    </div>
  )
}
