'use client'

import { useState, useMemo, useCallback } from 'react'
import { AutoComplete, Input, Tag, Typography, Button } from 'antd'
import { SearchOutlined, UserAddOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, type Customer } from '@/lib/supabase/functions'
import { formatCurrency, formatPhone } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'

const { Text } = Typography

interface CustomerSearchProps {
  value?: Customer | null
  onChange?: (customer: Customer | null) => void
  onCreateNew?: () => void
  placeholder?: string
  allowClear?: boolean
}

export function CustomerSearch({
  value,
  onChange,
  onCreateNew,
  placeholder = 'Tim khach hang (ten/SDT)...',
  allowClear = true,
}: CustomerSearchProps) {
  const [searchText, setSearchText] = useState('')
  const debouncedSearch = useDebouncedValue(searchText, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => api.customers.search({ query: debouncedSearch, limit: 5 }),
    enabled: debouncedSearch.length >= 2,
  })

  const options = useMemo(() => {
    const customerOptions = (data?.customers || []).map((customer) => ({
      value: customer.id,
      label: (
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-400" />
            <div>
              <div className="font-medium">{customer.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <PhoneOutlined />
                {formatPhone(customer.phone)}
              </div>
            </div>
          </div>
          {customer.total_debt > 0 && (
            <Tag color="red" className="ml-2">
              No {formatCurrency(customer.total_debt)}
            </Tag>
          )}
        </div>
      ),
      customer,
    }))

    // Add "Create new customer" option if search has content and onCreateNew is provided
    if (debouncedSearch.length >= 2 && onCreateNew) {
      customerOptions.push({
        value: '__create_new__',
        label: (
          <div className="flex items-center gap-2 py-1 text-blue-600">
            <UserAddOutlined />
            <span>Them khach hang moi: "{debouncedSearch}"</span>
          </div>
        ),
        customer: null as unknown as Customer,
      })
    }

    return customerOptions
  }, [data?.customers, debouncedSearch, onCreateNew])

  const handleSelect = useCallback((selectedValue: string, option: { customer: Customer | null }) => {
    if (selectedValue === '__create_new__') {
      onCreateNew?.()
      return
    }

    if (option.customer) {
      onChange?.(option.customer)
      setSearchText(option.customer.name)
    }
  }, [onChange, onCreateNew])

  const handleClear = useCallback(() => {
    onChange?.(null)
    setSearchText('')
  }, [onChange])

  return (
    <AutoComplete
      className="w-full"
      options={options}
      onSelect={handleSelect}
      onSearch={setSearchText}
      value={value ? value.name : searchText}
      notFoundContent={
        debouncedSearch.length >= 2 ? (
          isLoading ? (
            <div className="text-center py-2 text-gray-500">Dang tim...</div>
          ) : (
            <div className="text-center py-2">
              <div className="text-gray-500 mb-2">Khong tim thay khach hang</div>
              {onCreateNew && (
                <Button
                  type="link"
                  icon={<UserAddOutlined />}
                  onClick={onCreateNew}
                >
                  Them khach hang moi
                </Button>
              )}
            </div>
          )
        ) : null
      }
    >
      <Input
        prefix={<SearchOutlined className="text-gray-400" />}
        placeholder={placeholder}
        allowClear={allowClear}
        onClear={handleClear}
      />
    </AutoComplete>
  )
}
