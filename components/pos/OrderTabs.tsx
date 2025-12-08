'use client'

import { useTranslations } from 'next-intl'
import { Tabs, Button, Badge, Popconfirm, Input, message } from 'antd'
import { PlusOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useMultiOrderStore, type Order } from '@/lib/stores/multiOrder'

export function OrderTabs() {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')
  const {
    orders,
    activeOrderId,
    maxOrders,
    createOrder,
    deleteOrder,
    setActiveOrder,
    renameOrder,
  } = useMultiOrderStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

  const handleAddOrder = () => {
    try {
      createOrder()
      message.success(t('orderCreated'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('cannotCreateOrder'))
    }
  }

  const handleDeleteOrder = (orderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    deleteOrder(orderId)
    message.success(t('orderDeleted'))
  }

  const handleStartEdit = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(order.id)
    setEditingLabel(order.label)
  }

  const handleSaveEdit = (orderId: string) => {
    if (editingLabel.trim()) {
      renameOrder(orderId, editingLabel.trim())
    }
    setEditingId(null)
    setEditingLabel('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingLabel('')
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
        <span className="text-gray-500 text-sm">{t('noOrder')}</span>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAddOrder}
        >
          {t('createOrder')}
        </Button>
      </div>
    )
  }

  const tabItems = orders.map((order) => {
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

    return {
      key: order.id,
      label: (
        <div className="flex items-center gap-2 px-1">
          {editingId === order.id ? (
            <Input
              size="small"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              onPressEnter={() => handleSaveEdit(order.id)}
              onBlur={() => handleSaveEdit(order.id)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelEdit()
              }}
              autoFocus
              className="w-24"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <Badge count={itemCount} size="small" offset={[4, 0]}>
                <span className="text-sm">{order.label}</span>
              </Badge>
              <EditOutlined
                className="text-gray-400 hover:text-blue-500 text-xs cursor-pointer"
                onClick={(e) => handleStartEdit(order, e)}
              />
            </>
          )}
          {orders.length > 1 && (
            <Popconfirm
              title={t('deleteOrderConfirm')}
              description={t('deleteOrderMessage')}
              onConfirm={(e) => handleDeleteOrder(order.id, e)}
              onCancel={(e) => e?.stopPropagation()}
              okText={tCommon('delete')}
              cancelText={tCommon('cancel')}
            >
              <CloseOutlined
                className="text-gray-400 hover:text-red-500 text-xs cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </div>
      ),
    }
  })

  return (
    <div className="mb-4">
      <Tabs
        type="card"
        activeKey={activeOrderId || undefined}
        onChange={setActiveOrder}
        items={tabItems}
        tabBarExtraContent={
          orders.length < maxOrders && (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddOrder}
              className="text-blue-500"
            >
              {t('addOrder')}
            </Button>
          )
        }
        className="order-tabs"
        size="small"
      />
    </div>
  )
}
