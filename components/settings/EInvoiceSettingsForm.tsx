'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, App, Spin, Alert, Switch, Select, Divider } from 'antd'
import { SaveOutlined, CloseOutlined, EditOutlined, LockOutlined, LinkOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'

interface EInvoiceConfig {
  viettel_username?: string
  viettel_password?: string
  viettel_supplier_tax_code?: string
  viettel_template_code?: string
  viettel_invoice_series?: string
  e_invoice_required?: boolean
}

export function EInvoiceSettingsForm() {
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm<EInvoiceConfig>()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const t = useTranslations('settings')

  const { data: storeData, isLoading } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore(),
  })

  const store = storeData?.store
  const config = store?.e_invoice_config as EInvoiceConfig | undefined

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EInvoiceConfig>) =>
      api.store.updateEInvoiceConfig(data),
    onSuccess: () => {
      message.success(t('eInvoice.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['user-store'] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      message.error(error.message || t('updateError'))
    },
  })

  const handleEdit = () => {
    if (config) {
      form.setFieldsValue({
        e_invoice_required: config.e_invoice_required || false,
        viettel_username: config.viettel_username || '',
        viettel_password: config.viettel_password || '',
        viettel_supplier_tax_code: config.viettel_supplier_tax_code || '',
        viettel_template_code: config.viettel_template_code || '',
        viettel_invoice_series: config.viettel_invoice_series || '',
      })
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.resetFields()
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      updateMutation.mutate(values)
    } catch {
      // validation error
    }
  }

  const testConnection = async () => {
    try {
      const values = await form.validateFields()
      message.loading({ content: t('eInvoice.testing'), key: 'test' })
      
      await api.store.testViettelConnection(values as unknown as Record<string, unknown>)
      
      message.success({
        content: t('eInvoice.testSuccess'),
        key: 'test',
      })
    } catch (error) {
      message.error({
        content: error instanceof Error ? error.message : t('eInvoice.testFailed'),
        key: 'test',
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    )
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <LinkOutlined />
          {t('eInvoice.title')}
        </span>
      }
      extra={
        !isEditing && (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            {t('edit')}
          </Button>
        )
      }
    >
      {isEditing ? (
        <Form form={form} layout="vertical" size="middle">
          <Alert
            type="info"
            message={t('eInvoice.info')}
            showIcon
            className="mb-4"
          />

          <Form.Item
            name="e_invoice_required"
            label={t('eInvoice.enableEInvoice')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider />
          <h4 className="font-semibold mb-4">{t('eInvoice.viettelSettings')}</h4>

          <Form.Item
            name="viettel_username"
            label={t('eInvoice.username')}
            rules={[{ required: true, message: t('eInvoice.usernameRequired') }]}
          >
            <Input
              placeholder={t('eInvoice.usernamePlaceholder')}
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="viettel_password"
            label={t('eInvoice.password')}
            rules={[{ required: true, message: t('eInvoice.passwordRequired') }]}
          >
            <Input.Password
              placeholder={t('eInvoice.passwordPlaceholder')}
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="viettel_supplier_tax_code"
            label={t('eInvoice.taxCode')}
            rules={[
              { required: true, message: t('eInvoice.taxCodeRequired') },
              {
                pattern: /^[0-9]{10}$|^[0-9]{12}$|^[0-9]{10}-[0-9]{3}$/,
                message: t('eInvoice.taxCodeInvalid'),
              },
            ]}
          >
            <Input
              placeholder={t('eInvoice.taxCodePlaceholder')}
              maxLength={14}
            />
          </Form.Item>

          <Form.Item
            name="viettel_template_code"
            label={t('eInvoice.templateCode')}
            rules={[{ required: true, message: t('eInvoice.templateCodeRequired') }]}
          >
            <Input
              placeholder={t('eInvoice.templateCodePlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="viettel_invoice_series"
            label={t('eInvoice.invoiceSeries')}
            rules={[{ required: true, message: t('eInvoice.invoiceSeriesRequired') }]}
          >
            <Input
              placeholder={t('eInvoice.invoiceSeriesPlaceholder')}
            />
          </Form.Item>

          <div className="flex gap-2 mt-6">
            <Button
              type="default"
              onClick={testConnection}
              loading={updateMutation.isPending}
            >
              {t('eInvoice.testConnection')}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={updateMutation.isPending}
            >
              {t('save')}
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              {t('cancel')}
            </Button>
          </div>
        </Form>
      ) : (
        <div className="space-y-4">
          {!config || !config.viettel_username ? (
            <Alert
              type="warning"
              message={t('eInvoice.notConfigured')}
              description={t('eInvoice.configureNow')}
              showIcon
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">{t('eInvoice.provider')}:</span>
                  <p className="font-semibold">Viettel S-Invoice</p>
                </div>
                <div>
                  <span className="text-gray-600">{t('eInvoice.enableEInvoice')}:</span>
                  <p className="font-semibold">
                    {config.e_invoice_required ? '✓ Yes' : '✗ No'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">{t('eInvoice.username')}:</span>
                  <p className="font-semibold">{'*'.repeat(config.viettel_username?.length || 0)}</p>
                </div>
                <div>
                  <span className="text-gray-600">{t('eInvoice.taxCode')}:</span>
                  <p className="font-semibold">{config.viettel_supplier_tax_code}</p>
                </div>
              </div>
              <Alert
                type="success"
                message={t('eInvoice.configured')}
                showIcon
              />
            </>
          )}
        </div>
      )}
    </Card>
  )
}
