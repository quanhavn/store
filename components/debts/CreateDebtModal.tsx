'use client'

import { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, message, Typography, Divider, Alert } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Customer } from '@/lib/supabase/functions'
import dayjs from 'dayjs'

const { Text } = Typography

interface CreateDebtModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const DEBT_TYPES = [
  { value: 'credit', label: 'Ghi no (tra 1 lan)' },
  { value: 'installment', label: 'Tra gop (chia ky)' },
]

const INSTALLMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Hang tuan' },
  { value: 'biweekly', label: 'Hai tuan mot' },
  { value: 'monthly', label: 'Hang thang' },
]

export function CreateDebtModal({ open, onClose, onSuccess }: CreateDebtModalProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const debtType = Form.useWatch('debt_type', form)
  const [customerSearch, setCustomerSearch] = useState('')
  const selectedCustomerId = Form.useWatch('customer_id', form)

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
      message.success('Tao cong no thanh cong')
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-summary'] })
      form.resetFields()
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
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
      message.success('Tao cong no tra gop thanh cong')
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt-summary'] })
      form.resetFields()
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
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
        message.error('Vui long chon khach hang')
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
      title="Tao cong no moi"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Huy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleSubmit}
          loading={isPending}
        >
          Tao cong no
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
          label="Khach hang"
          rules={[{ required: true, message: 'Vui long chon khach hang' }]}
        >
          <Select
            placeholder="Chon khach hang"
            showSearch
            loading={loadingCustomers}
            onSearch={setCustomerSearch}
            filterOption={false}
            options={customers.map(c => ({
              value: c.id,
              label: `${c.name} - ${c.phone || 'Chua co SDT'}`,
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
                {selectedCustomer.phone && <div>SDT: {selectedCustomer.phone}</div>}
              </div>
            }
          />
        )}

        <Divider className="!my-3" />

        <Form.Item
          name="debt_type"
          label="Loai cong no"
          rules={[{ required: true }]}
        >
          <Select options={DEBT_TYPES} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="So tien"
          rules={[
            { required: true, message: 'Nhap so tien' },
            { type: 'number', min: 1000, message: 'So tien toi thieu 1,000d' },
          ]}
        >
          <InputNumber<number>
            className="w-full"
            min={1000}
            step={10000}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
            placeholder="0"
            addonAfter="VND"
          />
        </Form.Item>

        {/* Credit-specific fields */}
        {debtType === 'credit' && (
          <Form.Item
            name="due_date"
            label="Han tra no"
            rules={[{ required: true, message: 'Chon ngay han tra' }]}
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
              label="So ky tra gop"
              rules={[{ required: true, message: 'Nhap so ky' }]}
            >
              <Select
                options={[
                  { value: 2, label: '2 ky' },
                  { value: 3, label: '3 ky' },
                  { value: 4, label: '4 ky' },
                  { value: 5, label: '5 ky' },
                  { value: 6, label: '6 ky' },
                  { value: 8, label: '8 ky' },
                  { value: 10, label: '10 ky' },
                  { value: 12, label: '12 ky' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="frequency"
              label="Tan suat tra"
              rules={[{ required: true }]}
            >
              <Select options={INSTALLMENT_FREQUENCIES} />
            </Form.Item>

            <Form.Item
              name="first_due_date"
              label="Ngay tra ky dau"
              rules={[{ required: true, message: 'Chon ngay tra ky dau' }]}
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
          label="Ghi chu"
        >
          <Input.TextArea
            rows={2}
            placeholder="Ghi chu them ve cong no nay"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
