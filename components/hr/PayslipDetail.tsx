'use client'

import { Drawer, Descriptions, Tag, Button, Popconfirm, message, Divider, Radio } from 'antd'
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type PayrollWithEmployee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface PayslipDetailProps {
  open: boolean
  onClose: () => void
  payroll: PayrollWithEmployee | null
}

export function PayslipDetail({ open, onClose, payroll }: PayslipDetailProps) {
  const t = useTranslations('hr')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash')

  const markPaidMutation = useMutation({
    mutationFn: () => api.hr.markPaid(payroll!.id, paymentMethod),
    onSuccess: () => {
      message.success(t('salaryPaidSuccess'))
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  if (!payroll) return null

  const employee = payroll.employees

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('payslipTitle', { month: payroll.period_month, year: payroll.period_year })}
      placement="bottom"
      height="90%"
    >
      <div className="space-y-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-medium">{employee?.name}</div>
          <div className="text-sm text-gray-500">{employee?.position}</div>
          <Tag
            color={
              payroll.status === 'paid' ? 'green' :
              payroll.status === 'approved' ? 'orange' : 'blue'
            }
            className="mt-2"
          >
            {payroll.status === 'paid' ? t('payrollStatus.paid') :
             payroll.status === 'approved' ? t('payrollStatus.approved') : t('payrollStatus.calculated')}
          </Tag>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500">{t('workingDays')}</div>
          <div className="text-2xl font-bold">
            {payroll.working_days}/{payroll.standard_days}
          </div>
        </div>

        <Divider orientationMargin={0}><span className="text-sm">{t('income')}</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('baseSalary')}>
            {formatCurrency(payroll.base_salary)}
          </Descriptions.Item>
          <Descriptions.Item label={t('proRatedSalary')}>
            {formatCurrency(payroll.pro_rated_salary)}
          </Descriptions.Item>
          <Descriptions.Item label={t('allowances')}>
            {formatCurrency(payroll.allowances)}
          </Descriptions.Item>
          <Descriptions.Item label={t('totalIncome')}>
            <span className="font-bold text-blue-600">
              {formatCurrency(payroll.gross_salary)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">{t('deductions')}</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('socialInsuranceRate', { rate: '8%' })}>
            -{formatCurrency(payroll.social_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label={t('healthInsuranceRate', { rate: '1.5%' })}>
            -{formatCurrency(payroll.health_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label={t('unemploymentInsuranceRate', { rate: '1%' })}>
            -{formatCurrency(payroll.unemployment_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label={t('personalIncomeTax')}>
            -{formatCurrency(payroll.pit)}
          </Descriptions.Item>
          <Descriptions.Item label={t('totalDeductions')}>
            <span className="font-bold text-red-600">
              -{formatCurrency(payroll.total_deductions)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="text-sm text-gray-600">{t('netSalary').toUpperCase()}</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(payroll.net_salary)}
          </div>
        </div>

        <Divider orientationMargin={0}><span className="text-sm">{t('pitDetails')}</span></Divider>

        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('personalDeduction')}>
            {formatCurrency(payroll.personal_deduction)}
          </Descriptions.Item>
          <Descriptions.Item label={t('dependentDeduction')}>
            {formatCurrency(payroll.dependent_deduction)}
          </Descriptions.Item>
          <Descriptions.Item label={t('taxableIncome')}>
            {formatCurrency(payroll.taxable_income)}
          </Descriptions.Item>
        </Descriptions>

        {payroll.status === 'approved' && (
          <>
            <Divider />
            <div className="space-y-3">
              <div className="text-sm font-medium">{t('paymentMethod')}:</div>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full"
              >
                <Radio.Button value="cash" className="w-1/2 text-center">
                  {t('paymentCash')}
                </Radio.Button>
                <Radio.Button value="bank_transfer" className="w-1/2 text-center">
                  {t('paymentBankTransfer')}
                </Radio.Button>
              </Radio.Group>

              {paymentMethod === 'bank_transfer' && employee?.bank_account && (
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <div>{t('bankName')}: {employee.bank_name}</div>
                  <div>{t('accountNumber')}: {employee.bank_account}</div>
                </div>
              )}

              <Popconfirm
                title={t('confirmPaySalary')}
                description={t('confirmPaySalaryDescription', { amount: formatCurrency(payroll.net_salary), name: employee?.name || '' })}
                onConfirm={() => markPaidMutation.mutate()}
                okText={tCommon('confirm')}
                cancelText={tCommon('cancel')}
              >
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  loading={markPaidMutation.isPending}
                  block
                  className="bg-green-500 hover:bg-green-600"
                >
                  {t('paySalary')}
                </Button>
              </Popconfirm>
            </div>
          </>
        )}

        {payroll.status === 'paid' && (
          <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded">
            <CheckCircleOutlined className="text-green-600" />
            <span className="text-green-600">
              {t('paidOn', { date: payroll.paid_date || '', method: payroll.payment_method === 'cash' ? t('paymentCash') : t('paymentBankTransfer') })}
            </span>
          </div>
        )}
      </div>
    </Drawer>
  )
}
