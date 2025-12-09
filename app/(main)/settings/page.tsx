'use client'

import { Button, Card, Typography, App, Tabs } from 'antd'
import { LogoutOutlined, ShopOutlined, UserOutlined, DollarOutlined, GlobalOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TaxSettingsForm, QuarterlyTaxSummary, TaxDeadlineWidget } from '@/components/tax'
import { StoreInfoForm, LanguageSwitcher } from '@/components/settings'
import { useTranslations } from 'next-intl'

const { Title, Text } = Typography

export default function SettingsPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const t = useTranslations('settings')
  const tAuth = useTranslations('auth')

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    message.success(tAuth('logout'))
    router.push('/login')
  }

  const tabItems = [
    {
      key: 'store',
      label: (
        <span className="flex items-center gap-1">
          <ShopOutlined />
          {t('storeInfo')}
        </span>
      ),
      children: <StoreInfoForm />,
    },
    {
      key: 'tax',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          Tax
        </span>
      ),
      children: (
        <div className="space-y-4">
          <TaxDeadlineWidget />
          <TaxSettingsForm />
          <QuarterlyTaxSummary />
        </div>
      ),
    },

    {
      key: 'account',
      label: (
        <span className="flex items-center gap-1">
          <UserOutlined />
          {t('account')}
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <GlobalOutlined className="text-xl" />
              <Title level={5} className="!mb-0">{t('language')}</Title>
            </div>
            <div className="flex items-center justify-between">
              <Text>{t('selectLanguage')}</Text>
              <LanguageSwitcher />
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <UserOutlined className="text-xl" />
              <Title level={5} className="!mb-0">{t('account')}</Title>
            </div>
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              block
            >
              {tAuth('logout')}
            </Button>
          </Card>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4}>{t('title')}</Title>
      <Tabs items={tabItems} />
    </div>
  )
}
