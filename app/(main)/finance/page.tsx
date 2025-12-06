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
  CashOutForm,
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
  const [cashOutOpen, setCashOutOpen] = useState(false)

  const tabItems = [
    {
      key: 'cash',
      label: (
        <span className="flex items-center gap-1">
          <WalletOutlined />
          Tien mat
        </span>
      ),
      children: (
        <div>
          <CashBalanceCard
            onCashIn={() => setCashInOpen(true)}
            onCashOut={() => setCashOutOpen(true)}
          />

          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <Title level={5} className="!mb-0">Giao dich gan day</Title>
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
          Ngan hang
        </span>
      ),
      children: <BankAccountList />,
    },
    {
      key: 'expenses',
      label: (
        <span className="flex items-center gap-1">
          <AccountBookOutlined />
          Chi phi
        </span>
      ),
      children: <ExpenseList />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!mb-0">Quan ly thu chi</Title>
        <Segmented
          size="small"
          options={[
            { label: 'Ngay', value: 'day' },
            { label: 'Tuan', value: 'week' },
            { label: 'Thang', value: 'month' },
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
      <CashOutForm
        open={cashOutOpen}
        onClose={() => setCashOutOpen(false)}
      />
    </div>
  )
}
