'use client'

import { Modal, List, Typography, Empty, Spin } from 'antd'
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
  const baseUnit = units.find(u => u.is_base_unit)
  const baseUnitName = baseUnit?.unit_name || product.unit || 'cái'

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
                    <span className="font-medium">{unit.unit_name}</span>
                  }
                  description={
                    <div className="text-sm text-gray-500">
                      {!unit.is_base_unit && unit.conversion_rate > 1 && (
                        <span> = {unit.conversion_rate} {baseUnitName}</span>
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
