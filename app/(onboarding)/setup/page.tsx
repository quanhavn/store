'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Steps, Button, Card, Typography, App, Result, Spin } from 'antd'
import { ShopOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { StoreInfoStep } from '@/components/onboarding/StoreInfoStep'
import { TaxInfoStep } from '@/components/onboarding/TaxInfoStep'
import { OnboardingSummary } from '@/components/onboarding/OnboardingSummary'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

const { Title, Text } = Typography

const ONBOARDING_DRAFT_KEY = 'onboarding_draft'

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

export default function SetupPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const [current, setCurrent] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const steps = [
    { title: t('steps.store'), icon: <ShopOutlined /> },
    { title: t('steps.tax'), icon: <FileTextOutlined /> },
    { title: t('steps.complete'), icon: <CheckCircleOutlined /> },
  ]

  // Save draft to localStorage
  const saveDraft = useCallback((newData: OnboardingData, step: number) => {
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ data: newData, step }))
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }, [])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [])

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // Try to load draft from localStorage first
        const savedDraft = localStorage.getItem(ONBOARDING_DRAFT_KEY)
        if (savedDraft) {
          const { data: draftData, step } = JSON.parse(savedDraft)
          setData(draftData)
          setCurrent(step)
        } else if (user?.user_metadata) {
          // Fallback to user metadata
          const { phone } = user.user_metadata
          setData((prev) => ({
            ...prev,
            phone: phone || '',
          }))
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates }
      saveDraft(newData, current)
      return newData
    })
  }

  const next = () => {
    setCurrent((prev) => {
      const nextStep = prev + 1
      saveDraft(data, nextStep)
      return nextStep
    })
  }

  const prev = () => {
    setCurrent((prev) => {
      const prevStep = prev - 1
      saveDraft(data, prevStep)
      return prevStep
    })
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
        throw new Error(response.error.message || t('setupError'))
      }

      clearDraft()
      setIsComplete(true)
      message.success(t('setupSuccess'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tCommon('errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToDashboard = () => {
    router.push('/')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Spin size="large" />
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Result
          status="success"
          title={t('setupComplete')}
          subTitle={t('setupCompleteSubtitle')}
          extra={[
            <Button type="primary" size="large" key="dashboard" onClick={goToDashboard}>
              {t('goToDashboard')}
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
          <Title level={4} className="!mb-1">{t('title')}</Title>
          <Text type="secondary">{t('subtitle')}</Text>
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
            <TaxInfoStep data={data} updateData={updateData} onNext={next} onPrev={prev} onSkip={next} />
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
          {t('stepProgress', { current: current + 1, total: steps.length })}
        </Text>
      </div>
    </div>
  )
}
