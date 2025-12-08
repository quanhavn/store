'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { ArrowDownOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type BankAccount } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import { formatCurrency } from '@/lib/utils'

interface BankOutFormProps {
  open: boolean
  onClose: () => void
  bankAccountId?: string
}

export function BankOutForm({ open, onClose, bankAccountId }: BankOutFormProps) {
  const [amount, setAmount] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(bankAccountId)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Reference types with translations
  const referenceTypes = [
    { value: 'expense', label: t('referenceTypes.expense') },
    { value: 'transfer', label: t('referenceTypes.transferOut') },
    { value: 'other', label: t('referenceTypes.other') },
  ]

  const { data: accountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
  })

  const accounts = accountsData?.bank_accounts || []
  const selectedAccount = accounts.find((acc: BankAccount) => acc.id === selectedAccountId)

  const mutation = useMutation({
    mutationFn: (data: {
      bank_account_id: string
      amount: number
      description: string
      bank_ref?: string
      reference_type?: 'expense' | 'transfer' | 'other'
    }) => api.finance.bankOut(data),
    onSuccess: () => {
      message.success(t('bankOutSuccess'))
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
    setSelectedAccountId(undefined)
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    if (amount <= 0) {
      message.warning(t('validation.enterAmount'))
      return
    }

    if (selectedAccount && amount > (selectedAccount.balance || 0)) {
      message.error(t('validation.insufficientBalance'))
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
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <ArrowDownOutlined className="text-white" />
          </div>
          <span>{t('bankOut')}</span>
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

        {selectedAccount && (
          <div className="text-center text-sm text-gray-500 mt-2">
            {t('currentBalance')}: <span className="font-medium text-blue-600">{formatCurrency(selectedAccount.balance || 0)}</span>
          </div>
        )}

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
                label: `${acc.bank_name} - ${acc.account_number} (${formatCurrency(acc.balance || 0)})`,
              }))}
              onChange={(value) => setSelectedAccountId(value)}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={tCommon('description')}
            rules={[{ required: true, message: t('validation.descriptionRequired') }]}
          >
            <Input.TextArea
              placeholder={t('placeholders.bankOutDescription')}
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
          danger
          className="mt-4 h-12"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0}
        >
          {t('confirmBankOut')}
        </Button>
      </div>
    </Drawer>
  )
}
