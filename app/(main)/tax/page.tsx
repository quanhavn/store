'use client'

import { useState } from 'react'
import { Typography, Tabs, Spin, Alert } from 'antd'
import {
  SettingOutlined,
  CalculatorOutlined,
  BellOutlined
} from '@ant-design/icons'
import {
  TaxSettingsForm,
  QuarterlyTaxSummary,
  TaxDeadlineWidget
} from '@/components/tax'

const { Title } = Typography

type TaxTab = 'settings' | 'obligations' | 'reminders'

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<TaxTab>('settings')

  const tabItems = [
    {
      key: 'settings',
      label: (
        <span className="flex items-center gap-1">
          <SettingOutlined />
          Cai dat thue
        </span>
      ),
      children: <TaxSettingsForm />,
    },
    {
      key: 'obligations',
      label: (
        <span className="flex items-center gap-1">
          <CalculatorOutlined />
          Nghia vu thue
        </span>
      ),
      children: <QuarterlyTaxSummary />,
    },
    {
      key: 'reminders',
      label: (
        <span className="flex items-center gap-1">
          <BellOutlined />
          Nhac nho
        </span>
      ),
      children: (
        <div className="space-y-4">
          <TaxDeadlineWidget />
          <Alert
            type="info"
            message="Nhac nho tu dong"
            description="He thong se gui thong bao truoc han nop thue 7 ngay va 1 ngay."
            showIcon
          />
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4} className="!mb-4">Quan ly thue</Title>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TaxTab)}
        items={tabItems}
        className="tax-tabs"
      />
    </div>
  )
}
