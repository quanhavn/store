'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type BankAccount } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'

interface BankInFormProps {
  open: boolean
  onClose: () => void
  bankAccountId?: string
}

export function BankInForm({ open, onClose, bankAccountId }: BankInFormProps) {
  const [amount, setAmount] = useState(0)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Reference types with translations
  const referenceTypes = [
    { value: 'sale', label: t('referenceTypes.deposit') },
    { value: 'transfer', label: t('referenceTypes.transfer') },
    { value: 'other', label: t('referenceTypes.other') },
  ]

  const { data: accountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
  })

  const accounts = accountsData?.bank_accounts || []

  const mutation = useMutation({
    mutationFn: (data: {
      bank_account_id: string
      amount: number
      description: string
      bank_ref?: string
      reference_type?: 'sale' | 'transfer' | 'other'
    }) => api.finance.bankIn(data),
    onSuccess: () => {
      message.success(t('bankInSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
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
        bank_account_id: values.bank_account_id,
        amount,
        description: values.description,
        bank_ref: values.bank_ref,
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
          <span>{t('bankIn')}</span>
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

        <Form
          form={form}
          layout="vertical"
          className="mt-6"
          initialValues={{ bank_account_id: bankAccountId }}
        >
          <Form.Item
            name="bank_account_id"
            label={t('bankAccount')}
            rules={[{ required: true, message: t('validation.selectAccount') }]}
          >
            <Select
              placeholder={t('placeholders.selectAccount')}
              options={accounts.map((acc: BankAccount) => ({
                value: acc.id,
                label: `${acc.bank_name} - ${acc.account_number}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={tCommon('description')}
            rules={[{ required: true, message: t('validation.descriptionRequired') }]}
          >
            <Input.TextArea
              placeholder={t('placeholders.bankInDescription')}
              rows={2}
            />
          </Form.Item>

          <Form.Item name="bank_ref" label={t('bankReference')}>
            <Input placeholder={t('placeholders.bankReference')} />
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
          {t('confirmBankIn')}
        </Button>
      </div>
    </Drawer>
  )
}
