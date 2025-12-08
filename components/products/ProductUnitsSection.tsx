'use client'

import { Button, Input, InputNumber, Switch, Table, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import type { ColumnsType } from 'antd/es/table'

export interface ProductUnitInput {
  id?: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

interface ProductUnitsSectionProps {
  units: ProductUnitInput[]
  onChange: (units: ProductUnitInput[]) => void
  baseUnit?: string
  baseSellPrice?: number
  baseCostPrice?: number
  disabled?: boolean
}

export function ProductUnitsSection({
  units,
  onChange,
  baseUnit = 'cái',
  baseSellPrice = 0,
  baseCostPrice = 0,
  disabled = false,
}: ProductUnitsSectionProps) {
  useEffect(() => {
    if (units.length === 0) {
      onChange([{
        id: `temp-${Date.now()}`,
        unit_name: baseUnit,
        conversion_rate: 1,
        is_base_unit: true,
        is_default: true,
        sell_price: baseSellPrice,
        cost_price: baseCostPrice,
      }])
    }
  }, [units.length, baseUnit, baseSellPrice, baseCostPrice, onChange])

  const handleAdd = () => {
    const newUnit: ProductUnitInput = {
      id: `temp-${Date.now()}`,
      unit_name: '',
      conversion_rate: 1,
      is_base_unit: false,
      is_default: false,
    }
    onChange([...units, newUnit])
  }

  const handleDelete = (id: string) => {
    const unit = units.find(u => u.id === id)
    if (unit?.is_base_unit) {
      message.warning('Không thể xóa đơn vị cơ bản')
      return
    }
    onChange(units.filter(u => u.id !== id))
  }

  const handleChange = (id: string, field: keyof ProductUnitInput, value: unknown) => {
    onChange(units.map(u => {
      if (u.id === id) {
        const updated = { ...u, [field]: value }

        if (field === 'is_base_unit' && value === true) {
          updated.conversion_rate = 1
          return updated
        }

        if (field === 'is_default' && value === true) {
          return updated
        }

        return updated
      }

      if (field === 'is_base_unit' && value === true) {
        return { ...u, is_base_unit: false }
      }

      if (field === 'is_default' && value === true) {
        return { ...u, is_default: false }
      }

      return u
    }))
  }

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-'
    return `${value.toLocaleString('vi-VN')}đ`
  }

  const columns: ColumnsType<ProductUnitInput> = [
    {
      title: 'Tên đơn vị',
      dataIndex: 'unit_name',
      key: 'unit_name',
      width: 120,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleChange(record.id!, 'unit_name', e.target.value)}
          placeholder="VD: hộp"
          disabled={disabled}
          size="small"
        />
      ),
    },
    {
      title: 'Quy đổi',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      width: 100,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={(v) => handleChange(record.id!, 'conversion_rate', v)}
          min={0.0001}
          step={1}
          disabled={disabled || record.is_base_unit}
          size="small"
          className="w-full"
        />
      ),
    },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      key: 'sell_price',
      width: 130,
      render: (value, record) => (
        <InputNumber<number>
          value={value}
          onChange={(v) => handleChange(record.id!, 'sell_price', v)}
          min={0}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
          placeholder={record.is_base_unit ? undefined : formatCurrency(baseSellPrice * record.conversion_rate)}
          disabled={disabled}
          size="small"
          className="w-full"
        />
      ),
    },
    {
      title: 'Mã vạch',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 120,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleChange(record.id!, 'barcode', e.target.value)}
          placeholder="..."
          disabled={disabled}
          size="small"
        />
      ),
    },
    {
      title: 'Cơ bản',
      dataIndex: 'is_base_unit',
      key: 'is_base_unit',
      width: 70,
      align: 'center',
      render: (value, record) => (
        <Switch
          checked={value}
          onChange={(v) => handleChange(record.id!, 'is_base_unit', v)}
          disabled={disabled || units.length <= 1}
          size="small"
        />
      ),
    },
    {
      title: 'Mặc định',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      align: 'center',
      render: (value, record) => (
        <Switch
          checked={value}
          onChange={(v) => handleChange(record.id!, 'is_default', v)}
          disabled={disabled}
          size="small"
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Xóa đơn vị này?"
          onConfirm={() => handleDelete(record.id!)}
          disabled={disabled || record.is_base_unit}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled || record.is_base_unit}
            size="small"
          />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Đơn vị tính</span>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={disabled}
        >
          Thêm đơn vị
        </Button>
      </div>

      <Table
        dataSource={units}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
        locale={{ emptyText: 'Chưa có đơn vị' }}
      />

      <p className="text-xs text-gray-500">
        Quy đổi: Số lượng đơn vị cơ bản trong 1 đơn vị này (VD: 1 hộp = 12 cái → quy đổi = 12)
      </p>
    </div>
  )
}
