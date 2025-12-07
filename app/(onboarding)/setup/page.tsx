'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Steps, Button, Card, Typography, App, Result } from 'antd'
import { ShopOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { StoreInfoStep } from '@/components/onboarding/StoreInfoStep'
import { TaxInfoStep } from '@/components/onboarding/TaxInfoStep'
import { OnboardingSummary } from '@/components/onboarding/OnboardingSummary'
import { createClient } from '@/lib/supabase/client'

const { Title, Text } = Typography

export interface OnboardingData {
  storeName: string
  address: string
  phone: string
  email: string
  taxCode: string
  revenueTier: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
  eInvoiceRequired: boolean
}

const initialData: OnboardingData = {
  storeName: '',
  address: '',
  phone: '',
  email: '',
  taxCode: '',
  revenueTier: 'under_200m',
  eInvoiceRequired: false,
}

const steps = [
  { title: 'Cửa hàng', icon: <ShopOutlined /> },
  { title: 'Thuế', icon: <FileTextOutlined /> },
  { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
]

export default function SetupPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [current, setCurrent] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const next = () => {
    setCurrent((prev) => prev + 1)
  }

  const prev = () => {
    setCurrent((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      
      const response = await supabase.functions.invoke('onboarding', {
        body: {
          store_name: data.storeName,
          address: data.address,
          phone: data.phone,
          email: data.email,
          tax_code: data.taxCode,
          revenue_tier: data.revenueTier,
          e_invoice_required: data.eInvoiceRequired,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Không thể hoàn tất thiết lập')
      }

      setIsComplete(true)
      message.success('Thiết lập cửa hàng thành công!')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToDashboard = () => {
    router.push('/')
    router.refresh()
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Result
          status="success"
          title="Thiết lập hoàn tất!"
          subTitle="Cửa hàng của bạn đã sẵn sàng để sử dụng."
          extra={[
            <Button type="primary" size="large" key="dashboard" onClick={goToDashboard}>
              Vào trang quản lý
            </Button>,
          ]}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6 pt-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
            <ShopOutlined className="text-2xl text-white" />
          </div>
          <Title level={4} className="!mb-1">Thiết lập cửa hàng</Title>
          <Text type="secondary">Hoàn tất thông tin để bắt đầu sử dụng</Text>
        </div>

        <Steps
          current={current}
          items={steps}
          size="small"
          className="mb-6"
        />

        <Card className="mb-4">
          {current === 0 && (
            <StoreInfoStep data={data} updateData={updateData} onNext={next} />
          )}
          {current === 1 && (
            <TaxInfoStep data={data} updateData={updateData} onNext={next} onPrev={prev} />
          )}
          {current === 2 && (
            <OnboardingSummary
              data={data}
              onPrev={prev}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </Card>

        <Text type="secondary" className="block text-center text-xs">
          Bước {current + 1} / {steps.length}
        </Text>
      </div>
    </div>
  )
}
