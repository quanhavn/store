'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message, Alert } from 'antd'
import { ArrowDownOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import { formatCurrency } from '@/lib/utils'

interface CashOutFormProps {
  open: boolean
  onClose: () => void
}

export function CashOutForm({ open, onClose }: CashOutFormProps) {
  const [amount, setAmount] = useState(0)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Get reference types from translations
  const referenceTypes = [
    { value: 'expense', label: t('referenceTypes.expense') },
    { value: 'salary', label: t('referenceTypes.salary') },
    { value: 'adjustment', label: t('referenceTypes.adjustment') },
  ]

  // Get current balance to show max amount
  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => api.finance.cashBalance(),
  })

  const currentBalance = balanceData?.balance || 0

  const mutation = useMutation({
    mutationFn: (data: { amount: number; description: string; reference_type?: 'expense' | 'salary' | 'adjustment' }) =>
      api.finance.cashOut(data),
    onSuccess: () => {
      message.success(t('cashOutSuccess'))
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const handleClose = () => {
    setAmount(0)
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    if (amount <= 0) {
      message.warning(t('validation.enterAmount'))
      return
    }

    if (amount > currentBalance) {
      message.warning(t('validation.insufficientBalance'))
      return
    }

    try {
      const values = await form.validateFields()
      mutation.mutate({
        amount,
        description: values.description,
        reference_type: values.reference_type,
      })
    } catch {
      // Validation error
    }
  }

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <ArrowDownOutlined className="text-white" />
          </div>
          <span>{t('cashOut')}</span>
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={handleClose}
      destroyOnHidden
    >
      <div className="max-w-md mx-auto">
        {currentBalance <= 0 && (
          <Alert
            type="warning"
            message={t('alerts.emptyCash')}
            className="mb-4"
          />
        )}

        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-gray-600">{t('currentBalance')}:</span>
          <span className="font-semibold text-lg">{formatCurrency(currentBalance)}</span>
        </div>

        <AmountKeypad
          value={amount}
          onChange={setAmount}
          maxValue={currentBalance > 0 ? currentBalance : undefined}
        />

        <Form form={form} layout="vertical" className="mt-6">
          <Form.Item
            name="description"
            label={tCommon('description')}
            rules={[{ required: true, message: t('validation.descriptionRequired') }]}
          >
            <Input.TextArea
              placeholder={t('placeholders.description')}
              rows={2}
            />
          </Form.Item>

          <Form.Item name="reference_type" label={t('transactionType')}>
            <Select
              placeholder={t('placeholders.selectTransactionType')}
              options={referenceTypes}
              allowClear
            />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          size="large"
          block
          className="mt-4 h-12 bg-red-500 hover:!bg-red-600"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0 || amount > currentBalance}
        >
          {t('confirmCashOut')}
        </Button>
      </div>
    </Drawer>
  )
}
