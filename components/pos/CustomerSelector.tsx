'use client'

import { useTranslations } from 'next-intl'
import { Card, Button, Typography, Tag, Space } from 'antd'
import { UserOutlined, PhoneOutlined, CloseOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons'
import { CustomerSearch } from '@/components/customers/CustomerSearch'
import { type Customer } from '@/lib/supabase/functions'
import { formatCurrency, formatPhone } from '@/lib/utils'

const { Text } = Typography

export interface CustomerSelectorProps {
  selectedCustomer: Customer | null
  onSelect: (customer: Customer | null) => void
  onCreateNew?: () => void
}

export function CustomerSelector({
  selectedCustomer,
  onSelect,
  onCreateNew,
}: CustomerSelectorProps) {
  const t = useTranslations('pos')
  const tCustomers = useTranslations('customers')
  const tDebts = useTranslations('debts')

  if (selectedCustomer) {
    return (
      <Card size="small" className="bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserOutlined className="text-blue-600 text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Text strong>{selectedCustomer.name}</Text>
                {selectedCustomer.total_debt > 0 && (
                  <Tag color="red" icon={<WarningOutlined />}>
                    {tDebts('debt')} {formatCurrency(selectedCustomer.total_debt)}
                  </Tag>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <PhoneOutlined />
                {formatPhone(selectedCustomer.phone)}
              </div>
            </div>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => onSelect(null)}
            size="small"
          />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <CustomerSearch
        value={null}
        onChange={onSelect}
        onCreateNew={onCreateNew}
        placeholder={tCustomers('searchPlaceholder')}
        allowClear
      />
      {onCreateNew && (
        <Button
          type="dashed"
          icon={<UserAddOutlined />}
          onClick={onCreateNew}
          block
          size="small"
        >
          {tCustomers('addCustomer')}
        </Button>
      )}
    </div>
  )
}
