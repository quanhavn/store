'use client'

import { Card, Radio, InputNumber, Button, Typography, Input, Space, QRCode, Divider, Switch, Alert } from 'antd'
import {
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  QrcodeOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useState, useMemo } from 'react'
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
}

interface PaymentMethodsProps {
  total: number
  onConfirm: (payments: PaymentInfo[], debtInfo?: DebtInfo, debtPayment?: DebtPaymentInfo) => void
  loading?: boolean
  bankAccounts?: BankAccount[]
  // NEW props for partial payment
  customer?: Customer | null
  onCustomerSelect?: (customer: Customer | null) => void
  onCustomerCreate?: () => void
  allowPartialPayment?: boolean
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Tien mat', icon: <DollarOutlined /> },
  { value: 'bank_transfer', label: 'Chuyen khoan', icon: <BankOutlined /> },
  { value: 'momo', label: 'MoMo', icon: <WalletOutlined /> },
  { value: 'zalopay', label: 'ZaloPay', icon: <WalletOutlined /> },
]

export function PaymentMethods({
  total,
  onConfirm,
  loading = false,
  bankAccounts = [],
  customer,
  onCustomerSelect,
  onCustomerCreate,
  allowPartialPayment = false,
}: PaymentMethodsProps) {
  const [method, setMethod] = useState<PaymentInfo['method']>('cash')
  const [cashReceived, setCashReceived] = useState(total)
  const [bankRef, setBankRef] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string>()

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
          <Text className="block mb-2 font-medium">Khach hang:</Text>
          <CustomerSelector
            selectedCustomer={customer || null}
            onSelect={onCustomerSelect}
            onCreateNew={onCustomerCreate}
          />
          {customer && customer.total_debt > 0 && (
            <Alert
              type="warning"
              icon={<WarningOutlined />}
              message={`Khach hang dang co no ${formatCurrency(customer.total_debt)}`}
              className="mt-2"
              showIcon
            />
          )}
        </div>
      )}

      {/* Total amount display */}
      <div className="text-center mb-6">
        <Text type="secondary">So tien can thanh toan</Text>
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
                <Text strong>Thanh toan mot phan</Text>
                <Text type="secondary" className="block text-xs">
                  Cho phep ghi no so tien con lai
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
              message="Vui long chon khach hang de su dung thanh toan mot phan"
              className="mt-2"
              showIcon
            />
          )}
        </div>
      )}

      {/* Partial Payment Amount Input */}
      {isPartialPayment && (
        <div className="mb-4">
          <Text className="block mb-2">So tien thanh toan:</Text>
          <InputNumber
            size="large"
            className="w-full"
            min={1}
            max={total - 1}
            value={partialAmount}
            onChange={(v) => setPartialAmount(v || 0)}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
            addonAfter="d"
          />
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
            <Text className="block mb-2">Tien khach dua:</Text>
            <InputNumber
              size="large"
              className="w-full"
              min={0}
              value={cashReceived}
              onChange={(v) => setCashReceived(v || 0)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              addonAfter="d"
            />
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
                  <Text strong>Tru vao no cu</Text>
                  <Text type="secondary" className="block text-xs">
                    Khach dang no: {formatCurrency(customer.total_debt)}
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
                  <Text className="block mb-2 text-sm">So tien tru no:</Text>
                  <InputNumber
                    size="middle"
                    className="w-full"
                    min={1}
                    max={Math.min(extraAmount, customer.total_debt)}
                    value={debtPaymentAmount}
                    onChange={(v) => setDebtPaymentAmount(v || 0)}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                    addonAfter="d"
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      size="small"
                      onClick={() => setDebtPaymentAmount(Math.min(extraAmount, customer.total_debt))}
                    >
                      Toi da
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
                      50% no
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Change display */}
          {actualChange > 0 && (
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Text type="secondary">Tien thoi:</Text>
              <Title level={3} className="!m-0 text-green-600">
                {actualChange.toLocaleString('vi-VN')}d
              </Title>
              {applyExtraToDebt && debtPaymentAmount > 0 && (
                <Text type="secondary" className="text-xs">
                  (Da tru {formatCurrency(debtPaymentAmount)} vao no cu)
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
                <Text className="block mb-2">Chon tai khoan:</Text>
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
                    Quet ma QR de chuyen khoan
                  </Text>
                </div>
              )}
              <div>
                <Text className="block mb-2">Ma giao dich:</Text>
                <Input
                  placeholder="Nhap ma giao dich ngan hang"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Text type="secondary">Chua co tai khoan ngan hang nao</Text>
            </div>
          )}
        </div>
      )}

      {(method === 'momo' || method === 'zalopay') && (
        <div className="text-center py-4">
          <QrcodeOutlined className="text-6xl text-gray-300" />
          <Text type="secondary" className="block mt-2">
            Tinh nang dang phat trien
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

      <Button
        type="primary"
        size="large"
        block
        onClick={handleConfirm}
        loading={loading}
        disabled={!isValid}
      >
        {isPartialPayment && debtAmount > 0
          ? `Xac nhan thanh toan ${formatCurrency(partialAmount)} & ghi no ${formatCurrency(debtAmount)}`
          : applyExtraToDebt && debtPaymentAmount > 0
            ? `Xac nhan & tru ${formatCurrency(debtPaymentAmount)} vao no`
            : 'Xac nhan thanh toan'
        }
      </Button>
    </div>
  )
}
