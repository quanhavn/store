'use client'

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
  const [form] = Form.useForm()

  const handleFinish = (values: Partial<OnboardingData>) => {
    updateData(values)
    onNext()
  }

  return (
    <div>
      <Title level={5} className="!mb-1">Thông tin cửa hàng</Title>
      <Text type="secondary" className="block mb-4">
        Nhập thông tin cơ bản về cửa hàng của bạn
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
          label="Tên cửa hàng"
          rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng' }]}
        >
          <Input
            prefix={<ShopOutlined className="text-gray-400" />}
            placeholder="VD: Tạp hóa Minh Tâm"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            {
              pattern: /^(03|05|07|08|09)[0-9]{8}$/,
              message: 'Số điện thoại phải có 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09',
            },
          ]}
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder="0912345678"
            size="large"
            maxLength={10}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email (không bắt buộc)"
          rules={[
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="cuahang@email.com"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="address"
          label="Địa chỉ (không bắt buộc)"
        >
          <Input.TextArea
            placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
            rows={2}
          />
        </Form.Item>

        <Form.Item className="!mb-0">
          <Button type="primary" htmlType="submit" block size="large">
            Tiếp tục
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
