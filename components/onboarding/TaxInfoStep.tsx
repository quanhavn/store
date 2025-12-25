'use client'

import { useTranslations } from 'next-intl'
import { Form, Input, Button, Typography, Select, Switch, Alert } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import type { OnboardingData } from '@/app/(onboarding)/setup/page'

const { Title, Text } = Typography

interface TaxInfoStepProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onPrev: () => void
  onSkip?: () => void
}

export function TaxInfoStep({ data, updateData, onNext, onPrev, onSkip }: TaxInfoStepProps) {
  const tTax = useTranslations('tax')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm()

  const revenueTierOptions = [
    { value: 'under_200m', label: tTax('revenueTiers.under_200m') },
    { value: '200m_1b', label: tTax('revenueTiers.200m_1b') },
    { value: '1b_3b', label: tTax('revenueTiers.1b_3b') },
    { value: 'over_3b', label: tTax('revenueTiers.over_3b') },
  ]

  const handleFinish = (values: Partial<OnboardingData>) => {
    updateData(values)
    onNext()
  }

  const revenueTier = Form.useWatch('revenueTier', form)
  const showEInvoiceWarning = revenueTier === '1b_3b' || revenueTier === 'over_3b'

  return (
    <div>
      <Title level={5} className="!mb-1">{tTax('taxInfo')}</Title>
      <Text type="secondary" className="block mb-4">
        {tTax('taxInfoDescription')}
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={data}
        requiredMark={false}
      >
        <Form.Item
          name="taxCode"
          label={tTax('taxCodeLabel')}
          extra={tTax('taxCodeExtra')}
          rules={[
            {
              pattern: /^[0-9]{10}$|^[0-9]{12}$|^[0-9]{10}-[0-9]{3}$/,
              message: tTax('validation.taxCodeInvalid'),
            },
          ]}
        >
          <Input
            prefix={<FileTextOutlined className="text-gray-400" />}
            placeholder={tTax('taxCodePlaceholder')}
            size="large"
            maxLength={14}
          />
        </Form.Item>

        <Form.Item
          name="revenueTier"
          label={tTax('revenueTierLabel')}
          rules={[{ required: true, message: tTax('validation.revenueTierRequired') }]}
        >
          <Select
            options={revenueTierOptions}
            size="large"
            placeholder={tTax('selectRevenueTier')}
          />
        </Form.Item>

        {showEInvoiceWarning && (
          <Alert
            type="info"
            showIcon
            message={tTax('eInvoiceRequiredAlert')}
            description={tTax('eInvoiceRequiredAlertDescription')}
            className="mb-4"
          />
        )}

        <Form.Item
          name="eInvoiceRequired"
          label={tTax('useEInvoiceLabel')}
          valuePropName="checked"
        >
          <Switch checkedChildren={tCommon('yes')} unCheckedChildren={tCommon('no')} />
        </Form.Item>

        <Form.Item className="!mb-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={onPrev} size="large" className="flex-1">
                {tCommon('back')}
              </Button>
              <Button type="primary" htmlType="submit" size="large" className="flex-[2]">
                {tCommon('continue')}
              </Button>
            </div>
            {onSkip && (
              <Button type="link" onClick={onSkip} block>
                {tTax('skipForNow')}
              </Button>
            )}
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}
