'use client'

import { useState } from 'react'
import { Typography, Tabs, Button } from 'antd'
import { UserOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons'
import {
  CustomerList,
  CustomerForm,
  CustomerDetail,
} from '@/components/customers'
import {
  DebtList,
  DebtDetail,
  DebtSummaryCard,
  CreateDebtModal,
} from '@/components/debts'
import type { Customer } from '@/lib/supabase/functions'
import type { DebtDisplayData } from '@/components/debts/DebtCard'

const { Title } = Typography

type CustomerTab = 'customers' | 'debts'

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('customers')

  // Customer state
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDetail, setShowCustomerDetail] = useState(false)
  const [showEditCustomer, setShowEditCustomer] = useState(false)

  // Debt state
  const [debtDetailOpen, setDebtDetailOpen] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)
  const [createDebtModalOpen, setCreateDebtModalOpen] = useState(false)

  // Customer handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetail(true)
  }

  const handleEditCustomer = () => {
    setShowCustomerDetail(false)
    setShowEditCustomer(true)
  }

  // Debt handlers
  const handleSelectDebt = (debt: DebtDisplayData) => {
    setSelectedDebtId(debt.id)
    setDebtDetailOpen(true)
  }

  const tabItems = [
    {
      key: 'customers',
      label: (
        <span className="flex items-center gap-1">
          <UserOutlined />
          Khach hang
        </span>
      ),
      children: (
        <CustomerList
          onAdd={() => setShowAddCustomer(true)}
          onSelect={handleSelectCustomer}
        />
      ),
    },
    {
      key: 'debts',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          Cong no
        </span>
      ),
      children: (
        <div className="space-y-4">
          <DebtSummaryCard />
          <div className="flex justify-end mb-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateDebtModalOpen(true)}
            >
              Tao cong no
            </Button>
          </div>
          <DebtList onSelect={handleSelectDebt} />
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4}>Khach hang & Cong no</Title>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as CustomerTab)}
        items={tabItems}
      />

      {/* Customer Form - Add */}
      <CustomerForm
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
      />

      {/* Customer Form - Edit */}
      <CustomerForm
        open={showEditCustomer}
        onClose={() => setShowEditCustomer(false)}
        customer={selectedCustomer}
      />

      {/* Customer Detail */}
      <CustomerDetail
        open={showCustomerDetail}
        onClose={() => setShowCustomerDetail(false)}
        customerId={selectedCustomer?.id || null}
        onEdit={handleEditCustomer}
      />

      {/* Debt Detail */}
      <DebtDetail
        open={debtDetailOpen}
        onClose={() => {
          setDebtDetailOpen(false)
          setSelectedDebtId(null)
        }}
        debtId={selectedDebtId}
      />

      {/* Create Debt Modal */}
      <CreateDebtModal
        open={createDebtModalOpen}
        onClose={() => setCreateDebtModalOpen(false)}
      />
    </div>
  )
}
