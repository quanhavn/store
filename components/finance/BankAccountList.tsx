'use client'

import { useState } from 'react'
import { List, Card, Tag, Empty, Spin, Typography, Button, Dropdown, Modal, message } from 'antd'
import {
  BankOutlined,
  PlusOutlined,
  StarFilled,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type BankAccount } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { BankAccountForm } from './BankAccountForm'
import { BankInForm } from './BankInForm'
import { BankBalanceCard } from './BankBalanceCard'

const { Title } = Typography

interface BankAccountListProps {
  onBankOut?: (bankAccountId?: string) => void
}

export function BankAccountList({ onBankOut }: BankAccountListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [bankInOpen, setBankInOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
  })

  const accounts = data?.bank_accounts || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.finance.deleteBankAccount(id),
    onSuccess: () => {
      message.success(t('accountDeletedSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setFormOpen(true)
  }

  const handleDelete = (account: BankAccount) => {
    Modal.confirm({
      title: t('deleteAccountConfirm'),
      content: t('deleteAccountConfirmDesc', { name: account.bank_name }),
      okText: tCommon('delete'),
      okType: 'danger',
      cancelText: tCommon('cancel'),
      onOk: () => deleteMutation.mutate(account.id),
    })
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
    if (onBankOut) {
      onBankOut(accountId)
    }
  }

  const handleBankFormClose = () => {
    setBankInOpen(false)
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
        <Title level={5} className="!mb-0">{t('accountList')}</Title>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setFormOpen(true)}
        >
          {tCommon('add')}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty
          image={<BankOutlined className="text-5xl text-gray-300" />}
          description={t('noBankAccounts')}
        >
          <Button type="primary" onClick={() => setFormOpen(true)}>
            {t('addFirstAccount')}
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
                          {t('default')}
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
                          label: t('deposit'),
                          onClick: () => handleBankIn(account.id),
                        },
                        {
                          key: 'withdraw',
                          icon: <ArrowDownOutlined className="text-red-500" />,
                          label: t('withdraw'),
                          onClick: () => handleBankOut(account.id),
                        },
                        { type: 'divider' },
                        {
                          key: 'edit',
                          icon: <EditOutlined />,
                          label: tCommon('edit'),
                          onClick: () => handleEdit(account),
                        },
                        ...(account.transaction_count === 0
                          ? [
                              {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: tCommon('delete'),
                                danger: true,
                                onClick: () => handleDelete(account),
                              },
                            ]
                          : []),
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
    </div>
  )
}
