'use client'

import { Form, Input, Button, message } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Customer, type CreateCustomerData } from '@/lib/supabase/functions'

interface CustomerQuickAddProps {
  initialPhone?: string
  initialName?: string
  onSuccess?: (customer: Customer) => void
  onCancel?: () => void
}

export function CustomerQuickAdd({
  initialPhone,
  initialName,
  onSuccess,
  onCancel
}: CustomerQuickAddProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerData) => api.customers.create(data),
    onSuccess: (result) => {
      message.success(t('createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      form.resetFields()
      onSuccess?.(result.customer)
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tErrors('generic'))
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: CreateCustomerData = {
        name: values.name,
        phone: values.phone,
      }
      createMutation.mutate(data)
    } catch {
      // Validation error
    }
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="text-sm font-medium text-blue-800 mb-3">
        {t('addCustomer')}
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          phone: initialPhone || '',
          name: initialName || '',
        }}
        className="space-y-3"
      >
        <Form.Item
          name="name"
          label={t('customerName')}
          rules={[{ required: true, message: t('validation.nameRequired') }]}
          className="!mb-3"
        >
          <Input placeholder="Nguyen Van A" autoFocus />
        </Form.Item>

        <Form.Item
          name="phone"
          label={t('phoneNumber')}
          rules={[
            { required: true, message: t('validation.phoneRequired') },
            { pattern: /^0\d{9}$/, message: t('validation.phoneInvalid') },
          ]}
          className="!mb-3"
        >
          <Input placeholder="0901234567" />
        </Form.Item>

        <div className="flex gap-2">
          {onCancel && (
            <Button onClick={onCancel} className="flex-1">
              {tCommon('cancel')}
            </Button>
          )}
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleSubmit}
            loading={createMutation.isPending}
            className="flex-1"
          >
            {tCommon('add')}
          </Button>
        </div>
      </Form>
    </div>
  )
}
