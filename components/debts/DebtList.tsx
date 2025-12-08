'use client'

import { useState } from 'react'
import { Input, Empty, Spin, Segmented, Select, Pagination } from 'antd'
import { SearchOutlined, UserOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { DebtCard, transformDebtForDisplay, type DebtDisplayData } from './DebtCard'

interface DebtListProps {
  onSelect?: (debt: DebtDisplayData) => void
  customerId?: string
}

type DebtStatusFilter = 'all' | 'active' | 'overdue' | 'paid'

export function DebtList({ onSelect, customerId }: DebtListProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')
  const tCustomers = useTranslations('customers')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DebtStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [customerFilter, setCustomerFilter] = useState<string | undefined>(customerId)
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['debts', statusFilter, customerFilter, page, limit],
    queryFn: () => api.debts.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      customer_id: customerFilter,
      page,
      limit,
    }),
  })

  const { data: customersData } = useQuery({
    queryKey: ['debt-customers'],
    queryFn: () => api.debts.listCustomersWithDebt(),
  })

  const debts = data?.debts || []
  const pagination = data?.pagination

  // Transform debts for display
  const displayDebts = debts.map(transformDebtForDisplay)

  // Filter by search
  const filteredDebts = displayDebts.filter(debt =>
    debt.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (debt.customer_phone && debt.customer_phone.includes(search))
  )

  const customers = customersData?.customers || []

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <div className="space-y-4">
      {/* Search and customer filter */}
      <div className="flex gap-2">
        <Input
          placeholder={tCommon('searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="flex-1"
        />
        {!customerId && (
          <Select
            placeholder={tCustomers('customer')}
            allowClear
            className="w-40"
            value={customerFilter}
            onChange={setCustomerFilter}
            options={customers.map(c => ({
              value: c.id,
              label: c.name,
            }))}
          />
        )}
      </div>

      {/* Status filter tabs */}
      <Segmented
        block
        value={statusFilter}
        onChange={(v) => {
          setStatusFilter(v as DebtStatusFilter)
          setPage(1)
        }}
        options={[
          { value: 'all', icon: <UserOutlined />, label: tCommon('all') },
          { value: 'active', icon: <ClockCircleOutlined />, label: tCommon('active') },
          { value: 'overdue', icon: <WarningOutlined />, label: tCommon('overdue') },
          { value: 'paid', icon: <CheckCircleOutlined />, label: tCommon('paid') },
        ]}
      />

      {/* Debt list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : filteredDebts.length === 0 ? (
        <Empty
          description={search ? tCommon('noResults') : tCommon('noData')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="space-y-2">
          {filteredDebts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onClick={() => onSelect?.(debt)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            current={page}
            total={pagination.total}
            pageSize={limit}
            onChange={handlePageChange}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}
    </div>
  )
}
