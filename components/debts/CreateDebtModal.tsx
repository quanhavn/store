'use client'

import { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, message, Typography, Divider, Alert, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Customer } from '@/lib/supabase/functions'
import dayjs from 'dayjs'

const { Text } = Typography

interface CreateDebtModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateDebtModal({ open, onClose, onSuccess }: CreateDebtModalProps) {
  const t = useTranslations('debts')
  const tCommon = useTranslations('common')
  const tCustomers = useTranslations('customers')
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const debtType = Form.useWatch('debt_type', form)
  const [customerSearch, setCustomerSearch] = useState('')
  const selectedCustomerId = Form.useWatch('customer_id', form)

  const DEBT_TYPES = [
    { value: 'credit', label: t('credit') },
    { value: 'installment', label: t('installment') },
  ]

  const INSTALLMENT_FREQUENCIES = [
    { value: 'weekly', label: t('weekly') },
    { value: 'biweekly', label: t('biweekly') },
    { value: 'monthly', label: t('monthly') },
  ]

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => customerSearch.trim() 
      ? api.customers.search({ query: customerSearch, limit: 20 })
      : api.customers.list({ limit: 20 }),
    enabled: open,
  })

  const customers = customersData?.customers || []
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const createCreditMutation = useMutation({
    mutationFn: (data: {
      customer_id: string
      amount: number
      due_date?: string
      notes?: string
    }) => api.debts.createCredit(data),
    onSuccess: () => {
      message.success(tCommon('success'))
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-summary'] })
      form.resetFields()
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  const createInstallmentMutation = useMutation({
    mutationFn: (data: {
      customer_id: string
      amount: number
      installments: number
      frequency: 'weekly' | 'biweekly' | 'monthly'
      first_due_date: string
      notes?: string
    }) => api.debts.createInstallment(data),
    onSuccess: () => {
      message.success(tCommon('success'))
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-summary'] })
      form.resetFields()
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({
        debt_type: 'credit',
        due_date: dayjs().add(30, 'day'),
        first_due_date: dayjs().add(7, 'day'),
        installments: 3,
        frequency: 'monthly',
      })
    }
  }, [open, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!values.customer_id) {
        message.error(tCustomers('selectCustomer'))
        return
      }

      if (values.debt_type === 'credit') {
        createCreditMutation.mutate({
          customer_id: values.customer_id,
          amount: values.amount,
          due_date: values.due_date?.format('YYYY-MM-DD'),
          notes: values.notes,
        })
      } else {
        createInstallmentMutation.mutate({
          customer_id: values.customer_id,
          amount: values.amount,
          installments: values.installments,
          frequency: values.frequency,
          first_due_date: values.first_due_date.format('YYYY-MM-DD'),
          notes: values.notes,
        })
      }
    } catch {
      // Validation error
    }
  }

  const isPending = createCreditMutation.isPending || createInstallmentMutation.isPending

  return (
    <Modal
      title={t('createDebt')}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {tCommon('cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleSubmit}
          loading={isPending}
        >
          {t('createDebt')}
        </Button>,
      ]}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        {/* Customer selection */}
        <Form.Item
          name="customer_id"
          label={tCustomers('customer')}
          rules={[{ required: true, message: tCustomers('selectCustomer') }]}
        >
          <Select
            placeholder={tCustomers('selectCustomer')}
            showSearch
            loading={loadingCustomers}
            onSearch={setCustomerSearch}
            filterOption={false}
            options={customers.map(c => ({
              value: c.id,
              label: `${c.name} - ${c.phone || tCustomers('noPhone')}`,
            }))}
          />
        </Form.Item>

        {selectedCustomer && (
          <Alert
            type="info"
            className="mb-4"
            message={
              <div className="text-sm">
                <div><strong>{selectedCustomer.name}</strong></div>
                {selectedCustomer.phone && <div>{tCustomers('phone')}: {selectedCustomer.phone}</div>}
              </div>
            }
          />
        )}

        <Divider className="!my-3" />

        <Form.Item
          name="debt_type"
          label={t('debtType')}
          rules={[{ required: true }]}
        >
          <Select options={DEBT_TYPES} />
        </Form.Item>

        <Form.Item
          name="amount"
          label={tCommon('amount')}
          rules={[
            { required: true, message: tCommon('enterAmount') },
            { type: 'number', min: 1000, message: tCommon('minAmount') },
          ]}
        >
          <Space.Compact className="w-full">
            <InputNumber<number>
              className="w-full"
              min={1000}
              step={10000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
              placeholder="0"
            />
            <Space.Addon>VND</Space.Addon>
          </Space.Compact>
        </Form.Item>

        {/* Credit-specific fields */}
        {debtType === 'credit' && (
          <Form.Item
            name="due_date"
            label={t('dueDate')}
            rules={[{ required: true, message: tCommon('selectDate') }]}
          >
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

        {/* Installment-specific fields */}
        {debtType === 'installment' && (
          <>
            <Form.Item
              name="installments"
              label={t('installments')}
              rules={[{ required: true, message: tCommon('required') }]}
            >
              <Select
                options={[
                  { value: 2, label: '2' },
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 5, label: '5' },
                  { value: 6, label: '6' },
                  { value: 8, label: '8' },
                  { value: 10, label: '10' },
                  { value: 12, label: '12' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="frequency"
              label={t('frequency')}
              rules={[{ required: true }]}
            >
              <Select options={INSTALLMENT_FREQUENCIES} />
            </Form.Item>

            <Form.Item
              name="first_due_date"
              label={t('firstDueDate')}
              rules={[{ required: true, message: tCommon('selectDate') }]}
            >
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="notes"
          label={tCommon('notes')}
        >
          <Input.TextArea
            rows={2}
            placeholder={tCommon('notesPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
