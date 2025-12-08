'use client'

import { useState } from 'react'
import { Input, Button, Empty, Spin, Segmented } from 'antd'
import { PlusOutlined, SearchOutlined, UserOutlined, UserDeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, type Employee } from '@/lib/supabase/functions'
import { EmployeeCard } from './EmployeeCard'
import { useTranslations } from 'next-intl'

interface EmployeeListProps {
  onAdd?: () => void
  onSelect?: (employee: Employee) => void
}

export function EmployeeList({ onAdd, onSelect }: EmployeeListProps) {
  const t = useTranslations('hr')
  const tCommon = useTranslations('common')
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['employees', activeOnly],
    queryFn: () => api.hr.listEmployees({ active_only: activeOnly }),
  })

  const filteredEmployees = data?.employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.phone.includes(search) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t('searchEmployees')}
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
        value={activeOnly ? 'active' : 'all'}
        onChange={(v) => setActiveOnly(v === 'active')}
        options={[
          { value: 'active', icon: <UserOutlined />, label: t('filterActive') },
          { value: 'all', icon: <UserDeleteOutlined />, label: t('filterAll') },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Empty
          description={search ? t('noEmployeesFound') : t('noEmployees')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="space-y-2">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => onSelect?.(employee)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
