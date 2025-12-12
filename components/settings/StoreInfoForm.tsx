'use client'

import { useState } from 'react'
import { Button, Card, Form, Input, Typography, Skeleton, Descriptions, App } from 'antd'
import { ShopOutlined, PhoneOutlined, EnvironmentOutlined, MailOutlined, IdcardOutlined, EditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import type { Database } from '@/types/database'

const { Title, Text } = Typography

type Store = Database['public']['Tables']['stores']['Row']

interface StoreFormValues {
  name: string
  phone: string
  email: string
  address: string
  tax_code: string
}

export function StoreInfoForm() {
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm<StoreFormValues>()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const { data: storeData, isLoading } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore(),
  })

  const store = storeData?.store

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StoreFormValues>) => api.store.updateStore(data),
    onSuccess: () => {
      message.success(t('updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['user-store'] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      message.error(error.message || t('updateError'))
    },
  })

  const handleEdit = () => {
    if (store) {
      form.setFieldsValue({
        name: store.name || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        tax_code: store.tax_code || '',
      })
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.resetFields()
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      updateMutation.mutate(values)
    } catch {
      // validation error
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <ShopOutlined className="text-xl" />
          <Title level={5} className="!mb-0">{t('storeInfo')}</Title>
        </div>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    )
  }

  if (!store) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <ShopOutlined className="text-xl" />
          <Title level={5} className="!mb-0">{t('storeInfo')}</Title>
        </div>
        <Text type="secondary">{t('storeNotConfigured')}</Text>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShopOutlined className="text-xl" />
          <Title level={5} className="!mb-0">{t('storeInfo')}</Title>
        </div>
        {!isEditing && (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            {tCommon('edit')}
          </Button>
        )}
      </div>

      {isEditing ? (
        <Form form={form} layout="vertical" size="middle">
          <Form.Item
            name="name"
            label={t('storeName')}
            rules={[{ required: true, message: t('storeNameRequired') }]}
          >
            <Input prefix={<ShopOutlined />} placeholder={t('storeNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={t('phone')}
            rules={[
              { pattern: /^0[3|5|7|8|9][0-9]{8}$/, message: t('phoneInvalid') },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="0912345678" />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('email')}
            rules={[{ type: 'email', message: t('emailInvalid') }]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@example.com" />
          </Form.Item>

          <Form.Item name="address" label={t('address')}>
            <Input prefix={<EnvironmentOutlined />} placeholder={t('addressPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="tax_code"
            label={t('taxCode')}
            rules={[
              { pattern: /^[0-9]{10}$|^[0-9]{12}$|^[0-9]{10}-[0-9]{3}$/, message: t('taxCodeInvalid') },
            ]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="0123456789" />
          </Form.Item>

          <div className="flex gap-2 mt-4">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={updateMutation.isPending}
            >
              {tCommon('save')}
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              {tCommon('cancel')}
            </Button>
          </div>
        </Form>
      ) : (
        <Descriptions column={1} size="small">
          <Descriptions.Item label={<span><ShopOutlined className="mr-1" />{t('storeName')}</span>}>
            {store.name}
          </Descriptions.Item>
          {store.phone && (
            <Descriptions.Item label={<span><PhoneOutlined className="mr-1" />{t('phone')}</span>}>
              {store.phone}
            </Descriptions.Item>
          )}
          {store.email && (
            <Descriptions.Item label={<span><MailOutlined className="mr-1" />{t('email')}</span>}>
              {store.email}
            </Descriptions.Item>
          )}
          {store.address && (
            <Descriptions.Item label={<span><EnvironmentOutlined className="mr-1" />{t('address')}</span>}>
              {store.address}
            </Descriptions.Item>
          )}
          {store.tax_code && (
            <Descriptions.Item label={<span><IdcardOutlined className="mr-1" />{t('taxCode')}</span>}>
              {store.tax_code}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Card>
  )
}
