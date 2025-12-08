'use client'

import { useEffect } from 'react'
import { Drawer, Form, Input, Button, message } from 'antd'
import { SaveOutlined, UserAddOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Customer, type CreateCustomerData } from '@/lib/supabase/functions'

interface CustomerFormProps {
  open: boolean
  onClose: () => void
  customer?: Customer | null
}

export function CustomerForm({ open, onClose, customer }: CustomerFormProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerData) => api.customers.create(data),
    onSuccess: () => {
      message.success(t('createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateCustomerData>) =>
      api.customers.update(customer!.id, data),
    onSuccess: () => {
      message.success(t('updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
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
      title={customer ? t('editCustomer') : t('addCustomer')}
      placement="bottom"
      height="90%"
      extra={
        <Button
          type="primary"
          icon={customer ? <SaveOutlined /> : <UserAddOutlined />}
          onClick={handleSubmit}
          loading={isPending}
        >
          {customer ? tCommon('save') : tCommon('add')}
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
          label={t('customerName')}
          rules={[{ required: true, message: t('validation.nameRequired') }]}
        >
          <Input placeholder="Nguyen Van A" />
        </Form.Item>

        <Form.Item
          name="phone"
          label={t('phoneNumber')}
          rules={[
            { required: true, message: t('validation.phoneRequired') },
            { pattern: /^0\d{9}$/, message: t('validation.phoneInvalid') },
          ]}
        >
          <Input placeholder="0901234567" />
        </Form.Item>

        <Form.Item
          name="address"
          label={t('address')}
        >
          <Input.TextArea
            placeholder="123 Nguyen Van Linh, Q7, TP.HCM"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="tax_code"
          label={t('taxCode')}
          rules={[
            {
              pattern: /^\d{10}(\d{3})?$/,
              message: t('validation.taxCodeInvalid')
            },
          ]}
        >
          <Input placeholder="0123456789" />
        </Form.Item>

        <Form.Item
          name="notes"
          label={tCommon('note')}
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
