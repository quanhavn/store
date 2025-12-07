'use client'

import { useState } from 'react'
import { List, Card, Tag, Empty, Spin, Typography, Button, Dropdown } from 'antd'
import {
  BankOutlined,
  PlusOutlined,
  StarFilled,
  MoreOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, type BankAccount } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { BankAccountForm } from './BankAccountForm'
import { BankInForm } from './BankInForm'
import { BankOutForm } from './BankOutForm'
import { BankBalanceCard } from './BankBalanceCard'

const { Text, Title } = Typography

export function BankAccountList() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [bankInOpen, setBankInOpen] = useState(false)
  const [bankOutOpen, setBankOutOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
  })

  const accounts = data?.bank_accounts || []

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingAccount(null)
  }

  const handleBankIn = (accountId?: string) => {
    setSelectedAccountId(accountId)
    setBankInOpen(true)
  }

  const handleBankOut = (accountId?: string) => {
    setSelectedAccountId(accountId)
    setBankOutOpen(true)
  }

  const handleBankFormClose = () => {
    setBankInOpen(false)
    setBankOutOpen(false)
    setSelectedAccountId(undefined)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <BankBalanceCard
        onBankIn={() => handleBankIn()}
        onBankOut={() => handleBankOut()}
      />

      <div className="flex justify-between items-center mb-3">
        <Title level={5} className="!mb-0">Danh sach tai khoan</Title>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setFormOpen(true)}
        >
          Them TK
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty
          image={<BankOutlined className="text-5xl text-gray-300" />}
          description="Chua co tai khoan ngan hang nao"
        >
          <Button type="primary" onClick={() => setFormOpen(true)}>
            Them tai khoan dau tien
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={accounts}
          renderItem={(account) => (
            <Card className="mb-3" size="small">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <BankOutlined className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.bank_name}</span>
                      {account.is_default && (
                        <Tag color="gold" className="m-0">
                          <StarFilled className="mr-1" />
                          Mac dinh
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{account.account_number}</div>
                    <div className="text-xs text-gray-500">{account.account_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-semibold text-lg text-blue-600">
                      {formatCurrency(account.balance || 0)}
                    </div>
                  </div>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'deposit',
                          icon: <ArrowUpOutlined className="text-green-500" />,
                          label: 'Nap tien',
                          onClick: () => handleBankIn(account.id),
                        },
                        {
                          key: 'withdraw',
                          icon: <ArrowDownOutlined className="text-red-500" />,
                          label: 'Rut tien',
                          onClick: () => handleBankOut(account.id),
                        },
                        { type: 'divider' },
                        {
                          key: 'edit',
                          icon: <EditOutlined />,
                          label: 'Chinh sua',
                          onClick: () => handleEdit(account),
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
              </div>
            </Card>
          )}
        />
      )}

      <BankAccountForm
        open={formOpen}
        onClose={handleFormClose}
        editData={editingAccount}
      />

      <BankInForm
        open={bankInOpen}
        onClose={handleBankFormClose}
        bankAccountId={selectedAccountId}
      />

      <BankOutForm
        open={bankOutOpen}
        onClose={handleBankFormClose}
        bankAccountId={selectedAccountId}
      />
    </div>
  )
}
