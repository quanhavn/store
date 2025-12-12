'use client'

import { Modal, List, Typography, Tag, Empty, Spin, Divider } from 'antd'
import { useTranslations } from 'next-intl'
import type { VariantUnitCombination } from '@/types/database'

const { Text } = Typography

export interface ProductWithVariantUnits {
  id: string
  name: string
  sell_price: number
  cost_price: number
  vat_rate: number
  quantity: number
  unit: string
  image_url?: string
  has_variants?: boolean
  has_units?: boolean
  variant_unit_combinations?: VariantUnitCombination[]
}

interface VariantUnitSelectorModalProps {
  open: boolean
  onClose: () => void
  product: ProductWithVariantUnits | null
  onSelectVariantUnit: (
    product: ProductWithVariantUnits,
    combination: VariantUnitCombination
  ) => void
  loading?: boolean
  checkStock?: boolean
  showCostPrice?: boolean  // For inventory import, show cost price instead of sell price
}

export function VariantUnitSelectorModal({
  open,
  onClose,
  product,
  onSelectVariantUnit,
  loading = false,
  checkStock = true,
  showCostPrice = false,
}: VariantUnitSelectorModalProps) {
  const t = useTranslations('pos')
  const tProducts = useTranslations('products')

  if (!product) return null

  const combinations = product.variant_unit_combinations || []

  const groupedByVariant = combinations.reduce((acc, combo) => {
    if (!acc[combo.variant_id]) {
      acc[combo.variant_id] = {
        variant_name: combo.variant_name,
        variant_quantity: combo.variant_quantity,
        items: [],
      }
    }
    acc[combo.variant_id].items.push(combo)
    return acc
  }, {} as Record<string, { variant_name: string; variant_quantity: number; items: VariantUnitCombination[] }>)

  const handleSelect = (combination: VariantUnitCombination) => {
    if (checkStock && combination.variant_quantity <= 0) return
    onSelectVariantUnit(product, combination)
    onClose()
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + 'đ'
  }

  return (
    <Modal
      title={`${tProducts('variants.selectVariantUnit')} - ${product.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : combinations.length === 0 ? (
        <Empty description={tProducts('variants.noVariantUnits')} />
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedByVariant).map(([variantId, group], index) => {
            const isOutOfStock = group.variant_quantity <= 0
            const baseUnitName = group.items.find(i => i.is_base_unit)?.unit_name || 'đơn vị'
            return (
              <div key={variantId}>
                {index > 0 && <Divider className="my-2" />}
                <div className="mb-2">
                  <Text strong className="text-base">{group.variant_name}</Text>
                  {isOutOfStock && checkStock && (
                    <Tag color="red" className="ml-2">{t('outOfStock')}</Tag>
                  )}
                  <Text type="secondary" className="ml-2 text-sm">
                    (Tồn: {group.variant_quantity})
                  </Text>
                </div>
                <List
                  dataSource={group.items}
                  split={false}
                  renderItem={(item) => (
                    <List.Item
                      className={`cursor-pointer hover:bg-gray-50 rounded px-2 py-1 ${
                        checkStock && isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => handleSelect(item)}
                    >
                      <div className="flex justify-between w-full items-center">
                        <div className="flex items-center gap-2">
                          <Tag color="blue">{item.unit_name}</Tag>
                          {!item.is_base_unit && item.conversion_rate > 1 && (
                            <Text type="secondary" className="text-xs">
                              = {item.conversion_rate} {baseUnitName}
                            </Text>
                          )}
                        </div>
                        <div className="text-right">
                          <Text strong className="text-blue-600">
                            {formatPrice(showCostPrice ? item.effective_cost_price : item.effective_sell_price)}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
