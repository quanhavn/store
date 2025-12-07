'use client'

import { useEffect } from 'react'
import { Drawer, Form, Input, Button, message } from 'antd'
import { SaveOutlined, UserAddOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Customer, type CreateCustomerData } from '@/lib/supabase/functions'

interface CustomerFormProps {
  open: boolean
  onClose: () => void
  customer?: Customer | null
}

export function CustomerForm({ open, onClose, customer }: CustomerFormProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerData) => api.customers.create(data),
    onSuccess: () => {
      message.success('Them khach hang thanh cong')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateCustomerData>) =>
      api.customers.update(customer!.id, data),
    onSuccess: () => {
      message.success('Cap nhat khach hang thanh cong')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  useEffect(() => {
    if (open) {
      if (customer) {
        form.setFieldsValue({
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          tax_code: customer.tax_code,
          notes: customer.notes,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, customer, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: CreateCustomerData = {
        name: values.name,
        phone: values.phone,
        address: values.address || undefined,
        tax_code: values.tax_code || undefined,
        notes: values.notes || undefined,
      }

      if (customer) {
        updateMutation.mutate(data)
      } else {
        createMutation.mutate(data)
      }
    } catch {
      // Validation error
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={customer ? 'Sua khach hang' : 'Them khach hang'}
      placement="bottom"
      height="90%"
      extra={
        <Button
          type="primary"
          icon={customer ? <SaveOutlined /> : <UserAddOutlined />}
          onClick={handleSubmit}
          loading={isPending}
        >
          {customer ? 'Luu' : 'Them'}
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className="pb-16"
      >
        <Form.Item
          name="name"
          label="Ho va ten"
          rules={[{ required: true, message: 'Nhap ten khach hang' }]}
        >
          <Input placeholder="Nguyen Van A" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="So dien thoai"
          rules={[
            { required: true, message: 'Nhap so dien thoai' },
            { pattern: /^0\d{9}$/, message: 'So dien thoai phai co 10 chu so va bat dau bang 0' },
          ]}
        >
          <Input placeholder="0901234567" />
        </Form.Item>

        <Form.Item
          name="address"
          label="Dia chi"
        >
          <Input.TextArea
            placeholder="123 Nguyen Van Linh, Q7, TP.HCM"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="tax_code"
          label="Ma so thue"
          rules={[
            {
              pattern: /^\d{10}(\d{3})?$/,
              message: 'Ma so thue phai co 10 hoac 13 chu so'
            },
          ]}
        >
          <Input placeholder="0123456789" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Ghi chu"
        >
          <Input.TextArea
            placeholder="Ghi chu ve khach hang..."
            rows={3}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
