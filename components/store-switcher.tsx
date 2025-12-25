'use client'

import { useState } from 'react'
import { Dropdown, Button, Tag, Spin, Modal, Form, Input, message } from 'antd'
import { ShopOutlined, DownOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { useCurrentStore } from '@/lib/hooks/useCurrentStore'
import { STORAGE_KEYS, ONBOARDING_DEFAULTS, type OnboardingDraft } from '@/lib/constants'
import type { MenuProps } from 'antd'

export function StoreSwitcher() {
  const t = useTranslations('store')
  const { currentStore, userStores, isLoading, switchStore, canCreateStore, maxStores, createStore } = useCurrentStore()
  const [switching, setSwitching] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  if (isLoading) {
    return (
      <Button type="text" size="small" loading>
        <ShopOutlined />
      </Button>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'gold'
      case 'manager':
        return 'blue'
      default:
        return 'default'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return t('roleOwner')
      case 'manager':
        return t('roleManager')
      default:
        return t('roleStaff')
    }
  }

  const handleSwitchStore = async (storeId: string) => {
    if (currentStore && storeId === currentStore.id) return
    setSwitching(true)
    try {
      await switchStore(storeId)
    } finally {
      setSwitching(false)
    }
  }

  const handleCreateStore = async (values: { storeName: string; phone?: string }) => {
    setCreating(true)
    try {
      // Save store info to localStorage for pre-fill in setup page
      const draftData: OnboardingDraft = {
        data: {
          ...ONBOARDING_DEFAULTS,
          storeName: values.storeName,
          phone: values.phone || '',
        },
        step: 0,
      }
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_DRAFT, JSON.stringify(draftData))
      
      const result = await createStore(values.storeName, values.phone)
      if (!result.success) {
        message.error(result.error || t('createError'))
      }
    } catch {
      message.error(t('createError'))
    } finally {
      setCreating(false)
    }
  }

  const items: MenuProps['items'] = [
    ...userStores.map((store) => ({
      key: store.id,
      label: (
        <div className="flex items-center justify-between gap-3 min-w-[180px] py-1">
          <div className="flex items-center gap-2">
            {currentStore && store.id === currentStore.id && <CheckOutlined className="text-blue-500" />}
            <span className={currentStore && store.id === currentStore.id ? 'font-medium' : ''}>
              {store.name}
            </span>
          </div>
          <Tag color={getRoleColor(store.role)} className="m-0">
            {getRoleLabel(store.role)}
          </Tag>
        </div>
      ),
      onClick: () => handleSwitchStore(store.id),
    })),
    ...(canCreateStore ? [
      { type: 'divider' as const },
      {
        key: 'create',
        label: (
          <div className="flex items-center gap-2 py-1 text-blue-500">
            <PlusOutlined />
            <span>{t('createStore')}</span>
          </div>
        ),
        onClick: () => setCreateModalOpen(true),
      },
    ] : [
      { type: 'divider' as const },
      {
        key: 'limit-info',
        label: (
          <div className="text-xs text-gray-400 py-1">
            {t('storeLimit', { current: userStores.length, max: maxStores })}
          </div>
        ),
        disabled: true,
      },
    ]),
  ]

  // Always show the dropdown if user can create store or has multiple stores
  const showDropdown = userStores.length > 1 || canCreateStore

  if (!showDropdown) {
    return (
      <Button type="text" size="small" className="flex items-center gap-1 max-w-[160px]">
        <ShopOutlined />
        <span className="truncate text-sm">{currentStore?.name || t('noStore')}</span>
      </Button>
    )
  }

  return (
    <>
      <Dropdown
        menu={{ items }}
        trigger={['click']}
        disabled={switching}
        placement="bottomRight"
      >
        <Button type="text" size="small" className="flex items-center gap-1 max-w-[160px]">
          {switching ? (
            <Spin size="small" />
          ) : (
            <>
              <ShopOutlined />
              <span className="truncate text-sm">{currentStore?.name || t('noStore')}</span>
              <DownOutlined className="text-xs" />
            </>
          )}
        </Button>
      </Dropdown>

      <Modal
        title={t('createStore')}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={creating}
        okText={t('create')}
        cancelText={t('cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateStore}
        >
          <Form.Item
            name="storeName"
            label={t('storeName')}
            rules={[{ required: true, message: t('storeNameRequired') }]}
          >
            <Input placeholder={t('storeNamePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t('phone')}
          >
            <Input placeholder={t('phonePlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
