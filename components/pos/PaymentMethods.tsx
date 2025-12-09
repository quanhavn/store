'use client'

import { useTranslations } from 'next-intl'
import { Card, Radio, InputNumber, Button, Typography, Input, Space, QRCode, Divider, Switch, Alert } from 'antd'
import {
  DollarOutlined,
  BankOutlined,
  QrcodeOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useState, useMemo, useEffect } from 'react'
import { CustomerSelector } from './CustomerSelector'
import { DebtOptionsForm } from './DebtOptionsForm'
import { type Customer } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

const { Text, Title } = Typography

export interface PaymentInfo {
  method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
  amount: number
  bank_account_id?: string
  bank_ref?: string
}

export interface DebtInfo {
  customer_id: string
  amount: number
  debt_type: 'credit' | 'installment'
  due_date?: string
  installments?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  first_due_date?: string
}

export interface DebtPaymentInfo {
  amount: number
}

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  is_default?: boolean
}

interface PaymentMethodsProps {
  total: number
  onConfirm: (payments: PaymentInfo[], debtInfo?: DebtInfo, debtPayment?: DebtPaymentInfo) => void
  onBack?: () => void
  loading?: boolean
  bankAccounts?: BankAccount[]
  // NEW props for partial payment
  customer?: Customer | null
  onCustomerSelect?: (customer: Customer | null) => void
  onCustomerCreate?: () => void
  allowPartialPayment?: boolean
}

