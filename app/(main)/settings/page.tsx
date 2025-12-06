'use client'

import { Button, Card, Typography, App } from 'antd'
import { LogoutOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

export default function SettingsPage() {
  const router = useRouter()
  const { message } = App.useApp()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    message.success('Đã đăng xuất')
    router.push('/login')
  }

  return (
    <div className="p-4 space-y-4">
      <Title level={4}>Cài đặt</Title>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <ShopOutlined className="text-xl" />
          <Title level={5} className="!mb-0">Thông tin cửa hàng</Title>
        </div>
        <Text type="secondary">Chưa thiết lập thông tin cửa hàng</Text>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <UserOutlined className="text-xl" />
          <Title level={5} className="!mb-0">Tài khoản</Title>
        </div>
        <Button 
          danger 
          icon={<LogoutOutlined />} 
          onClick={handleSignOut}
          block
        >
          Đăng xuất
        </Button>
      </Card>
    </div>
  )
}
