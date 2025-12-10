'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { DatePicker, Typography } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { formatCurrency } from '@/lib/utils'

const { Text, Title } = Typography

export interface DebtOptionsFormProps {
  amount: number
  debtType?: 'credit' | 'installment'
  onDebtTypeChange?: (type: 'credit' | 'installment') => void
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
  debtOptions,
  onOptionsChange,
}: DebtOptionsFormProps) {
  const t = useTranslations('debts')

  const defaultDueDate = useMemo(() => dayjs().add(30, 'day').format('YYYY-MM-DD'), [])

  const handleDueDateChange = (date: Dayjs | null) => {
    onOptionsChange({
      ...debtOptions,
      due_date: date ? date.format('YYYY-MM-DD') : undefined,
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
    </div>
  )
}
