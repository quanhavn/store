'use client'

import { useState } from 'react'
import {
  Segmented,
  Button,
  List,
  InputNumber,
  Input,
  Empty,
  Modal,
  message,
  Spin,
  Typography
} from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useInventoryStore, AdjustmentType } from '@/lib/stores/inventory'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography
const { TextArea } = Input

interface Product {
  id: string
  name: string
  sku: string | null
  quantity: number
  cost_price: number
  unit: string
}

export function StockAdjustment() {
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()
  const queryClient = useQueryClient()

  const {
    adjustmentType,
    adjustmentItems,
    adjustmentNote,
    setAdjustmentType,
    addAdjustmentItem,
    removeAdjustmentItem,
    updateAdjustmentQuantity,
    updateAdjustmentCost,
    setAdjustmentNote,
    clearAdjustment,
    getItemCount,
    getTotalValue,
  } = useInventoryStore()

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['products-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return []

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity, cost_price, unit')
        .eq('active', true)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .limit(20)

      if (error) throw error
      return data as Product[]
    },
    enabled: searchTerm.length > 0,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const items = adjustmentItems.map((item) => ({
        product_id: item.product_id,
        type: adjustmentType,
        quantity: adjustmentType === 'export' ? -item.adjustment_quantity : item.adjustment_quantity,
        unit_cost: item.unit_cost,
        total_value: (item.unit_cost || 0) * item.adjustment_quantity,
        note: item.note || adjustmentNote,
      }))

      // Create inventory logs
      const logRecords = items.map((item) => ({
        product_id: item.product_id,
        type: item.type as 'import' | 'export' | 'sale' | 'return' | 'adjustment',
        quantity: Math.abs(item.quantity),
        unit_cost: item.unit_cost,
        total_value: item.total_value,
        note: item.note,
      }))

      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert(logRecords as never)

      if (logError) throw logError

      // Update product quantities
      for (const item of adjustmentItems) {
        const quantityChange = adjustmentType === 'export'
          ? -item.adjustment_quantity
          : item.adjustment_quantity

        // Fetch current quantity and update
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product_id)
          .single() as { data: { quantity: number } | null }

        if (product) {
          await supabase
            .from('products')
            .update({ quantity: product.quantity + quantityChange } as never)
            .eq('id', item.product_id)
        }
      }

      return true
    },
    onSuccess: () => {
      message.success(
        adjustmentType === 'import'
          ? 'Nhập kho thành công!'
          : adjustmentType === 'export'
          ? 'Xuất kho thành công!'
          : 'Điều chỉnh tồn kho thành công!'
      )
      clearAdjustment()
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => {
      message.error('Lỗi: ' + error.message)
    },
  })

  const handleAddProduct = (product: Product) => {
    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      cost_price: product.cost_price,
    })
    setProductSearchOpen(false)
    setSearchTerm('')
  }

  const getTypeLabel = (type: AdjustmentType) => {
    switch (type) {
      case 'import':
        return 'Nhập kho'
      case 'export':
        return 'Xuất kho'
      case 'adjustment':
        return 'Điều chỉnh'
    }
  }

  return (
    <div>
      <Segmented
        block
        options={[
          { value: 'import', label: 'Nhập kho' },
          { value: 'export', label: 'Xuất kho' },
          { value: 'adjustment', label: 'Điều chỉnh' },
        ]}
        value={adjustmentType}
        onChange={(value) => setAdjustmentType(value as AdjustmentType)}
        className="mb-4"
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setProductSearchOpen(true)}
        block
        className="mb-4"
      >
        Thêm sản phẩm
      </Button>

      {adjustmentItems.length === 0 ? (
        <Empty
          description="Chưa có sản phẩm nào"
          className="my-8"
        />
      ) : (
        <>
          <List
            dataSource={adjustmentItems}
            renderItem={(item) => (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.product_name}</div>
                      <div className="text-xs text-gray-500">
                        Tồn hiện tại: {item.current_quantity}
                      </div>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeAdjustmentItem(item.product_id)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        type="text"
                        icon={<MinusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity - 1
                          )
                        }
                      />
                      <InputNumber
                        min={1}
                        value={item.adjustment_quantity}
                        onChange={(value) =>
                          updateAdjustmentQuantity(item.product_id, value || 1)
                        }
                        controls={false}
                        className="w-16 text-center border-0"
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity + 1
                          )
                        }
                      />
                    </div>
                    {adjustmentType === 'import' && (
                      <InputNumber
                        placeholder="Giá vốn"
                        value={item.unit_cost}
                        onChange={(value) =>
                          updateAdjustmentCost(item.product_id, value)
                        }
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        }
                        parser={(value) =>
                          Number(value?.replace(/,/g, '')) || 0
                        }
                        className="flex-1"
                        suffix="đ"
                      />
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />

          <TextArea
            placeholder="Ghi chú (không bắt buộc)"
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            rows={2}
            className="mt-4"
          />

          <div className="bg-gray-50 p-3 rounded-lg mt-4">
            <div className="flex justify-between mb-1">
              <Text type="secondary">Loại:</Text>
              <Text>{getTypeLabel(adjustmentType)}</Text>
            </div>
            <div className="flex justify-between mb-1">
              <Text type="secondary">Số lượng:</Text>
              <Text>{getItemCount()} sản phẩm</Text>
            </div>
            {adjustmentType === 'import' && (
              <div className="flex justify-between">
                <Text type="secondary">Tổng giá trị:</Text>
                <Text strong>{formatCurrency(getTotalValue())}</Text>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={clearAdjustment} className="flex-1">
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
              className="flex-1"
            >
              Xác nhận
            </Button>
          </div>
        </>
      )}

      <Modal
        title="Chọn sản phẩm"
        open={productSearchOpen}
        onCancel={() => {
          setProductSearchOpen(false)
          setSearchTerm('')
        }}
        footer={null}
      >
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
          autoFocus
        />

        {searchLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : searchResults.length === 0 ? (
          <Empty description={searchTerm ? 'Không tìm thấy sản phẩm' : 'Nhập tên sản phẩm để tìm kiếm'} />
        ) : (
          <List
            dataSource={searchResults}
            renderItem={(product) => {
              const isAdded = adjustmentItems.some(
                (item) => item.product_id === product.id
              )
              return (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => !isAdded && handleAddProduct(product)}
                >
                  <div className="flex justify-between w-full">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.sku && `SKU: ${product.sku} | `}
                        Tồn: {product.quantity} {product.unit}
                      </div>
                    </div>
                    {isAdded ? (
                      <Text type="secondary">Đã thêm</Text>
                    ) : (
                      <PlusOutlined className="text-blue-500" />
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Modal>
    </div>
  )
}
