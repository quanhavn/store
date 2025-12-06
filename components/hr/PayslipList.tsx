'use client'

import { useState } from 'react'
import { List, Avatar, Tag, Select, Spin, Empty, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, type PayrollWithEmployee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

const { Text } = Typography

interface PayslipListProps {
  onSelect?: (payroll: PayrollWithEmployee) => void
}

export function PayslipList({ onSelect }: PayslipListProps) {
  const currentDate = dayjs()
  const [month, setMonth] = useState(currentDate.month() + 1)
  const [year, setYear] = useState(currentDate.year())

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => api.hr.getPayroll(month, year),
  })

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Thang ${i + 1}`,
  }))

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: currentDate.year() - i,
    label: `Nam ${currentDate.year() - i}`,
  }))

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'calculated':
        return <Tag color="blue">Da tinh</Tag>
      case 'approved':
        return <Tag color="orange">Da duyet</Tag>
      case 'paid':
        return <Tag color="green">Da tra</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={month}
          onChange={setMonth}
          options={months}
          className="flex-1"
        />
        <Select
          value={year}
          onChange={setYear}
          options={years}
          className="flex-1"
        />
      </div>

      {!data?.payrolls.length ? (
        <Empty
          description="Chua co phieu luong"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={data.payrolls}
          renderItem={(payroll) => (
            <List.Item
              className="cursor-pointer hover:bg-gray-50 rounded px-2"
              onClick={() => onSelect?.(payroll)}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} className="bg-blue-500" />}
                title={
                  <div className="flex items-center justify-between">
                    <span>{payroll.employees?.name}</span>
                    {getStatusTag(payroll.status)}
                  </div>
                }
                description={
                  <div className="flex justify-between">
                    <Text type="secondary">{payroll.employees?.position}</Text>
                    <Text strong className="text-green-600">
                      {formatCurrency(payroll.net_salary)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )
}
