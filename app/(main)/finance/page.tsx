'use client'

import { Typography, Empty } from 'antd'
import { WalletOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function FinancePage() {
  return (
    <div className="p-4">
      <Title level={4}>Quản lý thu chi</Title>
      <Empty
        image={<WalletOutlined className="text-6xl text-gray-300" />}
        description="Tính năng đang được phát triển trong Phase 4"
      />
    </div>
  )
}
