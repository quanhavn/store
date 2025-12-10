'use client'

import { List, Empty, Tag, Badge, Typography, Spin, Button, Collapse } from 'antd'
import { WarningOutlined, PlusOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { api } from '@/lib/supabase/functions'
import { useInventoryStore } from '@/lib/stores/inventory'

const { Text } = Typography

interface LowStockVariant {
  id: string
  name: string | null
  sku: string | null
  barcode: string | null
  quantity: number
  min_stock: number
  cost_price: number | null
}

interface LowStockProduct {
  id: string
  name: string
  sku?: string | null
  unit: string
  quantity: number
  min_stock: number
  cost_price?: number
  categories?: { name: string } | null
  has_variants?: boolean
  variant_count?: number
  low_stock_variants?: LowStockVariant[]
}

export function LowStockAlerts() {
  const { addAdjustmentItem, setAdjustmentType, setShouldNavigateToAdjustment } = useInventoryStore()
  const t = useTranslations('inventory')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const { data: lowStockProducts = [], isLoading } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const result = await api.inventory.lowStock()
      return result.products as LowStockProduct[]
    },
    refetchInterval: 60000,
  })

  const outOfStockCount = lowStockProducts.filter((p) => p.quantity <= 0).length
  const lowStockCount = lowStockProducts.filter((p) => p.quantity > 0).length

  const toggleExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleQuickImport = (product: LowStockProduct, variant?: LowStockVariant) => {
    setAdjustmentType('import')
    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: variant?.quantity ?? product.quantity,
      cost_price: variant?.cost_price ?? product.cost_price ?? 0,
      variant_id: variant?.id,
      variant_name: variant?.name ?? undefined,
    })
    setShouldNavigateToAdjustment(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (lowStockProducts.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('noLowStockProducts')}
        className="my-8"
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          <div className="text-xs text-red-500">{t('outOfStock')}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
          <div className="text-xs text-orange-500">{t('runningLow')}</div>
        </div>
      </div>

      <List
        dataSource={lowStockProducts}
        renderItem={(product) => {
          const isOutOfStock = product.quantity <= 0
          const neededQuantity = Math.max(0, product.min_stock * 2 - product.quantity)
          const hasLowStockVariants = product.has_variants && product.low_stock_variants && product.low_stock_variants.length > 0
          const isExpanded = expandedProducts.has(product.id)

          return (
            <List.Item className="!px-0 !block">
              <div className="w-full">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {hasLowStockVariants ? (
                        <button
                          onClick={() => toggleExpanded(product.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? <DownOutlined className="text-xs" /> : <RightOutlined className="text-xs" />}
                        </button>
                      ) : (
                        <Badge
                          status={isOutOfStock ? 'error' : 'warning'}
                          className="flex-shrink-0"
                        />
                      )}
                      <span className="font-medium truncate">{product.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-4 flex gap-1 flex-wrap">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.categories && (
                        <Tag color="blue" className="text-xs">
                          {product.categories.name}
                        </Tag>
                      )}
                      {hasLowStockVariants && (
                        <Tag color="red" className="text-xs">
                          {t('variantsLowStock', { count: product.low_stock_variants!.length })}
                        </Tag>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {!hasLowStockVariants && (
                      <Tag color={isOutOfStock ? 'red' : 'orange'}>
                        {isOutOfStock ? (
                          <span className="flex items-center gap-1">
                            <WarningOutlined /> {t('outOfStock')}
                          </span>
                        ) : (
                          `${t('inStock')} ${product.quantity}`
                        )}
                      </Tag>
                    )}
                  </div>
                </div>

                {!hasLowStockVariants && (
                  <div className="flex justify-between items-center mt-2 ml-4">
                    <div className="text-xs text-gray-500">
                      <span>{t('minimum')}: {product.min_stock} {product.unit}</span>
                      <span className="mx-2">|</span>
                      <span>{t('needToOrder')}: ~{neededQuantity} {product.unit}</span>
                    </div>
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleQuickImport(product)}
                    >
                      {t('quickImport')}
                    </Button>
                  </div>
                )}

                {/* Variant-level low stock details */}
                {hasLowStockVariants && isExpanded && (
                  <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-3">
                    {product.low_stock_variants!.map((variant) => {
                      const variantOutOfStock = variant.quantity <= 0
                      const variantNeeded = Math.max(0, variant.min_stock * 2 - variant.quantity)

                      return (
                        <div key={variant.id} className="py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  status={variantOutOfStock ? 'error' : 'warning'}
                                  className="flex-shrink-0"
                                />
                                <span className="text-sm">{variant.name || variant.sku || variant.id.slice(0, 8)}</span>
                              </div>
                              <div className="text-xs text-gray-400 ml-4 mt-1">
                                {variant.sku && <span>SKU: {variant.sku}</span>}
                                {variant.barcode && <span className="ml-2">Barcode: {variant.barcode}</span>}
                              </div>
                            </div>
                            <Tag color={variantOutOfStock ? 'red' : 'orange'} className="text-xs">
                              {variantOutOfStock ? t('outOfStock') : `${t('inStock')} ${variant.quantity}`}
                            </Tag>
                          </div>
                          <div className="flex justify-between items-center mt-1 ml-4">
                            <div className="text-xs text-gray-400">
                              <span>{t('minimum')}: {variant.min_stock} {product.unit}</span>
                              <span className="mx-2">|</span>
                              <span>{t('needToOrder')}: ~{variantNeeded}</span>
                            </div>
                            <Button
                              type="link"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleQuickImport(product, variant)}
                            >
                              {t('quickImport')}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </List.Item>
          )
        }}
      />

      <div className="bg-gray-50 p-3 rounded-lg mt-4">
        <Text type="secondary" className="text-xs">
          {t('lowStockInfo')}
        </Text>
      </div>
    </div>
  )
}
