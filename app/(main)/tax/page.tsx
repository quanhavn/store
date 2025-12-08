'use client'

import { useState } from 'react'
import { Typography, Tabs, Spin, Alert } from 'antd'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('tax')

  const tabItems = [
    {
      key: 'settings',
      label: (
        <span className="flex items-center gap-1">
          <SettingOutlined />
          {t('tabs.settings')}
        </span>
      ),
      children: <TaxSettingsForm />,
    },
    {
      key: 'obligations',
      label: (
        <span className="flex items-center gap-1">
          <CalculatorOutlined />
          {t('tabs.obligations')}
        </span>
      ),
      children: <QuarterlyTaxSummary />,
    },
    {
      key: 'reminders',
      label: (
        <span className="flex items-center gap-1">
          <BellOutlined />
          {t('tabs.reminders')}
        </span>
      ),
      children: (
        <div className="space-y-4">
          <TaxDeadlineWidget />
          <Alert
            type="info"
            message={t('autoReminder')}
            description={t('autoReminderMessage')}
            showIcon
          />
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4} className="!mb-4">{t('title')}</Title>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TaxTab)}
        items={tabItems}
        className="tax-tabs"
      />
    </div>
  )
}
