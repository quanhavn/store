'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message, Alert } from 'antd'
import { ArrowDownOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'
import { formatCurrency } from '@/lib/utils'

interface CashOutFormProps {
  open: boolean
  onClose: () => void
}

const REFERENCE_TYPES = [
  { value: 'expense', label: 'Chi phi' },
  { value: 'salary', label: 'Tra luong' },
  { value: 'adjustment', label: 'Dieu chinh' },
]

export function CashOutForm({ open, onClose }: CashOutFormProps) {
  const [amount, setAmount] = useState(0)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Get current balance to show max amount
  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => api.finance.cashBalance(),
  })

  const currentBalance = balanceData?.balance || 0

  const mutation = useMutation({
    mutationFn: (data: { amount: number; description: string; reference_type?: 'expense' | 'salary' | 'adjustment' }) =>
      api.finance.cashOut(data),
    onSuccess: () => {
      message.success('Chi tien thanh cong')
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] })
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      handleClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const handleClose = () => {
    setAmount(0)
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    if (amount <= 0) {
      message.warning('Vui long nhap so tien')
      return
    }

    if (amount > currentBalance) {
      message.warning('So tien chi vuot qua so du quy')
      return
    }

    try {
      const values = await form.validateFields()
      mutation.mutate({
        amount,
        description: values.description,
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
          <span>Chi tien mat</span>
        </div>
      }
      placement="bottom"
      height="90%"
      open={open}
      onClose={handleClose}
      destroyOnClose
    >
      <div className="max-w-md mx-auto">
        {currentBalance <= 0 && (
          <Alert
            type="warning"
            message="Quy tien mat dang trong"
            className="mb-4"
          />
        )}

        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-gray-600">So du hien tai:</span>
          <span className="font-semibold text-lg">{formatCurrency(currentBalance)}</span>
        </div>

        <AmountKeypad
          value={amount}
          onChange={setAmount}
          maxValue={currentBalance > 0 ? currentBalance : undefined}
        />

        <Form form={form} layout="vertical" className="mt-6">
          <Form.Item
            name="description"
            label="Mo ta"
            rules={[{ required: true, message: 'Vui long nhap mo ta' }]}
          >
            <Input.TextArea
              placeholder="VD: Tra tien hang, chi phi van phong..."
              rows={2}
            />
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
          className="mt-4 h-12 bg-red-500 hover:!bg-red-600"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0 || amount > currentBalance}
        >
          Xac nhan chi tien
        </Button>
      </div>
    </Drawer>
  )
}
