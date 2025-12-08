'use client'

import { Card, Typography, Tag, Image } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useCartStore } from '@/lib/stores/cart'
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
}

interface ProductCardProps {
  product: Product
  onClick?: () => void
  showAddToCart?: boolean
}

export function ProductCard({ product, onClick, showAddToCart = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      sell_price: product.sell_price,
      vat_rate: product.vat_rate,
      image_url: product.image_url,
    })
  }

  const isLowStock = product.quantity <= product.min_stock
  const isOutOfStock = product.quantity === 0

  return (
    <Card
      hoverable
      onClick={onClick}
      className="h-full"
      cover={
        product.image_url ? (
          <Image
            alt={product.name}
            src={product.image_url}
            className="h-32 object-cover"
            preview={false}
            fallback="/icons/icon-96x96.png"
          />
        ) : (
          <div className="h-32 bg-gray-100 flex items-center justify-center">
            <ShoppingCartOutlined className="text-4xl text-gray-300" />
          </div>
        )
      }
      actions={
        showAddToCart
          ? [
              <div
                key="add"
                onClick={handleAddToCart}
                className={`text-blue-500 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ShoppingCartOutlined /> Thêm
              </div>,
            ]
          : undefined
      }
    >
      <Card.Meta
        title={
          <Text ellipsis={{ tooltip: product.name }} className="text-sm font-medium">
            {product.name}
          </Text>
        }
        description={
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Text strong className="text-blue-600">
                {product.sell_price.toLocaleString('vi-VN')}đ
              </Text>
              <Text type="secondary" className="text-xs">
                /{product.unit}
              </Text>
            </div>
            <div className="flex items-center gap-1">
              {isOutOfStock ? (
                <Tag color="red">Hết hàng</Tag>
              ) : isLowStock ? (
                <Tag color="orange">Sắp hết ({product.quantity})</Tag>
              ) : (
                <Tag color="green">Còn {product.quantity}</Tag>
              )}
            </div>
            {product.categories && (
              <Text type="secondary" className="text-xs block">
                {product.categories.name}
              </Text>
            )}
          </div>
        }
      />
    </Card>
  )
}
