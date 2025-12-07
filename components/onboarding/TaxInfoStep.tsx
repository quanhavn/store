'use client'

import { Form, Input, Button, Typography, Select, Switch, Space, Alert } from 'antd'
import { FileTextOutlined, BankOutlined } from '@ant-design/icons'
import type { OnboardingData } from '@/app/(onboarding)/setup/page'

const { Title, Text } = Typography

interface TaxInfoStepProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onPrev: () => void
}

const revenueTierOptions = [
  { value: 'under_200m', label: 'Dưới 200 triệu/năm' },
  { value: '200m_1b', label: '200 triệu - 1 tỷ/năm' },
  { value: '1b_3b', label: '1 - 3 tỷ/năm' },
  { value: 'over_3b', label: 'Trên 3 tỷ/năm' },
]

export function TaxInfoStep({ data, updateData, onNext, onPrev }: TaxInfoStepProps) {
  const [form] = Form.useForm()

  const handleFinish = (values: Partial<OnboardingData>) => {
    updateData(values)
    onNext()
  }

  const revenueTier = Form.useWatch('revenueTier', form)
  const showEInvoiceWarning = revenueTier === '1b_3b' || revenueTier === 'over_3b'

  return (
    <div>
      <Title level={5} className="!mb-1">Thông tin thuế</Title>
      <Text type="secondary" className="block mb-4">
        Thông tin này giúp tuân thủ quy định thuế Việt Nam 2026
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
          label="Mã số thuế (MST)"
          extra="Cá nhân: 10 số, Doanh nghiệp: 13 số (không bắt buộc)"
          rules={[
            {
              pattern: /^[0-9]{10}$|^[0-9]{13}$/,
              message: 'MST phải có 10 số (cá nhân) hoặc 13 số (doanh nghiệp)',
            },
          ]}
        >
          <Input
            prefix={<FileTextOutlined className="text-gray-400" />}
            placeholder="0123456789"
            size="large"
            maxLength={13}
          />
        </Form.Item>

        <Form.Item
          name="revenueTier"
          label="Mức doanh thu dự kiến"
          rules={[{ required: true, message: 'Vui lòng chọn mức doanh thu' }]}
        >
          <Select
            options={revenueTierOptions}
            size="large"
            placeholder="Chọn mức doanh thu"
          />
        </Form.Item>

        {showEInvoiceWarning && (
          <Alert
            type="info"
            showIcon
            message="Yêu cầu hóa đơn điện tử"
            description="Theo quy định, doanh thu trên 1 tỷ/năm cần sử dụng hóa đơn điện tử."
            className="mb-4"
          />
        )}

        <Form.Item
          name="eInvoiceRequired"
          label="Sử dụng hóa đơn điện tử"
          valuePropName="checked"
        >
          <Switch checkedChildren="Có" unCheckedChildren="Không" />
        </Form.Item>

        <Form.Item className="!mb-0">
          <Space className="w-full" direction="vertical">
            <Button type="primary" htmlType="submit" block size="large">
              Tiếp tục
            </Button>
            <Button onClick={onPrev} block size="large">
              Quay lại
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
