'use client'

import { Card, Form, Select, InputNumber, Switch, Button, message, Spin, Alert } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type TaxSettings } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

export function TaxSettingsForm() {
  const t = useTranslations('tax')
  const tCommon = useTranslations('common')

  const BUSINESS_TYPES = [
    { value: 'retail', label: t('businessTypes.retail') },
    { value: 'food_service', label: t('businessTypes.food_service') },
    { value: 'other_service', label: t('businessTypes.other_service') },
  ]

  const VAT_RATES = [
    { value: 8, label: t('vatRates.reduced') },
    { value: 10, label: t('vatRates.standard') },
  ]

  const PIT_RATES = [
    { value: 1, label: t('pitRates.retail') },
    { value: 1.5, label: t('pitRates.food') },
    { value: 2, label: t('pitRates.service') },
  ]

  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => api.tax.getSettings(),
  })

  const { data: tierData, isLoading: tierLoading } = useQuery({
    queryKey: ['revenue-tier'],
    queryFn: () => api.tax.detectRevenueTier(),
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<TaxSettings>) => api.tax.updateSettings(data),
    onSuccess: () => {
      message.success(t('updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : t('updateError'))
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      mutation.mutate(values)
    } catch {
      // Validation error
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  const settings = settingsData?.settings
  const tier = tierData?.tier

  const getTierLabel = (code: string) => {
    switch (code) {
      case 'under_200m': return t('revenueTiers.under_200m')
      case '200m_1b': return t('revenueTiers.200m_1b')
      case '1b_3b': return t('revenueTiers.1b_3b')
      case 'over_3b': return t('revenueTiers.over_3b')
      default: return code
    }
  }

  return (
    <div className="space-y-4">
      {tier && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <SettingOutlined className="text-blue-600" />
            <span className="font-medium">{t('revenueClassification')}</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {t('annualRevenue')}: <strong>{formatCurrency(tier.annual_revenue)}</strong>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {t('classification')}: <strong>{getTierLabel(tier.code)}</strong>
          </div>
          {tier.e_invoice_required && (
            <Alert
              type="warning"
              message={t('eInvoiceRequired')}
              className="mt-2"
              showIcon
            />
          )}
        </Card>
      )}

      <Card title={t('taxSettings')}>
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
        >
          <Form.Item
            name="business_type"
            label={t('businessType')}
            rules={[{ required: true }]}
          >
            <Select options={BUSINESS_TYPES} />
          </Form.Item>

          <Form.Item
            name="default_vat_rate"
            label={t('defaultVatRate')}
            rules={[{ required: true }]}
          >
            <Select options={VAT_RATES} />
          </Form.Item>

          <Form.Item
            name="pit_rate"
            label={t('pitRate')}
            rules={[{ required: true }]}
          >
            <Select options={PIT_RATES} />
          </Form.Item>

          <Form.Item
            name="e_invoice_required"
            label={t('useEInvoice')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={mutation.isPending}
          block
        >
          {t('saveSettings')}
        </Button>
      </Card>
    </div>
  )
}
