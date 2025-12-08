'use client'

import { Card, Typography, Row, Col } from 'antd'
import {
  FileTextOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  TeamOutlined,
  ShoppingOutlined,
  SettingOutlined,
  UserOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import Link from 'next/link'

const { Title, Text } = Typography

const menuItems = [
  {
    title: 'Hóa đơn điện tử',
    description: 'Quản lý hóa đơn',
    icon: FileTextOutlined,
    href: '/invoices',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    title: 'Thuế',
    description: 'Kê khai thuế',
    icon: CalculatorOutlined,
    href: '/tax',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
  {
    title: 'Khach hang',
    description: 'Quan ly cong no',
    icon: UserOutlined,
    href: '/customers',
    bgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600'
  },
  {
    title: 'Báo cáo',
    description: 'Xem thống kê',
    icon: BarChartOutlined,
    href: '/reports',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Nhân sự',
    description: 'Quản lý nhân viên',
    icon: TeamOutlined,
    href: '/hr',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    title: 'Sản phẩm',
    description: 'Quản lý sản phẩm',
    icon: ShoppingOutlined,
    href: '/products',
    bgColor: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  {
    title: 'Danh mục',
    description: 'Quản lý danh mục',
    icon: AppstoreOutlined,
    href: '/categories',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  {
    title: 'Cài đặt',
    description: 'Tùy chỉnh ứng dụng',
    icon: SettingOutlined,
    href: '/settings',
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600'
  }
]

export default function MenuPage() {
  return (
    <div className="p-4 space-y-4">
      <Title level={4} className="!mb-0">Menu</Title>

      <Row gutter={[12, 12]}>
        {menuItems.map((item) => {
          const IconComponent = item.icon
          return (
            <Col span={12} key={item.href}>
              <Link href={item.href}>
                <Card hoverable size="small" className="cursor-pointer h-full">
                  <div className="flex flex-col gap-3">
                    <div className={`h-12 w-12 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                      <IconComponent className={`text-2xl ${item.iconColor}`} />
                    </div>
                    <div>
                      <Text strong>{item.title}</Text>
                      <br />
                      <Text type="secondary" className="text-xs">{item.description}</Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
