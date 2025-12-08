'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, InputNumber, Button, message, DatePicker, Switch } from 'antd'
import { AccountBookOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import dayjs from 'dayjs'

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
}

export function ExpenseForm({ open, onClose }: ExpenseFormProps) {
  const [amount, setAmount] = useState(0)
  const [showKeypad, setShowKeypad] = useState(true)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Fetch expense categories
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.finance.listExpenseCategories(),
    enabled: open,
  })

  // Fetch bank accounts for payment
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
    enabled: open,
  })

  const categories = categoriesData?.categories || []
  const bankAccounts = bankAccountsData?.bank_accounts || []

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.createExpense>[0]) =>
      api.finance.createExpense(data),
    onSuccess: () => {
      message.success(t('expenseSuccess'))
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const handleClose = () => {
    setAmount(0)
    setShowKeypad(true)
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
        category_id: values.category_id,
        payment_method: values.payment_method,
        bank_account_id: values.bank_account_id,
        vat_amount: values.vat_amount || 0,
        invoice_no: values.invoice_no,
        supplier_name: values.supplier_name,
        supplier_tax_code: values.supplier_tax_code,
        expense_date: values.expense_date?.format('YYYY-MM-DD'),
      })
    } catch {
      // Validation error
    }
  }

  const paymentMethod = Form.useWatch('payment_method', form)

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <AccountBookOutlined className="text-white" />
          </div>
          <span>{t('recordExpense')}</span>
        </div>
      }
      placement="bottom"
      height="95%"
      open={open}
      onClose={handleClose}
      destroyOnHidden
    >
      <div className="max-w-md mx-auto">
        {showKeypad ? (
          <>
            <AmountKeypad value={amount} onChange={setAmount} />
            <Button
              type="primary"
              size="large"
              block
              className="mt-4 h-12 bg-red-500 hover:!bg-red-600"
              onClick={() => setShowKeypad(false)}
              disabled={amount <= 0}
            >
              {tCommon('continue')}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {amount.toLocaleString('vi-VN')}d
              </div>
              <Button type="link" onClick={() => setShowKeypad(true)}>
                {t('editAmount')}
              </Button>
            </div>

            <Form form={form} layout="vertical" initialValues={{ payment_method: 'cash', expense_date: dayjs() }}>
              <Form.Item
                name="description"
                label={t('expenseDescription')}
                rules={[{ required: true, message: t('validation.descriptionRequired') }]}
              >
                <Input.TextArea
                  placeholder={t('placeholders.expenseDescription')}
                  rows={2}
                />
              </Form.Item>

              <Form.Item name="category_id" label={t('expenseCategory')}>
                <Select
                  placeholder={t('placeholders.selectCategory')}
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                name="payment_method"
                label={t('paymentMethod')}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'cash', label: t('paymentMethods.cash') },
                    { value: 'bank_transfer', label: t('paymentMethods.bankTransfer') },
                  ]}
                />
              </Form.Item>

              {paymentMethod === 'bank_transfer' && (
                <Form.Item
                  name="bank_account_id"
                  label={t('bankAccount')}
                  rules={[{ required: true, message: t('validation.selectAccount') }]}
                >
                  <Select
                    placeholder={t('placeholders.selectAccount')}
                    options={bankAccounts.map((acc) => ({
                      value: acc.id,
                      label: `${acc.bank_name} - ${acc.account_number}`,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item name="expense_date" label={t('expenseDate')}>
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item name="vat_amount" label={t('vatAmount')}>
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/,/g, '') as unknown as 0}
                  min={0}
                  suffix="d"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="invoice_no" label={t('invoiceNumber')}>
                  <Input placeholder={t('placeholders.invoiceNumber')} />
                </Form.Item>
                <Form.Item name="supplier_tax_code" label={t('supplierTaxCode')}>
                  <Input placeholder={t('placeholders.taxCode')} />
                </Form.Item>
              </div>

              <Form.Item name="supplier_name" label={t('supplierName')}>
                <Input placeholder={t('placeholders.supplierName')} />
              </Form.Item>
            </Form>

            <Button
              type="primary"
              size="large"
              block
              className="mt-4 h-12 bg-red-500 hover:!bg-red-600"
              onClick={handleSubmit}
              loading={mutation.isPending}
            >
              {t('saveExpense')}
            </Button>
          </>
        )}
      </div>
    </Drawer>
  )
}
