'use client'

import { useState } from 'react'
import { Card, Select, Button, Table, Tag, Typography, message, Spin, Space } from 'antd'
import { CalculatorOutlined, CheckOutlined, DollarOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type PayrollWithEmployee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export function PayrollDashboard() {
  const currentDate = dayjs()
  const [month, setMonth] = useState(currentDate.month() + 1)
  const [year, setYear] = useState(currentDate.year())
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => api.hr.getPayroll(month, year),
  })

  const calculateAllMutation = useMutation({
    mutationFn: () => api.hr.calculateAllSalaries(month, year),
    onSuccess: (result) => {
      message.success(`Da tinh luong cho ${result.calculated} nhan vien`)
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.hr.approvePayroll(selectedRowKeys),
    onSuccess: (result) => {
      message.success(`Da duyet ${result.approved} phieu luong`)
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setSelectedRowKeys([])
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const columns = [
    {
      title: 'Nhan vien',
      dataIndex: ['employees', 'name'],
      key: 'name',
      render: (_: unknown, record: PayrollWithEmployee) => (
        <div>
          <div className="font-medium">{record.employees?.name}</div>
          <Text type="secondary" className="text-xs">{record.employees?.position}</Text>
        </div>
      ),
    },
    {
      title: 'Ngay cong',
      dataIndex: 'working_days',
      key: 'working_days',
      render: (days: number, record: PayrollWithEmployee) => (
        <span>{days}/{record.standard_days}</span>
      ),
    },
    {
      title: 'Thuc linh',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (value: number) => (
        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
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
      },
    },
  ]

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Thang ${i + 1}`,
  }))

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: currentDate.year() - i,
    label: `Nam ${currentDate.year() - i}`,
  }))

  const pendingApproval = data?.payrolls.filter(p => p.status === 'calculated') || []

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={month}
          onChange={setMonth}
          options={months}
          className="w-28"
        />
        <Select
          value={year}
          onChange={setYear}
          options={years}
          className="w-28"
        />
        <Button
          type="primary"
          icon={<CalculatorOutlined />}
          onClick={() => calculateAllMutation.mutate()}
          loading={calculateAllMutation.isPending}
        >
          Tinh luong
        </Button>
      </div>

      {data?.totals && (
        <div className="grid grid-cols-2 gap-3">
          <Card size="small" className="bg-blue-50">
            <Text type="secondary" className="text-xs">Tong luong gross</Text>
            <div className="font-bold text-blue-600">{formatCurrency(data.totals.total_gross)}</div>
          </Card>
          <Card size="small" className="bg-green-50">
            <Text type="secondary" className="text-xs">Tong thuc linh</Text>
            <div className="font-bold text-green-600">{formatCurrency(data.totals.total_net)}</div>
          </Card>
          <Card size="small" className="bg-orange-50">
            <Text type="secondary" className="text-xs">BHXH (NV + DN)</Text>
            <div className="font-bold text-orange-600">
              {formatCurrency(data.totals.total_insurance_employee + data.totals.total_insurance_employer)}
            </div>
          </Card>
          <Card size="small" className="bg-red-50">
            <Text type="secondary" className="text-xs">Thue TNCN</Text>
            <div className="font-bold text-red-600">{formatCurrency(data.totals.total_pit)}</div>
          </Card>
        </div>
      )}

      {selectedRowKeys.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
          <Text>Da chon {selectedRowKeys.length} phieu luong</Text>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => approveMutation.mutate()}
            loading={approveMutation.isPending}
          >
            Duyet
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={data?.payrolls || []}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            getCheckboxProps: (record) => ({
              disabled: record.status !== 'calculated',
            }),
          }}
        />
      )}
    </div>
  )
}
