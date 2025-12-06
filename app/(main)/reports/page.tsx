'use client'

import { Typography, Empty } from 'antd'
import { BarChartOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function ReportsPage() {
  return (
    <div className="p-4">
      <Title level={4}>Báo cáo</Title>
      <Empty
        image={<BarChartOutlined className="text-6xl text-gray-300" />}
        description="Tính năng đang được phát triển trong Phase 7"
      />
    </div>
  )
}
