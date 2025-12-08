'use client'

import { useState } from 'react'
import { Input, Button, Empty, Spin, Segmented, Pagination } from 'antd'
import { PlusOutlined, SearchOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Customer } from '@/lib/supabase/functions'
import { CustomerCard } from './CustomerCard'

interface CustomerListProps {
  onAdd?: () => void
  onSelect?: (customer: Customer) => void
}

export function CustomerList({ onAdd, onSelect }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [hasDebtOnly, setHasDebtOnly] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const tDebts = useTranslations('debts')

  const { data, isLoading } = useQuery({
    queryKey: ['customers', hasDebtOnly, page, limit],
    queryFn: () => api.customers.list({
      has_debt: hasDebtOnly || undefined,
      page,
      limit,
    }),
  })

  const filteredCustomers = data?.customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search)
  ) || []

  const total = data?.pagination?.total || 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="flex-1"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAdd}
        >
          {tCommon('add')}
        </Button>
      </div>

      <Segmented
        block
        value={hasDebtOnly ? 'debt' : 'all'}
        onChange={(v) => {
          setHasDebtOnly(v === 'debt')
          setPage(1)
        }}
        options={[
          { value: 'all', icon: <UserOutlined />, label: tCommon('all') },
          { value: 'debt', icon: <DollarOutlined />, label: tDebts('hasDebt') },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Empty
          description={search ? t('notFound') : t('noCustomers')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => onSelect?.(customer)}
              />
            ))}
          </div>

          {total > limit && (
            <div className="flex justify-center pt-4">
              <Pagination
                current={page}
                total={total}
                pageSize={limit}
                onChange={setPage}
                showSizeChanger={false}
                simple
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
