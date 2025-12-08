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
import { useTranslations } from 'next-intl'

const { Title, Text } = Typography

type MenuItemKey = 'invoices' | 'tax' | 'customers' | 'reports' | 'hr' | 'products' | 'categories' | 'settings'

const menuItems: { titleKey: MenuItemKey; icon: typeof FileTextOutlined; href: string; bgColor: string; iconColor: string }[] = [
  {
    titleKey: 'invoices',
    icon: FileTextOutlined,
    href: '/invoices',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    titleKey: 'tax',
    icon: CalculatorOutlined,
    href: '/tax',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
  {
    titleKey: 'customers',
    icon: UserOutlined,
    href: '/customers',
    bgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600'
  },
  {
    titleKey: 'reports',
    icon: BarChartOutlined,
    href: '/reports',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    titleKey: 'hr',
    icon: TeamOutlined,
    href: '/hr',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    titleKey: 'products',
    icon: ShoppingOutlined,
    href: '/products',
    bgColor: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  {
    titleKey: 'categories',
    icon: AppstoreOutlined,
    href: '/categories',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  {
    titleKey: 'settings',
    icon: SettingOutlined,
    href: '/settings',
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600'
  }
]

export default function MenuPage() {
  const t = useTranslations('menu')

  return (
    <div className="p-4 space-y-4">
      <Title level={4} className="!mb-0">{t('title')}</Title>

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
                      <Text strong>{t(`${item.titleKey}.title`)}</Text>
                      <br />
                      <Text type="secondary" className="text-xs">{t(`${item.titleKey}.description`)}</Text>
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
