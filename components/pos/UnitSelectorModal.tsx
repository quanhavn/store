'use client'

import { Modal, List, Typography, Tag, Empty, Spin } from 'antd'
import { useTranslations } from 'next-intl'

const { Text } = Typography

export interface ProductUnit {
  id: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

export interface ProductWithUnits {
  id: string
  name: string
  sell_price: number
  cost_price: number
  vat_rate: number
  quantity: number
  unit: string
  image_url?: string
  has_units?: boolean
  units?: ProductUnit[]
}

interface UnitSelectorModalProps {
  open: boolean
  onClose: () => void
  product: ProductWithUnits | null
  onSelectUnit: (product: ProductWithUnits, unit: ProductUnit, calculatedPrice: number) => void
  loading?: boolean
}

export function UnitSelectorModal({
  open,
  onClose,
  product,
  onSelectUnit,
  loading = false,
}: UnitSelectorModalProps) {
  const t = useTranslations('pos')
  const tProducts = useTranslations('products')

  if (!product) return null

  const units = product.units || []

  const calculatePrice = (unit: ProductUnit): number => {
    if (unit.sell_price !== null && unit.sell_price !== undefined) {
      return unit.sell_price
    }
    return Math.round(product.sell_price * unit.conversion_rate)
  }

  const handleSelectUnit = (unit: ProductUnit) => {
    const price = calculatePrice(unit)
    onSelectUnit(product, unit, price)
    onClose()
  }

  return (
    <Modal
      title={`${tProducts('units.selectUnit')} - ${product.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : units.length === 0 ? (
        <Empty description={tProducts('units.noUnits')} />
      ) : (
        <List
          dataSource={units}
          renderItem={(unit) => {
            const price = calculatePrice(unit)
            return (
              <List.Item
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSelectUnit(unit)}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <span>{unit.unit_name}</span>
                      {unit.is_base_unit && (
                        <Tag color="blue">{tProducts('units.baseUnit')}</Tag>
                      )}
                      {unit.is_default && (
                        <Tag color="green">{tProducts('units.default')}</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div className="text-sm text-gray-500">
                      {unit.conversion_rate > 1 && (
                        <span>x{unit.conversion_rate} {tProducts('units.baseUnit').toLowerCase()}</span>
                      )}
                    </div>
                  }
                />
                <Text strong className="text-blue-600">
                  {price.toLocaleString('vi-VN')}đ
                </Text>
              </List.Item>
            )
          }}
        />
      )}
    </Modal>
  )
}
