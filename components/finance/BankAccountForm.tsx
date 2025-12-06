'use client'

import { useEffect } from 'react'
import { Drawer, Form, Input, Select, Switch, InputNumber, Button, message } from 'antd'
import { BankOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type BankAccount } from '@/lib/supabase/functions'

interface BankAccountFormProps {
  open: boolean
  onClose: () => void
  editData?: BankAccount | null
}

const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VTB', name: 'VietinBank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SAB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'NAB', name: 'Nam A Bank' },
]

export function BankAccountForm({ open, onClose, editData }: BankAccountFormProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editData

  useEffect(() => {
    if (open && editData) {
      form.setFieldsValue({
        bank_name: editData.bank_name,
        account_number: editData.account_number,
        account_name: editData.account_name,
        branch: editData.branch,
        is_default: editData.is_default,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, editData, form])

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.createBankAccount>[0]) =>
      api.finance.createBankAccount(data),
    onSuccess: () => {
      message.success('Them tai khoan thanh cong')
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.finance.updateBankAccount>[0]) =>
      api.finance.updateBankAccount(data),
    onSuccess: () => {
      message.success('Cap nhat tai khoan thanh cong')
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (isEdit && editData) {
        updateMutation.mutate({
          id: editData.id,
          ...values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch {
      // Validation error
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <BankOutlined className="text-white" />
          </div>
          <span>{isEdit ? 'Chinh sua tai khoan' : 'Them tai khoan ngan hang'}</span>
        </div>
      }
      placement="bottom"
      height="85%"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <div className="max-w-md mx-auto">
        <Form form={form} layout="vertical">
          <Form.Item
            name="bank_name"
            label="Ngan hang"
            rules={[{ required: true, message: 'Vui long chon ngan hang' }]}
          >
            <Select
              placeholder="Chon ngan hang"
              showSearch
              optionFilterProp="label"
              options={VIETNAM_BANKS.map((bank) => ({
                value: bank.name,
                label: bank.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="account_number"
            label="So tai khoan"
            rules={[
              { required: true, message: 'Vui long nhap so tai khoan' },
              { pattern: /^\d{6,20}$/, message: 'So tai khoan khong hop le' },
            ]}
          >
            <Input placeholder="VD: 1234567890" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="account_name"
            label="Ten chu tai khoan"
            rules={[{ required: true, message: 'Vui long nhap ten chu tai khoan' }]}
          >
            <Input placeholder="VD: NGUYEN VAN A" className="uppercase" />
          </Form.Item>

          <Form.Item name="branch" label="Chi nhanh">
            <Input placeholder="VD: Chi nhanh Ha Noi" />
          </Form.Item>

          {!isEdit && (
            <Form.Item name="initial_balance" label="So du ban dau">
              <InputNumber
                className="w-full"
                placeholder="0"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/,/g, '') as unknown as 0}
                min={0}
                suffix="d"
              />
            </Form.Item>
          )}

          <Form.Item name="is_default" valuePropName="checked" label="Tai khoan mac dinh">
            <Switch />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          size="large"
          block
          className="mt-4 h-12"
          onClick={handleSubmit}
          loading={isLoading}
        >
          {isEdit ? 'Luu thay doi' : 'Them tai khoan'}
        </Button>
      </div>
    </Drawer>
  )
}
