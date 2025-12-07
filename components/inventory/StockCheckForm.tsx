'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Input,
  InputNumber,
  List,
  Tag,
  Progress,
  Typography,
  Empty,
  Button,
  Spin,
} from 'antd'
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

export interface StockCheckItem {
  id: string
  stock_check_id: string
  product_id: string
  system_quantity: number
  actual_quantity: number | null
  difference: number | null
  note: string | null
  products: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    unit: string
    cost_price: number
    categories: { name: string } | null
  }
}

interface StockCheckFormProps {
  items: StockCheckItem[]
  onUpdateItem: (productId: string, actualQuantity: number, note?: string) => Promise<void>
  onSubmit: () => void
  isUpdating: boolean
}

export function StockCheckForm({
  items,
  onUpdateItem,
  onSubmit,
  isUpdating,
}: StockCheckFormProps) {
  const [search, setSearch] = useState('')
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search) return items
    const searchLower = search.toLowerCase()
    return items.filter(
      (item) =>
        item.products.name.toLowerCase().includes(searchLower) ||
        item.products.sku?.toLowerCase().includes(searchLower) ||
        item.products.barcode?.toLowerCase().includes(searchLower)
    )
  }, [items, search])

  // Calculate progress
  const countedItems = useMemo(
    () => items.filter((item) => item.actual_quantity !== null).length,
    [items]
  )
  const totalItems = items.length
  const progressPercent = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0

  // Calculate items with differences
  const itemsWithDifference = useMemo(
    () =>
      items.filter(
        (item) => item.actual_quantity !== null && item.difference !== 0
      ).length,
    [items]
  )

  const handleQuantityChange = useCallback(
    async (productId: string, value: number | null) => {
      if (value === null || value < 0) return
      const note = editingNotes[productId]
      await onUpdateItem(productId, value, note)
    },
    [onUpdateItem, editingNotes]
  )

  const handleNoteChange = useCallback((productId: string, note: string) => {
    setEditingNotes((prev) => ({ ...prev, [productId]: note }))
  }, [])

  const handleNoteBlur = useCallback(
    async (item: StockCheckItem) => {
      const note = editingNotes[item.product_id]
      if (note !== undefined && item.actual_quantity !== null) {
        await onUpdateItem(item.product_id, item.actual_quantity, note)
      }
    },
    [onUpdateItem, editingNotes]
  )

  const getDifferenceDisplay = (item: StockCheckItem) => {
    if (item.actual_quantity === null) {
      return { icon: <MinusCircleOutlined />, color: 'default', text: 'Chưa kiểm' }
    }
    if (item.difference === 0) {
      return { icon: <CheckCircleOutlined />, color: 'success', text: 'Khớp' }
    }
    if (item.difference! > 0) {
      return {
        icon: <CloseCircleOutlined />,
        color: 'warning',
        text: `+${item.difference}`,
      }
    }
    return {
      icon: <CloseCircleOutlined />,
      color: 'error',
      text: `${item.difference}`,
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Section */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <Text strong>Tiến độ kiểm kê</Text>
          <Text>
            {countedItems} / {totalItems} sản phẩm
          </Text>
        </div>
        <Progress
          percent={progressPercent}
          status={progressPercent === 100 ? 'success' : 'active'}
          strokeColor={progressPercent === 100 ? '#52c41a' : '#1890ff'}
        />
        <div className="flex justify-between mt-2 text-sm">
          <Text type="secondary">
            <CheckCircleOutlined className="text-green-500 mr-1" />
            Khớp: {items.filter((i) => i.actual_quantity !== null && i.difference === 0).length}
          </Text>
          <Text type="secondary">
            <CloseCircleOutlined className="text-red-500 mr-1" />
            Chênh lệch: {itemsWithDifference}
          </Text>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Tìm sản phẩm theo tên, SKU, barcode..."
        prefix={<SearchOutlined className="text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
        allowClear
      />

      {/* Product List */}
      <div className="flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          <Empty description="Không tìm thấy sản phẩm" />
        ) : (
          <List
            dataSource={filteredItems}
            renderItem={(item) => {
              const status = getDifferenceDisplay(item)
              return (
                <List.Item className="!px-0 !py-3 border-b">
                  <div className="w-full">
                    {/* Product Info Row */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium truncate">{item.products.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.products.sku && <span>SKU: {item.products.sku}</span>}
                          {item.products.barcode && (
                            <span className="ml-2">| {item.products.barcode}</span>
                          )}
                        </div>
                        {item.products.categories && (
                          <Tag color="blue" className="mt-1 text-xs">
                            {item.products.categories.name}
                          </Tag>
                        )}
                      </div>
                      <Tag color={status.color as 'default' | 'success' | 'warning' | 'error'}>
                        {status.icon} {status.text}
                      </Tag>
                    </div>

                    {/* Quantity Row */}
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                      <div className="flex-1">
                        <Text type="secondary" className="text-xs block">
                          Hệ thống
                        </Text>
                        <Text strong className="text-lg">
                          {item.system_quantity}{' '}
                          <span className="text-sm font-normal text-gray-500">
                            {item.products.unit}
                          </span>
                        </Text>
                      </div>
                      <div className="flex-1">
                        <Text type="secondary" className="text-xs block">
                          Thực tế
                        </Text>
                        <InputNumber
                          min={0}
                          value={item.actual_quantity}
                          onChange={(value) => handleQuantityChange(item.product_id, value)}
                          className="w-full"
                          placeholder="Nhập số lượng"
                          disabled={isUpdating}
                        />
                      </div>
                      {item.actual_quantity !== null && item.difference !== 0 && (
                        <div className="flex-1">
                          <Text type="secondary" className="text-xs block">
                            Chênh lệch
                          </Text>
                          <Text
                            strong
                            className={`text-lg ${
                              item.difference! > 0 ? 'text-orange-500' : 'text-red-500'
                            }`}
                          >
                            {item.difference! > 0 ? '+' : ''}
                            {item.difference}
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* Note Row - Show when there's a difference */}
                    {item.actual_quantity !== null && item.difference !== 0 && (
                      <div className="mt-2">
                        <Input
                          placeholder="Ghi chú (lý do chênh lệch)"
                          value={
                            editingNotes[item.product_id] !== undefined
                              ? editingNotes[item.product_id]
                              : item.note || ''
                          }
                          onChange={(e) => handleNoteChange(item.product_id, e.target.value)}
                          onBlur={() => handleNoteBlur(item)}
                          size="small"
                          disabled={isUpdating}
                        />
                      </div>
                    )}

                    {/* Cost info */}
                    <div className="text-xs text-gray-400 mt-2">
                      Giá vốn: {formatCurrency(item.products.cost_price)}
                      {item.actual_quantity !== null && item.difference !== 0 && (
                        <span className="ml-2">
                          | Giá trị chênh lệch:{' '}
                          {formatCurrency(Math.abs(item.difference!) * item.products.cost_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t mt-4">
        <Button
          type="primary"
          block
          size="large"
          onClick={onSubmit}
          disabled={countedItems === 0}
          loading={isUpdating}
        >
          Xem tổng hợp & Hoàn tất ({countedItems}/{totalItems} đã kiểm)
        </Button>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Spin />
        </div>
      )}
    </div>
  )
}
