'use client'

import { Button, Card, Typography, App, Tabs } from 'antd'
import { LogoutOutlined, ShopOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TaxSettingsForm, QuarterlyTaxSummary, TaxDeadlineWidget } from '@/components/tax'

const { Title, Text } = Typography

export default function SettingsPage() {
  const router = useRouter()
  const { message } = App.useApp()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    message.success('Da dang xuat')
    router.push('/login')
  }

  const tabItems = [
    {
      key: 'store',
      label: (
        <span className="flex items-center gap-1">
          <ShopOutlined />
          Cua hang
        </span>
      ),
      children: (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <ShopOutlined className="text-xl" />
            <Title level={5} className="!mb-0">Thong tin cua hang</Title>
          </div>
          <Text type="secondary">Chua thiet lap thong tin cua hang</Text>
        </Card>
      ),
    },
    {
      key: 'tax',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          Thue
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
          Tai khoan
        </span>
      ),
      children: (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <UserOutlined className="text-xl" />
            <Title level={5} className="!mb-0">Tai khoan</Title>
          </div>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={handleSignOut}
            block
          >
            Dang xuat
          </Button>
        </Card>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4}>Cai dat</Title>
      <Tabs items={tabItems} />
    </div>
  )
}
