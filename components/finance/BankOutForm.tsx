'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { ArrowDownOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type BankAccount } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import { formatCurrency } from '@/lib/utils'

interface BankOutFormProps {
  open: boolean
  onClose: () => void
  bankAccountId?: string
}

const REFERENCE_TYPES: { value: 'expense' | 'transfer' | 'other'; label: string }[] = [
  { value: 'expense', label: 'Chi phi' },
  { value: 'transfer', label: 'Chuyen khoan di' },
  { value: 'other', label: 'Khac' },
]

export function BankOutForm({ open, onClose, bankAccountId }: BankOutFormProps) {
  const [amount, setAmount] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(bankAccountId)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: accountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
  })

  const accounts = accountsData?.bank_accounts || []
  const selectedAccount = accounts.find((acc: BankAccount) => acc.id === selectedAccountId)

  const mutation = useMutation({
    mutationFn: (data: {
      bank_account_id: string
      amount: number
      description: string
      bank_ref?: string
      reference_type?: 'expense' | 'transfer' | 'other'
    }) => api.finance.bankOut(data),
    onSuccess: () => {
      message.success('Rut tien thanh cong')
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const handleClose = () => {
    setAmount(0)
    setSelectedAccountId(undefined)
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    if (amount <= 0) {
      message.warning('Vui long nhap so tien')
      return
    }

    if (selectedAccount && amount > (selectedAccount.balance || 0)) {
      message.error('So tien rut vuot qua so du tai khoan')
      return
    }

    try {
      const values = await form.validateFields()
      mutation.mutate({
        bank_account_id: values.bank_account_id,
        amount,
        description: values.description,
        bank_ref: values.bank_ref,
        reference_type: values.reference_type,
      })
    } catch {
      // Validation error
    }
  }

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <ArrowDownOutlined className="text-white" />
          </div>
          <span>Rut tien tu tai khoan</span>
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={handleClose}
      destroyOnHidden
    >
      <div className="max-w-md mx-auto">
        <AmountKeypad value={amount} onChange={setAmount} />

        {selectedAccount && (
          <div className="text-center text-sm text-gray-500 mt-2">
            So du hien tai: <span className="font-medium text-blue-600">{formatCurrency(selectedAccount.balance || 0)}</span>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          className="mt-6"
          initialValues={{ bank_account_id: bankAccountId }}
        >
          <Form.Item
            name="bank_account_id"
            label="Tai khoan ngan hang"
            rules={[{ required: true, message: 'Vui long chon tai khoan' }]}
          >
            <Select
              placeholder="Chon tai khoan"
              options={accounts.map((acc: BankAccount) => ({
                value: acc.id,
                label: `${acc.bank_name} - ${acc.account_number} (${formatCurrency(acc.balance || 0)})`,
              }))}
              onChange={(value) => setSelectedAccountId(value)}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mo ta"
            rules={[{ required: true, message: 'Vui long nhap mo ta' }]}
          >
            <Input.TextArea
              placeholder="VD: Rut tien mat, thanh toan nha cung cap..."
              rows={2}
            />
          </Form.Item>

          <Form.Item name="bank_ref" label="Ma giao dich ngan hang">
            <Input placeholder="VD: FT123456789" />
          </Form.Item>

          <Form.Item name="reference_type" label="Loai giao dich">
            <Select
              placeholder="Chon loai giao dich"
              options={REFERENCE_TYPES}
              allowClear
            />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          size="large"
          block
          danger
          className="mt-4 h-12"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0}
        >
          Xac nhan rut tien
        </Button>
      </div>
    </Drawer>
  )
}
