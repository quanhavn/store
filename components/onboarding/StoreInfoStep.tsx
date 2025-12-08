'use client'

import { useTranslations } from 'next-intl'
import { Form, Input, Button, Typography } from 'antd'
import { ShopOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons'
import type { OnboardingData } from '@/app/(onboarding)/setup/page'

const { Title, Text } = Typography

interface StoreInfoStepProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
}

export function StoreInfoStep({ data, updateData, onNext }: StoreInfoStepProps) {
  const tSettings = useTranslations('settings')
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm()

  const handleFinish = (values: Partial<OnboardingData>) => {
    updateData(values)
    onNext()
  }

  return (
    <div>
      <Title level={5} className="!mb-1">{tSettings('storeInfo')}</Title>
      <Text type="secondary" className="block mb-4">
        {tSettings('storeInfoDescription')}
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={data}
        requiredMark={false}
      >
        <Form.Item
          name="storeName"
          label={tAuth('storeName')}
          rules={[{ required: true, message: tAuth('validation.storeNameRequired') }]}
        >
          <Input
            prefix={<ShopOutlined className="text-gray-400" />}
            placeholder={tAuth('storeNamePlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label={tAuth('phone')}
          rules={[
            { required: true, message: tAuth('validation.phoneRequired') },
            {
              pattern: /^(03|05|07|08|09)[0-9]{8}$/,
              message: tAuth('validation.phoneInvalid'),
            },
          ]}
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder={tAuth('phonePlaceholder')}
            size="large"
            maxLength={10}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={tAuth('emailOptional')}
          rules={[
            { type: 'email', message: tAuth('validation.emailInvalid') },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder={tAuth('emailPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="address"
          label={tAuth('addressOptional')}
        >
          <Input.TextArea
            placeholder={tAuth('addressPlaceholder')}
            rows={2}
          />
        </Form.Item>

        <Form.Item className="!mb-0">
          <Button type="primary" htmlType="submit" block size="large">
            {tCommon('continue')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
