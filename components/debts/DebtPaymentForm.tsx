'use client'

import { useEffect } from 'react'
import { Drawer, Form, InputNumber, Select, Input, Button, message, Typography, Space } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type DebtInstallment } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import type { DebtDisplayData } from './DebtCard'

const { Text } = Typography

interface DebtPaymentFormProps {
  open: boolean
  onClose: () => void
  debt: DebtDisplayData
  installment?: DebtInstallment | null
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'cash' },
  { value: 'bank_transfer', label: 'bankTransfer' },
]

export function DebtPaymentForm({ open, onClose, debt, installment, onSuccess }: DebtPaymentFormProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')
  const tCustomers = useTranslations('customers')
  const [form] = Form.useForm()
  const paymentMethod = Form.useWatch('payment_method', form)

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
    enabled: open,
  })

  const bankAccounts = bankAccountsData?.bank_accounts || []

  const recordPaymentMutation = useMutation({
    mutationFn: (data: {
      debt_id: string
      amount: number
      payment_method: 'cash' | 'bank_transfer'
      bank_account_id?: string
      bank_ref?: string
      notes?: string
      installment_id?: string
    }) => api.debts.recordPayment(data),
    onSuccess: () => {
      message.success(tCommon('success'))
      form.resetFields()
      onSuccess()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  useEffect(() => {
    if (open) {
      const defaultAmount = installment
        ? installment.amount - installment.paid_amount
        : debt.remaining_amount

      form.setFieldsValue({
        amount: defaultAmount,
        payment_method: 'cash',
        bank_account_id: undefined,
        bank_ref: '',
        notes: '',
      })
    }
  }, [open, debt, installment, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (values.amount > debt.remaining_amount) {
        message.error(t('maxDebtPayment'))
        return
      }

      recordPaymentMutation.mutate({
        debt_id: debt.id,
        amount: values.amount,
        payment_method: values.payment_method,
        bank_account_id: values.payment_method === 'bank_transfer' ? values.bank_account_id : undefined,
        bank_ref: values.payment_method === 'bank_transfer' ? values.bank_ref : undefined,
        notes: values.notes,
        installment_id: installment?.id,
      })
    } catch {
      // Validation error
    }
  }

  const maxAmount = installment
    ? installment.amount - installment.paid_amount
    : debt.remaining_amount

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={installment ? `${t('debtPayment')} #${installment.installment_number}` : t('debtPayment')}
      placement="bottom"
      height="auto"
      extra={
        <Button
          type="primary"
          icon={<DollarOutlined />}
          onClick={handleSubmit}
          loading={recordPaymentMutation.isPending}
        >
          {tCommon('confirm')}
        </Button>
      }
    >
      <div className="space-y-4 pb-4">
        {/* Debt info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between mb-2">
            <Text type="secondary">{tCustomers('customer')}</Text>
            <Text strong>{debt.customer_name || tCustomers('customer')}</Text>
          </div>
          <div className="flex justify-between">
            <Text type="secondary">{t('remainingAmount')}</Text>
            <Text strong className="text-blue-600">{formatCurrency(debt.remaining_amount)}</Text>
          </div>
          {installment && (
            <div className="flex justify-between mt-2 pt-2 border-t">
              <Text type="secondary">{t('installment')} #{installment.installment_number}</Text>
              <Text strong className="text-orange-600">
                {formatCurrency(installment.amount - installment.paid_amount)}
              </Text>
            </div>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label={t('paymentAmount')}
            rules={[
              { required: true, message: tCommon('enterAmount') },
              {
                validator: (_, value) => {
                  if (value && value > maxAmount) {
                    return Promise.reject(`${t('maxDebtPayment')}: ${formatCurrency(maxAmount)}`)
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Space.Compact className="w-full">
              <InputNumber<number>
                className="w-full"
                min={1000}
                max={maxAmount}
                step={10000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                placeholder="0"
              />
              <Space.Addon>VND</Space.Addon>
            </Space.Compact>
          </Form.Item>

          {/* Quick amount buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {installment ? (
              <Button
                size="small"
                onClick={() => form.setFieldValue('amount', installment.amount - installment.paid_amount)}
              >
                {tCommon('payFull')} ({formatCurrency(installment.amount - installment.paid_amount)})
              </Button>
            ) : (
              <>
                {debt.remaining_amount >= 100000 && (
                  <Button
                    size="small"
                    onClick={() => form.setFieldValue('amount', 100000)}
                  >
                    100k
                  </Button>
                )}
                {debt.remaining_amount >= 200000 && (
                  <Button
                    size="small"
                    onClick={() => form.setFieldValue('amount', 200000)}
                  >
                    200k
                  </Button>
                )}
                {debt.remaining_amount >= 500000 && (
                  <Button
                    size="small"
                    onClick={() => form.setFieldValue('amount', 500000)}
                  >
                    500k
                  </Button>
                )}
                <Button
                  size="small"
                  type="primary"
                  ghost
                  onClick={() => form.setFieldValue('amount', debt.remaining_amount)}
                >
                  {tCommon('payFull')} ({formatCurrency(debt.remaining_amount)})
                </Button>
              </>
            )}
          </div>

          <Form.Item
            name="payment_method"
            label={tCommon('paymentMethod')}
            rules={[{ required: true, message: tCommon('required') }]}
          >
            <Select options={PAYMENT_METHODS.map(m => ({ value: m.value, label: tCommon(m.label) }))} />
          </Form.Item>

          {paymentMethod === 'bank_transfer' && (
            <>
              <Form.Item
                name="bank_account_id"
                label={tCommon('bankAccount')}
                rules={[{ required: true, message: tCommon('required') }]}
              >
                <Select
                  placeholder={tCommon('select')}
                  options={bankAccounts.map(acc => ({
                    value: acc.id,
                    label: `${acc.bank_name} - ${acc.account_number}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="bank_ref"
                label={tCommon('transactionRef')}
              >
                <Input placeholder="VD: FT123456789" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="notes"
            label={tCommon('notes')}
          >
            <Input.TextArea
              rows={2}
              placeholder={tCommon('notesPlaceholder')}
            />
          </Form.Item>
        </Form>
      </div>
    </Drawer>
  )
}
