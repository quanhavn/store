'use client'

import { useState } from 'react'
import { Row, Col, Empty, Spin, Segmented } from 'antd'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { ProductCard } from './ProductCard'

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

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  onProductClick?: (product: Product) => void
  showAddToCart?: boolean
}

export function ProductGrid({
  products,
  loading = false,
  onProductClick,
  showAddToCart = false,
}: ProductGridProps) {
  const t = useTranslations('products')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('noProducts')}
        className="py-12"
      />
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'grid' | 'list')}
          options={[
            { value: 'grid', icon: <AppstoreOutlined /> },
            { value: 'list', icon: <BarsOutlined /> },
          ]}
        />
      </div>

      <Row gutter={[12, 12]}>
        {products.map((product) => (
          <Col
            key={product.id}
            xs={viewMode === 'grid' ? 12 : 24}
            sm={viewMode === 'grid' ? 8 : 24}
            md={viewMode === 'grid' ? 6 : 24}
            lg={viewMode === 'grid' ? 6 : 24}
          >
            <ProductCard
              product={product}
              onClick={() => onProductClick?.(product)}
              showAddToCart={showAddToCart}
            />
          </Col>
        ))}
      </Row>
    </div>
  )
}
