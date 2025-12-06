'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Card, Typography, App, Divider } from 'antd'
import { ShopOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

const { Title, Text, Link } = Typography

type StoreInsert = Database['public']['Tables']['stores']['Insert']
type UserInsert = Database['public']['Tables']['users']['Insert']

// Convert phone number to email format for Supabase auth
const phoneToEmail = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '')
  return `${cleanPhone}@phone.local`
}

interface LoginFormData {
  phone: string
  password: string
}

interface RegisterFormData {
  storeName: string
  phone: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [form] = Form.useForm()

  const handleLogin = async (values: LoginFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(values.phone),
        password: values.password,
      })

      if (error) throw error

      message.success('Đăng nhập thành công')
      router.push('/')
      router.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Số điện thoại hoặc mật khẩu không đúng')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: phoneToEmail(values.phone),
        password: values.password,
        options: {
          data: {
            store_name: values.storeName,
            phone: values.phone,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Create store for the new user
        // Note: Type assertions needed due to Supabase RLS type generation limitations
        const storePayload: StoreInsert = {
          name: values.storeName,
          phone: values.phone,
        }

        const { data: store, error: storeError } = await supabase
          .from('stores')
          .insert(storePayload as never)
          .select('id')
          .single()

        if (storeError || !store) throw storeError ?? new Error('Failed to create store')

        // Create user profile linked to the store
        const userPayload: UserInsert = {
          id: authData.user.id,
          store_id: (store as { id: string }).id,
          name: values.storeName,
          phone: values.phone,
          role: 'owner',
        }

        const { error: userError } = await supabase
          .from('users')
          .insert(userPayload as never)

        if (userError) throw userError
      }

      message.success('Đăng ký thành công')
      router.push('/')
      router.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể đăng ký tài khoản')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setIsRegister(!isRegister)
    form.resetFields()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-blue-500 flex items-center justify-center mb-4">
            <ShopOutlined className="text-3xl text-white" />
          </div>
          <Title level={3} className="!mb-1 text-center">Quản Lý Cửa Hàng</Title>
          <Text type="secondary">
            {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}
          </Text>
        </div>

        <Card>
          <Title level={4} className="!mb-1">
            {isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </Title>
          <Text type="secondary" className="block mb-6">
            {isRegister ? 'Nhập thông tin để tạo tài khoản' : 'Nhập số điện thoại và mật khẩu'}
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={isRegister ? handleRegister : handleLogin}
            requiredMark={false}
          >
            {isRegister && (
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
            )}

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại phải có 10-11 chữ số' },
              ]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder="0912345678"
                size="large"
                maxLength={11}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item className="!mb-4">
              <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
                {isRegister ? 'Đăng ký' : 'Đăng nhập'}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary" className="text-xs">hoặc</Text>
          </Divider>

          <div className="text-center">
            <Link onClick={switchMode}>
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </Link>
          </div>
        </Card>

        <Text type="secondary" className="block text-center text-xs mt-6">
          Bằng việc đăng ký, bạn đồng ý với{' '}
          <Link href="#">Điều khoản dịch vụ</Link>
        </Text>
      </div>
    </div>
  )
}
