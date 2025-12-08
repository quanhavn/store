'use client'

import { useTranslations } from 'next-intl'
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

export function OnboardingSummary({ data, onPrev, onSubmit, isSubmitting }: OnboardingSummaryProps) {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')

  const revenueTierLabels: Record<string, string> = {
    under_200m: t('revenueTiers.under200m'),
    '200m_1b': t('revenueTiers.200m1b'),
    '1b_3b': t('revenueTiers.1b3b'),
    over_3b: t('revenueTiers.over3b'),
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircleOutlined className="text-green-500 text-xl" />
        <div>
          <Title level={5} className="!mb-0">{t('summary.title')}</Title>
          <Text type="secondary">{t('summary.subtitle')}</Text>
        </div>
      </div>

      <Descriptions
        column={1}
        size="small"
        labelStyle={{ fontWeight: 500, width: 120 }}
        className="mb-6"
      >
        <Descriptions.Item label={tAuth('storeName')}>
          {data.storeName || <Text type="secondary">{t('notEntered')}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label={tCommon('phone')}>
          {data.phone || <Text type="secondary">{t('notEntered')}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label={t('email')}>
          {data.email || <Text type="secondary">{t('notAvailable')}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label={tCommon('address')}>
          {data.address || <Text type="secondary">{t('notAvailable')}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label={t('taxCode')}>
          {data.taxCode || <Text type="secondary">{t('notAvailable')}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label={t('revenue')}>
          {revenueTierLabels[data.revenueTier]}
        </Descriptions.Item>
        <Descriptions.Item label={t('eInvoiceShort')}>
          {data.eInvoiceRequired ? (
            <Tag color="blue">{t('using')}</Tag>
          ) : (
            <Tag>{t('notUsing')}</Tag>
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
          {t('completeSetup')}
        </Button>
        <Button onClick={onPrev} block size="large" icon={<EditOutlined />}>
          {tCommon('edit')}
        </Button>
      </Space>
    </div>
  )
}
