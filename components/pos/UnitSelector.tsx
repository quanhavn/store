'use client'

import { Select } from 'antd'
import { useTranslations } from 'next-intl'

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

interface UnitSelectorProps {
  units: ProductUnit[]
  selectedUnitId?: string
  baseSellPrice: number
  onChange: (unit: ProductUnit, calculatedPrice: number) => void
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
}

export function UnitSelector({
  units,
  selectedUnitId,
  baseSellPrice,
  onChange,
  disabled = false,
  size = 'small',
}: UnitSelectorProps) {
  const t = useTranslations('products')

  if (units.length <= 1) return null

  const calculatePrice = (unit: ProductUnit): number => {
    if (unit.sell_price !== null && unit.sell_price !== undefined) {
      return unit.sell_price
    }
    return Math.round(baseSellPrice * unit.conversion_rate)
  }

  const handleChange = (unitId: string) => {
    const unit = units.find(u => u.id === unitId)
    if (unit) {
      onChange(unit, calculatePrice(unit))
    }
  }

  return (
    <Select
      size={size}
      value={selectedUnitId || units.find(u => u.is_default)?.id || units[0]?.id}
      onChange={handleChange}
      disabled={disabled}
      className="w-20"
      options={units.map(unit => ({
        value: unit.id,
        label: (
          <div className="flex items-center justify-between">
            <span>{unit.unit_name}</span>
            {unit.is_base_unit && (
              <span className="text-xs text-gray-400 ml-1">*</span>
            )}
          </div>
        ),
      }))}
    />
  )
}

export function formatUnitPrice(unit: ProductUnit, baseSellPrice: number): string {
  const price = unit.sell_price ?? Math.round(baseSellPrice * unit.conversion_rate)
  return price.toLocaleString('vi-VN')
}
