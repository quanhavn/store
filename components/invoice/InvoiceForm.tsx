'use client'

import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, BankOutlined, HomeOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
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

export function InvoiceForm({ initialValues, onSubmit, loading, submitText }: InvoiceFormProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm<InvoiceFormData>()

  const validateMST = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length !== 10 && cleaned.length !== 13) {
      return Promise.reject(new Error(t('validation.taxCodeInvalid')))
    }
    return Promise.resolve()
  }

  const validatePhone = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    if (!validateVietnamesePhone(value)) {
      return Promise.reject(new Error(t('validation.phoneInvalid')))
    }
    return Promise.resolve()
  }

  const validateEmail = (_: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.resolve()
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return Promise.reject(new Error(t('validation.emailInvalid')))
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
        label={t('buyerName')}
        rules={[{ required: true, message: t('validation.buyerNameRequired') }]}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder={t('buyerNamePlaceholder')}
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="buyerTaxCode"
        label={t('taxCode')}
        rules={[{ validator: validateMST }]}
      >
        <Input
          prefix={<BankOutlined className="text-gray-400" />}
          placeholder={t('taxCodePlaceholder')}
          size="large"
          maxLength={14}
        />
      </Form.Item>

      <Form.Item
        name="buyerAddress"
        label={t('address')}
      >
        <Input.TextArea
          placeholder={t('addressPlaceholder')}
          rows={2}
        />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="buyerEmail"
          label={t('email')}
          rules={[{ validator: validateEmail }]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="email@example.com"
          />
        </Form.Item>

        <Form.Item
          name="buyerPhone"
          label={t('phone')}
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
        {submitText || t('createInvoice')}
      </Button>
    </Form>
  )
}
