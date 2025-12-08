'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, Radio, DatePicker, InputNumber, Select, Typography, Divider, List, Space } from 'antd'
import { CalendarOutlined, CreditCardOutlined, UnorderedListOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { formatCurrency } from '@/lib/utils'

const { Text, Title } = Typography

export interface DebtOptionsFormProps {
  amount: number
  debtType: 'credit' | 'installment'
  onDebtTypeChange: (type: 'credit' | 'installment') => void
  debtOptions: {
    due_date?: string
    installments?: number
    frequency?: 'weekly' | 'biweekly' | 'monthly'
    first_due_date?: string
  }
  onOptionsChange: (options: DebtOptionsFormProps['debtOptions']) => void
}

export function DebtOptionsForm({
  amount,
  debtType,
  onDebtTypeChange,
  debtOptions,
  onOptionsChange,
}: DebtOptionsFormProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')

  const FREQUENCY_OPTIONS = [
    { value: 'weekly', label: t('weekly') },
    { value: 'biweekly', label: t('biweekly') },
    { value: 'monthly', label: t('monthly') },
  ]

  const INSTALLMENT_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
    value: i + 2,
    label: t('installmentPeriods', { count: i + 2 }),
  }))
  // Calculate default values
  const defaultDueDate = useMemo(() => dayjs().add(30, 'day').format('YYYY-MM-DD'), [])
  const defaultFirstDueDate = useMemo(() => dayjs().add(7, 'day').format('YYYY-MM-DD'), [])

  // Calculate installment schedule
  const installmentSchedule = useMemo(() => {
    if (debtType !== 'installment') return []

    const numInstallments = debtOptions.installments || 2
    const frequency = debtOptions.frequency || 'monthly'
    const firstDueDate = debtOptions.first_due_date || defaultFirstDueDate
    const installmentAmount = Math.ceil(amount / numInstallments)
    const lastInstallmentAmount = amount - installmentAmount * (numInstallments - 1)

    const schedule: { number: number; amount: number; dueDate: string }[] = []

    for (let i = 0; i < numInstallments; i++) {
      let dueDate = dayjs(firstDueDate)

      switch (frequency) {
        case 'weekly':
          dueDate = dueDate.add(i * 7, 'day')
          break
        case 'biweekly':
          dueDate = dueDate.add(i * 14, 'day')
          break
        case 'monthly':
          dueDate = dueDate.add(i, 'month')
          break
      }

      schedule.push({
        number: i + 1,
        amount: i === numInstallments - 1 ? lastInstallmentAmount : installmentAmount,
        dueDate: dueDate.format('DD/MM/YYYY'),
      })
    }

    return schedule
  }, [amount, debtType, debtOptions, defaultFirstDueDate])

  const handleDueDateChange = (date: Dayjs | null) => {
    onOptionsChange({
      ...debtOptions,
      due_date: date ? date.format('YYYY-MM-DD') : undefined,
    })
  }

  const handleFirstDueDateChange = (date: Dayjs | null) => {
    onOptionsChange({
      ...debtOptions,
      first_due_date: date ? date.format('YYYY-MM-DD') : undefined,
    })
  }

  const handleInstallmentsChange = (value: number | null) => {
    onOptionsChange({
      ...debtOptions,
      installments: value || 2,
    })
  }

  const handleFrequencyChange = (value: 'weekly' | 'biweekly' | 'monthly') => {
    onOptionsChange({
      ...debtOptions,
      frequency: value,
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 p-3 rounded-lg">
        <Text type="secondary">{t('debtAmount')}:</Text>
        <Title level={4} className="!m-0 text-orange-600">
          {formatCurrency(amount)}
        </Title>
      </div>

      <Radio.Group
        value={debtType}
        onChange={(e) => onDebtTypeChange(e.target.value)}
        className="w-full"
      >
        <Space direction="vertical" className="w-full">
          <Card
            size="small"
            className={`cursor-pointer ${debtType === 'credit' ? 'border-blue-500 bg-blue-50' : ''}`}
            onClick={() => onDebtTypeChange('credit')}
          >
            <Radio value="credit">
              <Space>
                <CreditCardOutlined />
                {t('credit')}
              </Space>
            </Radio>
            <Text type="secondary" className="block ml-6 text-xs">
              {t('creditDescription')}
            </Text>
          </Card>

          <Card
            size="small"
            className={`cursor-pointer ${debtType === 'installment' ? 'border-blue-500 bg-blue-50' : ''}`}
            onClick={() => onDebtTypeChange('installment')}
          >
            <Radio value="installment">
              <Space>
                <UnorderedListOutlined />
                {t('installment')}
              </Space>
            </Radio>
            <Text type="secondary" className="block ml-6 text-xs">
              {t('installmentDescription')}
            </Text>
          </Card>
        </Space>
      </Radio.Group>

      <Divider className="my-3" />

      {debtType === 'credit' && (
        <div>
          <Text className="block mb-2">
            <CalendarOutlined className="mr-2" />
            {t('dueDate')}:
          </Text>
          <DatePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={debtOptions.due_date ? dayjs(debtOptions.due_date) : dayjs(defaultDueDate)}
            onChange={handleDueDateChange}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            placeholder={t('selectDueDate')}
          />
          <Text type="secondary" className="block mt-1 text-xs">
            {t('defaultDueDate')}
          </Text>
        </div>
      )}

      {debtType === 'installment' && (
        <div className="space-y-4">
          <div>
            <Text className="block mb-2">{t('numberOfInstallments')}:</Text>
            <Select
              className="w-full"
              options={INSTALLMENT_OPTIONS}
              value={debtOptions.installments || 2}
              onChange={handleInstallmentsChange}
              placeholder={t('selectInstallments')}
            />
          </div>

          <div>
            <Text className="block mb-2">{t('paymentFrequency')}:</Text>
            <Select
              className="w-full"
              options={FREQUENCY_OPTIONS}
              value={debtOptions.frequency || 'monthly'}
              onChange={handleFrequencyChange}
              placeholder={t('selectFrequency')}
            />
          </div>

          <div>
            <Text className="block mb-2">
              <CalendarOutlined className="mr-2" />
              {t('firstPaymentDate')}:
            </Text>
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={debtOptions.first_due_date ? dayjs(debtOptions.first_due_date) : dayjs(defaultFirstDueDate)}
              onChange={handleFirstDueDateChange}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              placeholder={t('selectDate')}
            />
          </div>

          {installmentSchedule.length > 0 && (
            <div>
              <Divider className="my-3" />
              <Text strong className="block mb-2">{t('installmentSchedule')}:</Text>
              <List
                size="small"
                bordered
                dataSource={installmentSchedule}
                renderItem={(item) => (
                  <List.Item className="flex justify-between">
                    <Text>{t('period', { number: item.number })}</Text>
                    <div className="text-right">
                      <Text strong>{formatCurrency(item.amount)}</Text>
                      <Text type="secondary" className="block text-xs">
                        {item.dueDate}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
              <div className="bg-gray-50 p-2 rounded mt-2 text-right">
                <Text type="secondary">{tCommon('total')}: </Text>
                <Text strong>{formatCurrency(amount)}</Text>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
