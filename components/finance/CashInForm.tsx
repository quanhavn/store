'use client'

import { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { AmountKeypad } from './AmountKeypad'

interface CashInFormProps {
  open: boolean
  onClose: () => void
}

const REFERENCE_TYPES = [
  { value: 'sale', label: 'Ban hang' },
  { value: 'adjustment', label: 'Dieu chinh' },
]

export function CashInForm({ open, onClose }: CashInFormProps) {
  const [amount, setAmount] = useState(0)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: { amount: number; description: string; reference_type?: 'sale' | 'adjustment' }) =>
      api.finance.cashIn(data),
    onSuccess: () => {
      message.success('Thu tien thanh cong')
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
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <ArrowUpOutlined className="text-white" />
          </div>
          <span>Thu tien mat</span>
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

        <Form form={form} layout="vertical" className="mt-6">
          <Form.Item
            name="description"
            label="Mo ta"
            rules={[{ required: true, message: 'Vui long nhap mo ta' }]}
          >
            <Input.TextArea
              placeholder="VD: Thu tien ban hang, thu no khach hang..."
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
          className="mt-4 h-12 bg-green-500 hover:!bg-green-600"
          onClick={handleSubmit}
          loading={mutation.isPending}
          disabled={amount <= 0}
        >
          Xac nhan thu tien
        </Button>
      </div>
    </Drawer>
  )
}
