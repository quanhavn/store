'use client'

import { Card, Avatar, Tag, Typography } from 'antd'
import { UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { formatCurrency, formatPhone } from '@/lib/utils'
import type { Customer } from '@/lib/supabase/functions'

const { Text } = Typography

interface CustomerCardProps {
  customer: Customer
  onClick?: () => void
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  return (
    <Card
      hoverable
      className="cursor-pointer"
      onClick={onClick}
      size="small"
    >
      <div className="flex items-center gap-3">
        <Avatar size={48} icon={<UserOutlined />} className="bg-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <Text strong className="truncate">{customer.name}</Text>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <PhoneOutlined />
            <span>{formatPhone(customer.phone)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {customer.total_debt > 0 ? (
            <Tag color="red">
              No {formatCurrency(customer.total_debt)}
            </Tag>
          ) : (
            <Tag color="green">Khong no</Tag>
          )}
        </div>
      </div>
    </Card>
  )
}
