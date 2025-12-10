'use client'

import { useEffect } from 'react'
import { Drawer, Form, Input, Select, Switch, InputNumber, Button, message } from 'antd'
import { BankOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type BankAccount } from '@/lib/supabase/functions'

interface BankAccountFormProps {
  open: boolean
  onClose: () => void
  editData?: BankAccount | null
}

const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VTB', name: 'VietinBank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SAB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'NAB', name: 'Nam A Bank' },
]

export function BankAccountForm({ open, onClose, editData }: BankAccountFormProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editData
  const canEditBalance = !isEdit || editData?.transaction_count === 0
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  useEffect(() => {
    if (open && editData) {
      form.setFieldsValue({
        bank_name: editData.bank_name,
        account_number: editData.account_number,
        account_name: editData.account_name,
        branch: editData.branch,
        is_default: editData.is_default,
        initial_balance: editData.balance,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, editData, form])

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.createBankAccount>[0]) =>
      api.finance.createBankAccount(data),
    onSuccess: () => {
      message.success(t('accountAddedSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.updateBankAccount>[0]) =>
      api.finance.updateBankAccount(data),
    onSuccess: () => {
      message.success(t('accountUpdatedSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (isEdit && editData) {
        updateMutation.mutate({
          id: editData.id,
          ...values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch {
      // Validation error
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <BankOutlined className="text-white" />
          </div>
          <span>{isEdit ? t('editBankAccount') : t('addBankAccount')}</span>
        </div>
      }
      placement="bottom"
      height="85%"
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <div className="max-w-md mx-auto">
        <Form form={form} layout="vertical">
          <Form.Item
            name="bank_name"
            label={t('bankName')}
            rules={[{ required: true, message: t('validation.selectBank') }]}
          >
            <Select
              placeholder={t('placeholders.selectBank')}
              showSearch
              optionFilterProp="label"
              options={VIETNAM_BANKS.map((bank) => ({
                value: bank.name,
                label: bank.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="account_number"
            label={t('accountNumber')}
            rules={[
              { required: true, message: t('validation.accountNumberRequired') },
              { pattern: /^\d{6,20}$/, message: t('validation.accountNumberInvalid') },
            ]}
          >
            <Input placeholder={t('placeholders.accountNumber')} maxLength={20} />
          </Form.Item>

          <Form.Item
            name="account_name"
            label={t('accountHolder')}
            rules={[{ required: true, message: t('validation.accountHolderRequired') }]}
          >
            <Input placeholder={t('placeholders.accountHolder')} className="uppercase" />
          </Form.Item>

          <Form.Item name="branch" label={t('branch')}>
            <Input placeholder={t('placeholders.branch')} />
          </Form.Item>

          {canEditBalance && (
            <Form.Item
              name="initial_balance"
              label={t('initialBalance')}
              extra={isEdit ? t('initialBalanceEditHint') : undefined}
            >
              <InputNumber
                className="!w-full"
                placeholder="0"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/,/g, '') as unknown as 0}
                min={0}
                suffix="d"
              />
            </Form.Item>
          )}

          <Form.Item name="is_default" valuePropName="checked" label={t('defaultAccount')}>
            <Switch />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          size="large"
          block
          className="mt-4 h-12"
          onClick={handleSubmit}
          loading={isLoading}
        >
          {isEdit ? tCommon('save') : t('addBankAccount')}
        </Button>
      </div>
    </Drawer>
  )
}
