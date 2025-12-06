'use client'

import { useState } from 'react'
import { Card, Select, Table, Tag, Typography, Spin, Empty } from 'antd'
import { CalendarOutlined, DollarOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text, Title } = Typography

export function QuarterlyTaxSummary() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

  const { data, isLoading } = useQuery({
    queryKey: ['tax-book', year],
    queryFn: () => api.tax.getTaxBook(year),
  })

  const taxBook = data?.tax_book

  const getStatusTag = (status: string, quarter: number) => {
    switch (status) {
      case 'not_started':
        return <Tag color="default">Chua den ky</Tag>
      case 'in_progress':
        return <Tag color="processing">Dang trong ky</Tag>
      case 'completed':
        return <Tag color="success">Da hoan thanh</Tag>
      case 'pending':
        if (quarter < currentQuarter) {
          return <Tag color="warning" icon={<WarningOutlined />}>Chua ke khai</Tag>
        }
        return <Tag color="blue">Cho ke khai</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns = [
    {
      title: 'Ky',
      dataIndex: 'quarter',
      key: 'quarter',
      render: (q: number) => <Text strong>Quy {q}</Text>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'VAT',
      dataIndex: 'vat_payable',
      key: 'vat_payable',
      render: (v: number) => <Text type="danger">{formatCurrency(v)}</Text>,
    },
    {
      title: 'TNCN',
      dataIndex: 'pit_payable',
      key: 'pit_payable',
      render: (v: number) => <Text type="warning">{formatCurrency(v)}</Text>,
    },
    {
      title: 'Tong thue',
      dataIndex: 'total_tax',
      key: 'total_tax',
      render: (v: number) => <Text strong className="text-red-600">{formatCurrency(v)}</Text>,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: { quarter: number }) => getStatusTag(status, record.quarter),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={5} className="!mb-0">
          <CalendarOutlined className="mr-2" />
          So nghia vu thue
        </Title>
        <Select
          value={year}
          onChange={setYear}
          options={years.map(y => ({ value: y, label: `Nam ${y}` }))}
          style={{ width: 120 }}
        />
      </div>

      {taxBook && taxBook.quarters.length > 0 ? (
        <>
          <Table
            dataSource={taxBook.quarters}
            columns={columns}
            rowKey="quarter"
            pagination={false}
            size="small"
          />

          <Card className="bg-gradient-to-r from-red-50 to-orange-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text type="secondary" className="text-sm">Tong doanh thu nam</Text>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(taxBook.summary.total_revenue)}
                </div>
              </div>
              <div>
                <Text type="secondary" className="text-sm">Tong thue phai nop</Text>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(taxBook.summary.total_tax)}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Empty description="Khong co du lieu" />
      )}
    </div>
  )
}
