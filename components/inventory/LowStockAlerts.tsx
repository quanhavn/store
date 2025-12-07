'use client'

import { List, Empty, Tag, Badge, Typography, Spin, Button } from 'antd'
import { WarningOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { useInventoryStore } from '@/lib/stores/inventory'

const { Text } = Typography

interface LowStockProduct {
  id: string
  name: string
  sku?: string | null
  unit: string
  quantity: number
  min_stock: number
  cost_price?: number
  categories?: { name: string } | null
}

export function LowStockAlerts() {
  const { addAdjustmentItem, setAdjustmentType } = useInventoryStore()

  const { data: lowStockProducts = [], isLoading } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const result = await api.inventory.lowStock()
      return result.products as LowStockProduct[]
    },
    refetchInterval: 60000, // Refetch every minute
  })

  const outOfStockCount = lowStockProducts.filter((p) => p.quantity <= 0).length
  const lowStockCount = lowStockProducts.filter((p) => p.quantity > 0).length

  const handleQuickImport = (product: LowStockProduct) => {
    setAdjustmentType('import')
    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      cost_price: product.cost_price || 0,
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (lowStockProducts.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Không có sản phẩm nào sắp hết hàng"
        className="my-8"
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          <div className="text-xs text-red-500">Hết hàng</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
          <div className="text-xs text-orange-500">Sắp hết</div>
        </div>
      </div>

      <List
        dataSource={lowStockProducts}
        renderItem={(product) => {
          const isOutOfStock = product.quantity <= 0
          const neededQuantity = Math.max(0, product.min_stock * 2 - product.quantity)

          return (
            <List.Item className="!px-0">
              <div className="w-full">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        status={isOutOfStock ? 'error' : 'warning'}
                        className="flex-shrink-0"
                      />
                      <span className="font-medium truncate">{product.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-4">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.categories && (
                        <Tag color="blue" className="ml-2 text-xs">
                          {product.categories.name}
                        </Tag>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <Tag color={isOutOfStock ? 'red' : 'orange'}>
                      {isOutOfStock ? (
                        <span className="flex items-center gap-1">
                          <WarningOutlined /> Hết hàng
                        </span>
                      ) : (
                        `Còn ${product.quantity}`
                      )}
                    </Tag>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 ml-4">
                  <div className="text-xs text-gray-500">
                    <span>Tối thiểu: {product.min_stock} {product.unit}</span>
                    <span className="mx-2">|</span>
                    <span>Cần nhập: ~{neededQuantity} {product.unit}</span>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleQuickImport(product)}
                  >
                    Nhập kho
                  </Button>
                </div>
              </div>
            </List.Item>
          )
        }}
      />

      <div className="bg-gray-50 p-3 rounded-lg mt-4">
        <Text type="secondary" className="text-xs">
          Danh sách cập nhật tự động mỗi phút. Sản phẩm được hiển thị khi số lượng tồn
          bằng hoặc thấp hơn mức tồn kho tối thiểu đã thiết lập.
        </Text>
      </div>
    </div>
  )
}
