'use client'

import { Card, Avatar, Tag, Typography } from 'antd'
import { UserOutlined, PhoneOutlined } from '@ant-design/icons'
import type { Employee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const { Text } = Typography

interface EmployeeCardProps {
  employee: Employee
  onClick?: () => void
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const t = useTranslations('hr')

  const getContractTypeTag = (type: string) => {
    switch (type) {
      case 'full_time':
        return <Tag color="green">{t('contractType.fullTime')}</Tag>
      case 'part_time':
        return <Tag color="blue">{t('contractType.partTime')}</Tag>
      case 'contract':
        return <Tag color="orange">{t('contractType.contract')}</Tag>
      default:
        return null
    }
  }

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
            <Text strong className="truncate">{employee.name}</Text>
            {!employee.active && <Tag color="red">{t('status.inactive')}</Tag>}
          </div>
          <div className="text-sm text-gray-500 mb-1">{employee.position}</div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <PhoneOutlined />
            <span>{employee.phone}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {getContractTypeTag(employee.contract_type)}
          <div className="text-sm font-semibold text-green-600 mt-1">
            {formatCurrency(employee.base_salary)}
          </div>
        </div>
      </div>
    </Card>
  )
}
