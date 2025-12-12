'use client'

import { Card, Typography, Tag, Image, message } from 'antd'
import { ShoppingCartOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'

const { Text } = Typography

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
  }>
}

interface ProductCardProps {
  product: Product
  onClick?: () => void
  showAddToCart?: boolean
}

export function ProductCard({ product, onClick, showAddToCart = false }: ProductCardProps) {
  const t = useTranslations('products')

  const hasVariants = product.has_variants && product.variants && product.variants.length > 0
  const hasUnits = product.has_units
  
  // Calculate display quantity based on variants/units
  let displayQuantity = product.quantity
  if (hasVariants && product.variants) {
    displayQuantity = product.variants.reduce((sum, v) => sum + v.quantity, 0)
  }
  
  const isLowStock = displayQuantity <= product.min_stock
  const isOutOfStock = displayQuantity === 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isOutOfStock) {
      message.warning(t('outOfStock'))
      return
    }
    
    onClick?.()
  }

  return (
    <div 
      onClick={onClick}
      className={`
        relative bg-white rounded-lg border border-gray-200 overflow-hidden
        active:bg-gray-50 cursor-pointer transition-colors
        ${isOutOfStock ? 'opacity-60' : ''}
      `}
    >
      {/* Compact image */}
      <div className="relative h-20 bg-gray-100">
        {product.image_url ? (
          <Image
            alt={product.name}
            src={product.image_url}
            className="w-full h-20 object-cover"
            preview={false}
            fallback="/icons/icon-96x96.png"
          />
        ) : (
          <div className="w-full h-20 flex items-center justify-center">
            <ShoppingCartOutlined className="text-2xl text-gray-300" />
          </div>
        )}
        
        {/* Stock badge - top right corner */}
        <div className="absolute top-1 right-1">
          {isOutOfStock ? (
            <Tag color="red" className="!m-0 !text-[10px] !px-1 !py-0">{t('outOfStock')}</Tag>
          ) : isLowStock ? (
            <Tag color="orange" className="!m-0 !text-[10px] !px-1 !py-0">{displayQuantity}</Tag>
          ) : (
            <Tag color="green" className="!m-0 !text-[10px] !px-1 !py-0">{displayQuantity}</Tag>
          )}
        </div>

        {/* Variant/Unit badge - top left corner */}
        {hasVariants && (
          <div className="absolute top-1 left-1">
            <Tag color="purple" className="!m-0 !text-[10px] !px-1 !py-0">
              {product.variants!.length} {t('variantBadge')}
            </Tag>
          </div>
        )}
        {!hasVariants && hasUnits && (
          <div className="absolute top-1 left-1">
            <Tag color="cyan" className="!m-0 !text-[10px] !px-1 !py-0">
              {t('multiUnit')}
            </Tag>
          </div>
        )}
      </div>

      {/* Content - more compact */}
      <div className="p-2">
        <Text 
          ellipsis={{ tooltip: product.name }} 
          className="!text-xs font-medium leading-tight block mb-1"
        >
          {product.name}
        </Text>
        
        <div className="flex items-center justify-between">
          <Text strong className="text-blue-600 !text-sm">
            {product.sell_price.toLocaleString('vi-VN')}đ
          </Text>
          {product.unit && (
            <Text type="secondary" className="!text-[10px]">
              /{product.unit}
            </Text>
          )}
        </div>
      </div>

      {/* Add to cart button - floating on bottom right */}
      {showAddToCart && (
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`
            absolute bottom-2 right-2 w-7 h-7 rounded-full 
            flex items-center justify-center text-white text-sm
            ${isOutOfStock 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 active:bg-blue-600 shadow-md'
            }
          `}
        >
          <PlusOutlined />
        </button>
      )}
    </div>
  )
}