export function PaymentMethods({
  total,
  onConfirm,
  onBack,
  loading = false,
  bankAccounts = [],
  customer,
  onCustomerSelect,
  onCustomerCreate,
  allowPartialPayment = false,
}: PaymentMethodsProps) {
  const t = useTranslations('pos')
  const tDebts = useTranslations('debts')
  const tCustomers = useTranslations('customers')

  const PAYMENT_OPTIONS = [
    { value: 'cash', label: t('cash'), icon: <DollarOutlined /> },
    { value: 'bank_transfer', label: t('bankTransfer'), icon: <BankOutlined /> },
  ]

  const [method, setMethod] = useState<PaymentInfo['method']>('cash')
  const [cashReceived, setCashReceived] = useState(total)
  const [bankRef, setBankRef] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string>()

  // Auto-select default bank account when bank_transfer is selected
  useEffect(() => {
    if (method === 'bank_transfer' && bankAccounts.length > 0 && !selectedBankId) {
      const defaultAccount = bankAccounts.find(acc => acc.is_default) || bankAccounts[0]
      setSelectedBankId(defaultAccount.id)
    }
  }, [method, bankAccounts, selectedBankId])

  // Partial payment states
  const [isPartialPayment, setIsPartialPayment] = useState(false)
  const [partialAmount, setPartialAmount] = useState(0)

  // Debt options states
  const [debtType, setDebtType] = useState<'credit' | 'installment'>('credit')
  const [debtOptions, setDebtOptions] = useState<{
    due_date?: string
    installments?: number
    frequency?: 'weekly' | 'biweekly' | 'monthly'
    first_due_date?: string
  }>({
    due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    installments: 2,
    frequency: 'monthly',
    first_due_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  })

  // Debt payment states (pay extra to reduce existing debt)
  const [applyExtraToDebt, setApplyExtraToDebt] = useState(false)
  const [debtPaymentAmount, setDebtPaymentAmount] = useState(0)

  // Calculate remaining debt amount
  const debtAmount = useMemo(() => {
    if (!isPartialPayment) return 0
    return Math.max(0, total - partialAmount)
  }, [isPartialPayment, total, partialAmount])

  // Calculate extra amount available for debt payment
  const extraAmount = useMemo(() => {
    if (method !== 'cash' || isPartialPayment) return 0
    return Math.max(0, cashReceived - total)
  }, [method, cashReceived, total, isPartialPayment])

  // Calculate actual change (after debt payment)
  const actualChange = useMemo(() => {
    if (method !== 'cash') return 0
    const amountToPay = isPartialPayment ? partialAmount : total
    const totalDeducted = amountToPay + (applyExtraToDebt ? debtPaymentAmount : 0)
    return Math.max(0, cashReceived - totalDeducted)
  }, [method, cashReceived, total, isPartialPayment, partialAmount, applyExtraToDebt, debtPaymentAmount])

  // Validation
  const change = method === 'cash' ? Math.max(0, cashReceived - (isPartialPayment ? partialAmount : total)) : 0

  const isPaymentValid = useMemo(() => {
    const amountToPay = isPartialPayment ? partialAmount : total
    if (method === 'cash') {
      return cashReceived >= amountToPay
    }
    return true
  }, [method, cashReceived, isPartialPayment, partialAmount, total])

  const isPartialPaymentValid = useMemo(() => {
    if (!isPartialPayment) return true
    // Must have a customer for partial payment
    if (!customer) return false
    // Partial amount must be greater than 0 and less than total
    if (partialAmount <= 0 || partialAmount >= total) return false
    return true
  }, [isPartialPayment, customer, partialAmount, total])

  const isValid = isPaymentValid && isPartialPaymentValid

  const handleConfirm = () => {
    const paymentAmount = isPartialPayment ? partialAmount : total

    const payment: PaymentInfo = {
      method,
      amount: paymentAmount,
      bank_account_id: method === 'bank_transfer' ? selectedBankId : undefined,
      bank_ref: method === 'bank_transfer' ? bankRef : undefined,
    }

    // Build debt payment info if applying extra to debt
    const debtPayment: DebtPaymentInfo | undefined = 
      applyExtraToDebt && debtPaymentAmount > 0 && customer
        ? { amount: debtPaymentAmount }
        : undefined

    if (isPartialPayment && debtAmount > 0 && customer) {
      const debtInfo: DebtInfo = {
        customer_id: customer.id,
        amount: debtAmount,
        debt_type: debtType,
        ...(debtType === 'credit'
          ? { due_date: debtOptions.due_date }
          : {
              installments: debtOptions.installments,
              frequency: debtOptions.frequency,
              first_due_date: debtOptions.first_due_date,
            }
        ),
      }
      onConfirm([payment], debtInfo, debtPayment)
    } else {
      onConfirm([payment], undefined, debtPayment)
    }
  }

  // Handle partial payment toggle
  const handlePartialPaymentToggle = (checked: boolean) => {
    setIsPartialPayment(checked)
    if (checked) {
      // Default to paying half
      setPartialAmount(Math.floor(total / 2))
    } else {
      setPartialAmount(0)
    }
  }

  // Generate VietQR URL
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId)
  const qrAmount = isPartialPayment ? partialAmount : total
  const vietQRUrl = selectedBank
    ? `https://img.vietqr.io/image/${selectedBank.bank_name}-${selectedBank.account_number}-compact.png?amount=${qrAmount}&addInfo=${encodeURIComponent(`Thanh toan`)}`
    : undefined

  return (
    <div className="space-y-4">
      {/* Customer Selector - show when allowPartialPayment is enabled */}
      {allowPartialPayment && onCustomerSelect && (
        <div className="mb-4">
          <Text className="block mb-2 font-medium">{t('customer')}:</Text>
          <CustomerSelector
            selectedCustomer={customer || null}
            onSelect={onCustomerSelect}
            onCreateNew={onCustomerCreate}
          />
          {customer && customer.total_debt > 0 && (
            <Alert
              type="warning"
              icon={<WarningOutlined />}
              message={t('customerHasDebt', { amount: formatCurrency(customer.total_debt) })}
              className="mt-2"
              showIcon
            />
          )}
        </div>
      )}

      {/* Total amount display */}
      <div className="text-center mb-6">
        <Text type="secondary">{t('amountToPay')}</Text>
        <Title level={2} className="!m-0 text-blue-600">
          {total.toLocaleString('vi-VN')}d
        </Title>
      </div>

      {/* Partial Payment Toggle */}
      {allowPartialPayment && (
        <div className="mb-4">
          <Card size="small" className={isPartialPayment ? 'border-orange-300 bg-orange-50' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <Text strong>{t('partialPayment')}</Text>
                <Text type="secondary" className="block text-xs">
                  {t('partialPaymentDescription')}
                </Text>
              </div>
              <Switch
                checked={isPartialPayment}
                onChange={handlePartialPaymentToggle}
                disabled={!customer && !onCustomerSelect}
              />
            </div>
          </Card>

          {isPartialPayment && !customer && (
            <Alert
              type="error"
              message={t('selectCustomerForPartial')}
              className="mt-2"
              showIcon
            />
          )}
        </div>
      )}

      {/* Partial Payment Amount Input */}
      {isPartialPayment && (
        <div className="mb-4">
          <Text className="block mb-2">{t('partialPaymentAmount')}:</Text>
          <Space.Compact className="w-full">
            <InputNumber
              size="large"
              className="!w-full"
              min={1}
              max={total - 1}
              value={partialAmount}
              onChange={(v) => setPartialAmount(v || 0)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            />
            <Space.Addon>d</Space.Addon>
          </Space.Compact>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[0.25, 0.5, 0.75, 0.9].map((ratio) => (
              <Button
                key={ratio}
                size="small"
                onClick={() => setPartialAmount(Math.floor(total * ratio))}
              >
                {(ratio * 100).toFixed(0)}%
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <Radio.Group
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full"
      >
        <Space direction="vertical" className="w-full">
          {PAYMENT_OPTIONS.map((opt) => (
            <Card
              key={opt.value}
              size="small"
              className={`cursor-pointer ${method === opt.value ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setMethod(opt.value as PaymentInfo['method'])}
            >
              <Radio value={opt.value}>
                <Space>
                  {opt.icon}
                  {opt.label}
                </Space>
              </Radio>
            </Card>
          ))}
        </Space>
      </Radio.Group>

      <Divider />

      {method === 'cash' && (
        <div className="space-y-4">
          <div>
            <Text className="block mb-2">{t('cashReceived')}:</Text>
            <Space.Compact className="w-full">
              <InputNumber
                size="large"
                className="!w-full"
                min={0}
                value={cashReceived}
                onChange={(v) => setCashReceived(v || 0)}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              />
              <Space.Addon>d</Space.Addon>
            </Space.Compact>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[50000, 100000, 200000, 500000].map((amount) => (
              <Button key={amount} onClick={() => setCashReceived(amount)}>
                {(amount / 1000).toFixed(0)}k
              </Button>
            ))}
          </div>

          {/* Apply extra to debt section */}
          {!isPartialPayment && customer && customer.total_debt > 0 && extraAmount > 0 && (
            <Card size="small" className={applyExtraToDebt ? 'border-blue-300 bg-blue-50' : 'border-dashed'}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Text strong>{t('deductFromDebt')}</Text>
                  <Text type="secondary" className="block text-xs">
                    {tDebts('customerOwes')}: {formatCurrency(customer.total_debt)}
                  </Text>
                </div>
                <Switch
                  checked={applyExtraToDebt}
                  onChange={(checked) => {
                    setApplyExtraToDebt(checked)
                    if (checked) {
                      const maxDebtPayment = Math.min(extraAmount, customer.total_debt)
                      setDebtPaymentAmount(maxDebtPayment)
                    } else {
                      setDebtPaymentAmount(0)
                    }
                  }}
                />
              </div>
              {applyExtraToDebt && (
                <div className="mt-3">
                  <Text className="block mb-2 text-sm">{t('debtDeductionAmount')}:</Text>
                  <Space.Compact className="w-full">
                    <InputNumber
                      size="middle"
                      className="w-full"
                      min={1}
                      max={Math.min(extraAmount, customer.total_debt)}
                      value={debtPaymentAmount}
                      onChange={(v) => setDebtPaymentAmount(v || 0)}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                    />
                    <Space.Addon>d</Space.Addon>
                  </Space.Compact>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      size="small"
                      onClick={() => setDebtPaymentAmount(Math.min(extraAmount, customer.total_debt))}
                    >
                      {t('maximum')}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setDebtPaymentAmount(Math.min(Math.floor(extraAmount / 2), customer.total_debt))}
                    >
                      50%
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setDebtPaymentAmount(Math.min(Math.floor(customer.total_debt / 2), extraAmount))}
                    >
                      {t('halfDebt')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Change display */}
          {actualChange > 0 && (
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Text type="secondary">{t('change')}:</Text>
              <Title level={3} className="!m-0 text-green-600">
                {actualChange.toLocaleString('vi-VN')}d
              </Title>
              {applyExtraToDebt && debtPaymentAmount > 0 && (
                <Text type="secondary" className="text-xs">
                  ({t('deductedFromDebt', { amount: formatCurrency(debtPaymentAmount) })})
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {method === 'bank_transfer' && (
        <div className="space-y-4">
          {bankAccounts.length > 0 ? (
            <>
              <div>
                <Text className="block mb-2">{t('selectAccount')}:</Text>
                <Radio.Group
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full"
                >
                  <Space direction="vertical" className="w-full">
                    {bankAccounts.map((bank) => (
                      <Radio key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_number}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
              {selectedBankId && vietQRUrl && (
                <div className="text-center">
                  <QRCode value={vietQRUrl} size={200} className="mx-auto" />
                  <Text type="secondary" className="block mt-2">
                    {t('scanQRToPay')}
                  </Text>
                </div>
              )}
              <div>
                <Text className="block mb-2">{t('transactionCode')}:</Text>
                <Input
                  placeholder={t('enterTransactionCode')}
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Text type="secondary">{t('noBankAccount')}</Text>
            </div>
          )}
        </div>
      )}

      {(method === 'momo' || method === 'zalopay') && (
        <div className="text-center py-4">
          <QrcodeOutlined className="text-6xl text-gray-300" />
          <Text type="secondary" className="block mt-2">
            {t('featureInDevelopment')}
          </Text>
        </div>
      )}

      {/* Remaining as Debt Section */}
      {isPartialPayment && debtAmount > 0 && (
        <>
          <Divider />
          <DebtOptionsForm
            amount={debtAmount}
            debtType={debtType}
            onDebtTypeChange={setDebtType}
            debtOptions={debtOptions}
            onOptionsChange={setDebtOptions}
          />
        </>
      )}

      <div className="flex gap-2 mt-4">
        {onBack && (
          <Button
            size="large"
            onClick={onBack}
            disabled={loading}
          >
            {t('back')}
          </Button>
        )}
        <Button
          type="primary"
          size="large"
          block
          onClick={handleConfirm}
          loading={loading}
          disabled={!isValid}
        >
          {isPartialPayment && debtAmount > 0
            ? t('confirmPartialPayment', { payAmount: formatCurrency(partialAmount), debtAmount: formatCurrency(debtAmount) })
            : applyExtraToDebt && debtPaymentAmount > 0
              ? t('confirmAndDeductDebt', { amount: formatCurrency(debtPaymentAmount) })
              : t('confirmPayment')
          }
        </Button>
      </div>
    </div>
  )
}
