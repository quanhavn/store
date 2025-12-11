'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message, DatePicker, InputNumber, Collapse, Switch, Typography } from 'antd'
import { ArrowDownOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type BankAccount, type ExpenseCategory } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

const { Text } = Typography

interface PaymentOutFormProps {
  open: boolean
  onClose: () => void
  defaultPaymentMethod?: 'cash' | 'bank_transfer'
  defaultBankAccountId?: string
}

export function PaymentOutForm({ 
  open, 
  onClose, 
  defaultPaymentMethod = 'cash',
  defaultBankAccountId 
}: PaymentOutFormProps) {
  const [amount, setAmount] = useState(0)
  const [showKeypad, setShowKeypad] = useState(true)
  const [skipExpense, setSkipExpense] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  // Fetch cash balance
  const { data: cashBalanceData } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => api.finance.cashBalance(),
    enabled: open,
  })

  // Fetch bank accounts
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
    enabled: open,
  })

  // Fetch expense categories
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.finance.listExpenseCategories(),
    enabled: open,
  })

  const cashBalance = cashBalanceData?.balance || 0
  const bankAccounts = bankAccountsData?.bank_accounts || []
  const categories = categoriesData?.categories || []

  const paymentMethod = Form.useWatch('payment_method', form)
  const selectedBankId = Form.useWatch('bank_account_id', form)
  const selectedBank = bankAccounts.find((acc: BankAccount) => acc.id === selectedBankId)

  // Get current available balance based on payment method
  const availableBalance = paymentMethod === 'cash' 
    ? cashBalance 
    : (selectedBank?.balance || 0)

  // Mutation for expense (full record)
  const expenseMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.createExpense>[0]) =>
      api.finance.createExpense(data),
    onSuccess: () => {
      message.success(t('paymentOutSuccess'))
      invalidateQueries()
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  // Mutation for simple cash out
  const cashOutMutation = useMutation({
    mutationFn: (data: { amount: number; description: string }) =>
      api.finance.cashOut(data),
    onSuccess: () => {
      message.success(t('paymentOutSuccess'))
      invalidateQueries()
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  // Mutation for simple bank out
  const bankOutMutation = useMutation({
    mutationFn: (data: { bank_account_id: string; amount: number; description: string }) =>
      api.finance.bankOut(data),
    onSuccess: () => {
      message.success(t('paymentOutSuccess'))
      invalidateQueries()
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
  }

  const handleClose = () => {
    setAmount(0)
    setShowKeypad(true)
    setSkipExpense(false)
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

      if (skipExpense) {
        // Simple cash/bank out without expense record
        if (values.payment_method === 'cash') {
          cashOutMutation.mutate({
            amount,
            description: values.description,
          })
        } else {
          bankOutMutation.mutate({
            bank_account_id: values.bank_account_id,
            amount,
            description: values.description,
          })
        }
      } else {
        // Full expense record
        expenseMutation.mutate({
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
      }
    } catch {
      // Validation error
    }
  }

  const isLoading = expenseMutation.isPending || cashOutMutation.isPending || bankOutMutation.isPending

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <ArrowDownOutlined className="text-white" />
          </div>
          <span>{t('paymentOut')}</span>
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
                {formatCurrency(amount)}
              </div>
              <Button type="link" onClick={() => setShowKeypad(true)}>
                {t('editAmount')}
              </Button>
            </div>

            <Form 
              form={form} 
              layout="vertical" 
              initialValues={{ 
                payment_method: defaultPaymentMethod, 
                bank_account_id: defaultBankAccountId,
                expense_date: dayjs() 
              }}
            >
              {/* Payment Source */}
              <Form.Item
                name="payment_method"
                label={t('paymentSource')}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { 
                      value: 'cash', 
                      label: `${t('paymentMethods.cash')} (${formatCurrency(cashBalance)})` 
                    },
                    { 
                      value: 'bank_transfer', 
                      label: t('paymentMethods.bankTransfer') 
                    },
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
                    options={bankAccounts.map((acc: BankAccount) => ({
                      value: acc.id,
                      label: `${acc.bank_name} - ${acc.account_number} (${formatCurrency(acc.balance || 0)})`,
                    }))}
                  />
                </Form.Item>
              )}

              {/* Show available balance warning */}
              {amount > availableBalance && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-yellow-700 text-sm">
                  ⚠️ {t('balanceWarning')} ({formatCurrency(availableBalance)})
                </div>
              )}

              {/* Description */}
              <Form.Item
                name="description"
                label={tCommon('description')}
                rules={[{ required: true, message: t('validation.descriptionRequired') }]}
              >
                <Input.TextArea
                  placeholder={t('placeholders.expenseDescription')}
                  rows={2}
                />
              </Form.Item>

              {/* Skip Expense Toggle */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{t('skipExpense')}</span>
                  <Switch 
                    checked={skipExpense} 
                    onChange={setSkipExpense}
                  />
                </div>
                <div className="flex items-start gap-2 text-gray-500 text-xs">
                  <InfoCircleOutlined className="mt-0.5 flex-shrink-0" />
                  <Text type="secondary" className="text-xs">
                    {t('skipExpenseHint')}
                  </Text>
                </div>
              </div>

              {/* Expense fields - only show when not skipping */}
              {!skipExpense && (
                <>
                  {/* Expense Category */}
                  <Form.Item
                    name="category_id"
                    label={t('expenseCategory')}
                    rules={[{ required: !skipExpense, message: t('validation.selectCategory') }]}
                  >
                    <Select
                      placeholder={t('placeholders.selectCategory')}
                      options={categories.map((cat: ExpenseCategory) => ({
                        value: cat.id,
                        label: cat.name,
                      }))}
                    />
                  </Form.Item>

                  {/* Invoice Details (Collapsible) */}
                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'invoice',
                        label: (
                          <span className="flex items-center gap-2 text-blue-600">
                            <FileTextOutlined />
                            {t('invoiceDetails')}
                          </span>
                        ),
                        children: (
                          <>
                            <Form.Item name="expense_date" label={t('expenseDate')}>
                              <DatePicker className="w-full" format="DD/MM/YYYY" />
                            </Form.Item>

                            <div className="grid grid-cols-2 gap-4">
                              <Form.Item name="invoice_no" label={t('invoiceNumber')}>
                                <Input placeholder={t('placeholders.invoiceNumber')} />
                              </Form.Item>
                              <Form.Item name="vat_amount" label={t('vatAmount')}>
                                <InputNumber
                                  className="w-full"
                                  placeholder="0"
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={(value) => value?.replace(/,/g, '') as unknown as 0}
                                  min={0}
                                  suffix="đ"
                                />
                              </Form.Item>
                            </div>

                            <Form.Item name="supplier_name" label={t('supplierName')}>
                              <Input placeholder={t('placeholders.supplierName')} />
                            </Form.Item>

                            <Form.Item name="supplier_tax_code" label={t('supplierTaxCode')}>
                              <Input placeholder={t('placeholders.taxCode')} />
                            </Form.Item>
                          </>
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </Form>

            <Button
              type="primary"
              size="large"
              block
              className="mt-4 h-12 bg-red-500 hover:!bg-red-600"
              onClick={handleSubmit}
              loading={isLoading}
            >
              {t('confirmPayment')}
            </Button>
          </>
        )}
      </div>
    </Drawer>
  )
}
