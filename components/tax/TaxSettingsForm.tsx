'use client'

import { Card, Form, Select, InputNumber, Switch, Button, message, Spin, Alert } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type TaxSettings } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Ban le / Phan phoi' },
  { value: 'food_service', label: 'Dich vu an uong' },
  { value: 'other_service', label: 'Dich vu khac' },
]

const VAT_RATES = [
  { value: 8, label: '8% (Giam thue)' },
  { value: 10, label: '10% (Thue suat chuan)' },
]

const PIT_RATES = [
  { value: 1, label: '1% (Ban le)' },
  { value: 1.5, label: '1.5% (An uong)' },
  { value: 2, label: '2% (Dich vu khac)' },
]

export function TaxSettingsForm() {
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
      message.success('Cap nhat cau hinh thue thanh cong')
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
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
      case 'under_200m': return 'Duoi 200 trieu/nam (Mien thue)'
      case '200m_1b': return '200 trieu - 1 ty/nam'
      case '1b_3b': return '1 ty - 3 ty/nam'
      case 'over_3b': return 'Tren 3 ty/nam'
      default: return code
    }
  }

  return (
    <div className="space-y-4">
      {tier && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <SettingOutlined className="text-blue-600" />
            <span className="font-medium">Phan loai doanh thu tu dong</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Doanh thu 12 thang qua: <strong>{formatCurrency(tier.annual_revenue)}</strong>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Phan loai: <strong>{getTierLabel(tier.code)}</strong>
          </div>
          {tier.e_invoice_required && (
            <Alert
              type="warning"
              message="Bat buoc su dung hoa don dien tu"
              className="mt-2"
              showIcon
            />
          )}
        </Card>
      )}

      <Card title="Cau hinh thue">
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
        >
          <Form.Item
            name="business_type"
            label="Loai hinh kinh doanh"
            rules={[{ required: true }]}
          >
            <Select options={BUSINESS_TYPES} />
          </Form.Item>

          <Form.Item
            name="default_vat_rate"
            label="Thue suat VAT mac dinh"
            rules={[{ required: true }]}
          >
            <Select options={VAT_RATES} />
          </Form.Item>

          <Form.Item
            name="pit_rate"
            label="Thue TNCN ho kinh doanh"
            rules={[{ required: true }]}
          >
            <Select options={PIT_RATES} />
          </Form.Item>

          <Form.Item
            name="e_invoice_required"
            label="Su dung hoa don dien tu"
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
          Luu cau hinh
        </Button>
      </Card>
    </div>
  )
}
