'use client'

import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, BankOutlined, HomeOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { validateTaxCode, validateVietnamesePhone } from '@/lib/utils'

export interface InvoiceFormData {
  buyerName: string
  buyerTaxCode?: string
  buyerAddress?: string
  buyerEmail?: string
  buyerPhone?: string
}

interface InvoiceFormProps {
  initialValues?: Partial<InvoiceFormData>
  onSubmit: (data: InvoiceFormData) => void | Promise<void>
  loading?: boolean
  submitText?: string
}

export function InvoiceForm({ initialValues, onSubmit, loading, submitText = 'Tạo hóa đơn' }: InvoiceFormProps) {
  const [form] = Form.useForm<InvoiceFormData>()

  const validateMST = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length !== 10 && cleaned.length !== 13) {
      return Promise.reject(new Error('MST phải có 10 hoặc 13 chữ số'))
    }
    return Promise.resolve()
  }

  const validatePhone = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    if (!validateVietnamesePhone(value)) {
      return Promise.reject(new Error('Số điện thoại không hợp lệ'))
    }
    return Promise.resolve()
  }

  const validateEmail = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return Promise.reject(new Error('Email không hợp lệ'))
    }
    return Promise.resolve()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
    } catch {
      // Validation error - handled by form
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      className="space-y-2"
    >
      <Form.Item
        name="buyerName"
        label="Tên người mua"
        rules={[{ required: true, message: 'Vui lòng nhập tên người mua' }]}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder="Họ và tên / Tên công ty"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="buyerTaxCode"
        label="Mã số thuế (MST)"
        rules={[{ validator: validateMST }]}
      >
        <Input
          prefix={<BankOutlined className="text-gray-400" />}
          placeholder="10 hoặc 13 chữ số"
          size="large"
          maxLength={14}
        />
      </Form.Item>

      <Form.Item
        name="buyerAddress"
        label="Địa chỉ"
      >
        <Input.TextArea
          placeholder="Địa chỉ người mua"
          rows={2}
        />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="buyerEmail"
          label="Email"
          rules={[{ validator: validateEmail }]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="email@example.com"
          />
        </Form.Item>

        <Form.Item
          name="buyerPhone"
          label="Số điện thoại"
          rules={[{ validator: validatePhone }]}
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder="0xxx xxx xxx"
          />
        </Form.Item>
      </div>

      <Button
        type="primary"
        size="large"
        block
        onClick={handleSubmit}
        loading={loading}
        className="mt-4 h-12"
      >
        {submitText}
      </Button>
    </Form>
  )
}
