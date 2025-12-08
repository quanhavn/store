'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Card, Typography, App, Divider } from 'antd'
import { ShopOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

const { Title, Text, Link } = Typography

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
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const handleLogin = async (values: LoginFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(values.phone),
        password: values.password,
      })

      if (error) throw error

      message.success(t('loginSuccess'))
      router.push('/')
      router.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('loginError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Step 1: Create auth user
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
        // Step 2: Call the secure registration function to create store + user profile
        // This function runs with SECURITY DEFINER to bypass RLS during registration
        const { error: registerError } = await supabase
          .rpc('register_store_and_user', {
            p_store_name: values.storeName,
            p_phone: values.phone,
          } as never)

        if (registerError) throw registerError
      }

      message.success(t('registerSuccess'))
      router.push('/')
      router.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('registerError'))
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
          <Title level={3} className="!mb-1 text-center">{tCommon('appName')}</Title>
          <Text type="secondary">
            {isRegister ? t('createAccount') : t('loginToContinue')}
          </Text>
        </div>

        <Card>
          <Title level={4} className="!mb-1">
            {isRegister ? t('register') : t('login')}
          </Title>
          <Text type="secondary" className="block mb-6">
            {isRegister ? t('enterInfoToRegister') : t('enterPhoneAndPassword')}
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
                label={t('storeName')}
                rules={[{ required: true, message: t('validation.storeNameRequired') }]}
              >
                <Input
                  prefix={<ShopOutlined className="text-gray-400" />}
                  placeholder={t('storeNamePlaceholder')}
                  size="large"
                />
              </Form.Item>
            )}

            <Form.Item
              name="phone"
              label={t('phone')}
              rules={[
                { required: true, message: t('validation.phoneRequired') },
                { pattern: /^[0-9]{10,11}$/, message: t('validation.phoneInvalid') },
              ]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder={t('phonePlaceholder')}
                size="large"
                maxLength={11}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('password')}
              rules={[
                { required: true, message: t('validation.passwordRequired') },
                { min: 6, message: t('validation.passwordMinLength') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('passwordPlaceholder')}
                size="large"
              />
            </Form.Item>

            <Form.Item className="!mb-4">
              <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
                {isRegister ? t('register') : t('login')}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary" className="text-xs">{tCommon('or')}</Text>
          </Divider>

          <div className="text-center">
            <Link onClick={switchMode}>
              {isRegister ? t('haveAccount') : t('noAccount')}
            </Link>
          </div>
        </Card>

        <Text type="secondary" className="block text-center text-xs mt-6">
          {t('termsAgreement')}{' '}
          <Link href="/terms">{t('termsOfService')}</Link>
        </Text>
      </div>
    </div>
  )
}
