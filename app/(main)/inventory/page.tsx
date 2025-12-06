'use client'

import { useState } from 'react'
import { Tabs, Typography } from 'antd'
import {
  UnorderedListOutlined,
  SwapOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { StockCheckList } from '@/components/inventory/StockCheckList'
import { StockAdjustment } from '@/components/inventory/StockAdjustment'
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts'

const { Title } = Typography

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock-check')

  const tabItems = [
    {
      key: 'stock-check',
      label: (
        <span className="flex items-center gap-1">
          <UnorderedListOutlined />
          Tồn kho
        </span>
      ),
      children: <StockCheckList />,
    },
    {
      key: 'adjustment',
      label: (
        <span className="flex items-center gap-1">
          <SwapOutlined />
          Nhập/Xuất
        </span>
      ),
      children: <StockAdjustment />,
    },
    {
      key: 'low-stock',
      label: (
        <span className="flex items-center gap-1">
          <WarningOutlined />
          Cảnh báo
        </span>
      ),
      children: <LowStockAlerts />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4} className="mb-4">Quản lý kho</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="inventory-tabs"
      />
    </div>
  )
}
