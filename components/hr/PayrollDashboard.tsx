'use client'

import { useState } from 'react'
import { Card, Select, Button, Table, Tag, Typography, message, Spin, Space } from 'antd'
import { CalculatorOutlined, CheckOutlined, DollarOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type PayrollWithEmployee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

const { Title, Text } = Typography

export function PayrollDashboard() {
  const t = useTranslations('hr')
  const tCommon = useTranslations('common')
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
      message.success(t('salaryCalculatedSuccess', { count: result.calculated }))
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.hr.approvePayroll(selectedRowKeys),
    onSuccess: (result) => {
      message.success(t('payslipsApprovedSuccess', { count: result.approved }))
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setSelectedRowKeys([])
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  const columns = [
    {
      title: t('employee'),
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
      title: t('workingDays'),
      dataIndex: 'working_days',
      key: 'working_days',
      render: (days: number, record: PayrollWithEmployee) => (
        <span>{days}/{record.standard_days}</span>
      ),
    },
    {
      title: t('netSalary'),
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (value: number) => (
        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
      ),
    },
    {
      title: tCommon('status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'calculated':
            return <Tag color="blue">{t('payrollStatus.calculated')}</Tag>
          case 'approved':
            return <Tag color="orange">{t('payrollStatus.approved')}</Tag>
          case 'paid':
            return <Tag color="green">{t('payrollStatus.paid')}</Tag>
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
  ]

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: t('monthLabel', { month: i + 1 }),
  }))

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: currentDate.year() - i,
    label: t('yearLabel', { year: currentDate.year() - i }),
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
          {t('calculateSalary')}
        </Button>
      </div>

      {data?.totals && (
        <div className="grid grid-cols-2 gap-3">
          <Card size="small" className="bg-blue-50">
            <Text type="secondary" className="text-xs">{t('totalGrossSalary')}</Text>
            <div className="font-bold text-blue-600">{formatCurrency(data.totals.total_gross)}</div>
          </Card>
          <Card size="small" className="bg-green-50">
            <Text type="secondary" className="text-xs">{t('totalNetSalary')}</Text>
            <div className="font-bold text-green-600">{formatCurrency(data.totals.total_net)}</div>
          </Card>
          <Card size="small" className="bg-orange-50">
            <Text type="secondary" className="text-xs">{t('socialInsurance')}</Text>
            <div className="font-bold text-orange-600">
              {formatCurrency(data.totals.total_insurance_employee + data.totals.total_insurance_employer)}
            </div>
          </Card>
          <Card size="small" className="bg-red-50">
            <Text type="secondary" className="text-xs">{t('personalIncomeTax')}</Text>
            <div className="font-bold text-red-600">{formatCurrency(data.totals.total_pit)}</div>
          </Card>
        </div>
      )}

      {selectedRowKeys.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
          <Text>{t('selectedPayslips', { count: selectedRowKeys.length })}</Text>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => approveMutation.mutate()}
            loading={approveMutation.isPending}
          >
            {t('approve')}
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
