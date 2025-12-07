'use client'

import { Button, Typography, Descriptions, Space, Tag } from 'antd'
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons'
import type { OnboardingData } from '@/app/(onboarding)/setup/page'

const { Title, Text } = Typography

interface OnboardingSummaryProps {
  data: OnboardingData
  onPrev: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

const revenueTierLabels: Record<string, string> = {
  under_200m: 'Dưới 200 triệu/năm',
  '200m_1b': '200 triệu - 1 tỷ/năm',
  '1b_3b': '1 - 3 tỷ/năm',
  over_3b: 'Trên 3 tỷ/năm',
}

export function OnboardingSummary({ data, onPrev, onSubmit, isSubmitting }: OnboardingSummaryProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircleOutlined className="text-green-500 text-xl" />
        <div>
          <Title level={5} className="!mb-0">Xác nhận thông tin</Title>
          <Text type="secondary">Kiểm tra lại thông tin trước khi hoàn tất</Text>
        </div>
      </div>

      <Descriptions
        column={1}
        size="small"
        labelStyle={{ fontWeight: 500, width: 120 }}
        className="mb-6"
      >
        <Descriptions.Item label="Tên cửa hàng">
          {data.storeName || <Text type="secondary">Chưa nhập</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">
          {data.phone || <Text type="secondary">Chưa nhập</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {data.email || <Text type="secondary">Không có</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ">
          {data.address || <Text type="secondary">Không có</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Mã số thuế">
          {data.taxCode || <Text type="secondary">Không có</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Doanh thu">
          {revenueTierLabels[data.revenueTier]}
        </Descriptions.Item>
        <Descriptions.Item label="Hóa đơn ĐT">
          {data.eInvoiceRequired ? (
            <Tag color="blue">Có sử dụng</Tag>
          ) : (
            <Tag>Không sử dụng</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Space className="w-full" direction="vertical">
        <Button
          type="primary"
          onClick={onSubmit}
          loading={isSubmitting}
          block
          size="large"
          icon={<CheckCircleOutlined />}
        >
          Hoàn tất thiết lập
        </Button>
        <Button onClick={onPrev} block size="large" icon={<EditOutlined />}>
          Chỉnh sửa
        </Button>
      </Space>
    </div>
  )
}
