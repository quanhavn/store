'use client'

import { useState } from 'react'
import { Typography, Tabs, Segmented } from 'antd'
import {
  WalletOutlined,
  BankOutlined,
  AccountBookOutlined
} from '@ant-design/icons'
import {
  CashBalanceCard,
  CashTransactionList,
  CashInForm,
  PaymentOutForm,
  FinanceSummaryCard,
  BankAccountList,
  ExpenseList
} from '@/components/finance'

const { Title } = Typography

type FinanceTab = 'cash' | 'bank' | 'expenses'
type Period = 'day' | 'week' | 'month' | 'year'

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('cash')
  const [period, setPeriod] = useState<Period>('month')
  const [cashInOpen, setCashInOpen] = useState(false)
  const [paymentOutOpen, setPaymentOutOpen] = useState(false)
  const [paymentOutMethod, setPaymentOutMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [paymentOutBankId, setPaymentOutBankId] = useState<string | undefined>()

  const handleCashOut = () => {
    setPaymentOutMethod('cash')
    setPaymentOutBankId(undefined)
    setPaymentOutOpen(true)
  }

  const handleBankOut = (bankAccountId?: string) => {
    setPaymentOutMethod('bank_transfer')
    setPaymentOutBankId(bankAccountId)
    setPaymentOutOpen(true)
  }

  const tabItems = [
    {
      key: 'cash',
      label: (
        <span className="flex items-center gap-1">
          <WalletOutlined />
          Tiền mặt
        </span>
      ),
      children: (
        <div>
          <CashBalanceCard
            onCashIn={() => setCashInOpen(true)}
            onCashOut={handleCashOut}
          />

          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <Title level={5} className="!mb-0">Giao dịch gần đây</Title>
            </div>
            <CashTransactionList limit={10} />
          </div>
        </div>
      ),
    },
    {
      key: 'bank',
      label: (
        <span className="flex items-center gap-1">
          <BankOutlined />
          Ngân hàng
        </span>
      ),
      children: <BankAccountList onBankOut={handleBankOut} />,
    },
    {
      key: 'expenses',
      label: (
        <span className="flex items-center gap-1">
          <AccountBookOutlined />
          Chi phí
        </span>
      ),
      children: <ExpenseList />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!mb-0">Quản lý thu chi</Title>
        <Segmented
          size="small"
          options={[
            { label: 'Ngày', value: 'day' },
            { label: 'Tuần', value: 'week' },
            { label: 'Tháng', value: 'month' },
          ]}
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        />
      </div>

      <FinanceSummaryCard period={period} />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as FinanceTab)}
        items={tabItems}
        className="finance-tabs"
      />

      {/* Forms */}
      <CashInForm
        open={cashInOpen}
        onClose={() => setCashInOpen(false)}
      />
      <PaymentOutForm
        open={paymentOutOpen}
        onClose={() => setPaymentOutOpen(false)}
        defaultPaymentMethod={paymentOutMethod}
        defaultBankAccountId={paymentOutBankId}
      />
    </div>
  )
}
