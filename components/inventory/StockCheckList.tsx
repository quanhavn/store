'use client'

import { useState, useCallback } from 'react'
import { List, Input, Spin, Empty, Tag, Typography } from 'antd'
import { SearchOutlined, InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  quantity: number
  min_stock: number
  cost_price: number
  sell_price: number
  categories?: { id: string; name: string } | null
}

export function StockCheckList() {
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-stock', search],
    queryFn: async () => {
      const result = await api.products.list({ search: search || undefined, limit: 100 })
      return result.products as Product[]
    },
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const getStockStatus = (product: Product) => {
    if (product.quantity <= 0) {
      return { color: 'red', text: 'Hết hàng' }
    }
    if (product.quantity <= product.min_stock) {
      return { color: 'orange', text: 'Sắp hết' }
    }
    return { color: 'green', text: 'Còn hàng' }
  }

  const getTotalValue = () => {
    return products.reduce((sum, p) => sum + p.quantity * p.cost_price, 0)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Input
        placeholder="Tìm sản phẩm..."
        prefix={<SearchOutlined className="text-gray-400" />}
        onChange={(e) => handleSearch(e.target.value)}
        className="mb-4"
        allowClear
      />

      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <Text type="secondary">Tổng giá trị tồn kho:</Text>
          <Text strong className="text-blue-600">{formatCurrency(getTotalValue())}</Text>
        </div>
        <div className="flex justify-between items-center mt-1">
          <Text type="secondary">Số sản phẩm:</Text>
          <Text>{products.length}</Text>
        </div>
      </div>

      {products.length === 0 ? (
        <Empty
          image={<InboxOutlined className="text-5xl text-gray-300" />}
          description="Không tìm thấy sản phẩm"
        />
      ) : (
        <List
          dataSource={products}
          renderItem={(product) => {
            const status = getStockStatus(product)
            return (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.barcode && <span className="ml-2">| {product.barcode}</span>}
                      </div>
                      {product.categories && (
                        <Tag color="blue" className="mt-1 text-xs">{product.categories.name}</Tag>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg">
                        {product.quantity} <span className="text-sm font-normal text-gray-500">{product.unit}</span>
                      </div>
                      <Tag color={status.color} className="mt-1">{status.text}</Tag>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Tối thiểu: {product.min_stock} {product.unit}</span>
                    <span>Giá vốn: {formatCurrency(product.cost_price)}</span>
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      )}
    </div>
  )
}
