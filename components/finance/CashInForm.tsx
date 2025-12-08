'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'

interface CashInFormProps {
  open: boolean
  onClose: () => void
}

export function CashInForm({ open, onClose }: CashInFormProps) {
  const [amount, setAmount] = useState(0)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Reference types with translations
  const referenceTypes = [
    { value: 'sale', label: t('referenceTypes.sale') },
    { value: 'adjustment', label: t('referenceTypes.adjustment') },
  ]

  const mutation = useMutation({
    mutationFn: (data: { amount: number; description: string; reference_type?: 'sale' | 'adjustment' }) =>
      api.finance.cashIn(data),
    onSuccess: () => {
      message.success(t('cashInSuccess'))
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
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <ArrowUpOutlined className="text-white" />
          </div>
          <span>{t('cashIn')}</span>
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={handleClose}
      destroyOnHidden
    >
      <div className="max-w-md mx-auto">
        <AmountKeypad value={amount} onChange={setAmount} />

        <Form form={form} layout="vertical" className="mt-6">
          <Form.Item
            name="description"
            label={tCommon('description')}
            rules={[{ required: true, message: t('validation.descriptionRequired') }]}
          >
            <Input.TextArea
              placeholder={t('placeholders.cashInDescription')}
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
          className="mt-4 h-12 bg-green-500 hover:!bg-green-600"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0}
        >
          {t('confirmCashIn')}
        </Button>
      </div>
    </Drawer>
  )
}
