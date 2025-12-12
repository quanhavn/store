'use client'

import { Modal, List, Typography, Tag, Empty, Spin } from 'antd'
import { useTranslations } from 'next-intl'

const { Text } = Typography

export interface ProductVariant {
  id: string
  name: string
  sku?: string
  barcode?: string
  sell_price?: number
  cost_price?: number
  quantity: number
  min_stock?: number
}

export interface ProductWithVariants {
  id: string
  name: string
  sell_price: number
  vat_rate: number
  image_url?: string
  has_variants?: boolean
  variants?: ProductVariant[]
}

interface VariantSelectorModalProps {
  open: boolean
  onClose: () => void
  product: ProductWithVariants | null
  onSelectVariant: (product: ProductWithVariants, variant: ProductVariant) => void
  loading?: boolean
}

export function VariantSelectorModal({
  open,
  onClose,
  product,
  onSelectVariant,
  loading = false,
}: VariantSelectorModalProps) {
  const t = useTranslations('pos')
  const tProducts = useTranslations('products')

  if (!product) return null

  const variants = product.variants || []

  const handleSelectVariant = (variant: ProductVariant) => {
    if (variant.quantity <= 0) return
    onSelectVariant(product, variant)
    onClose()
  }

  return (
    <Modal
      title={`${tProducts('variants.selectVariant')} - ${product.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : variants.length === 0 ? (
        <Empty description={tProducts('variants.noVariants')} />
      ) : (
        <List
          dataSource={variants}
          renderItem={(variant) => {
            const isOutOfStock = variant.quantity <= 0
            return (
              <List.Item
                className={`cursor-pointer hover:bg-gray-50 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleSelectVariant(variant)}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <span>{variant.name}</span>
                      {isOutOfStock && (
                        <Tag color="red">{t('outOfStock')}</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div className="text-sm text-gray-500">
                      {variant.sku && <span>SKU: {variant.sku} • </span>}
                      <span>Tồn: {variant.quantity}</span>
                    </div>
                  }
                />
                <Text strong className="text-blue-600">
                  {(variant.sell_price ?? 0).toLocaleString('vi-VN')}đ
                </Text>
              </List.Item>
            )
          }}
        />
      )}
    </Modal>
  )
}
