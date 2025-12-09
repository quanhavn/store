'use client'

import { useTranslations } from 'next-intl'
import { Drawer, List, InputNumber, Button, Typography, Divider, Empty, Popconfirm, Space, Tag } from 'antd'
import { DeleteOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useMultiOrderStore } from '@/lib/stores/multiOrder'

const { Text, Title } = Typography

interface MultiOrderCartSheetProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function MultiOrderCartSheet({ open, onClose, onCheckout }: MultiOrderCartSheetProps) {
  const t = useTranslations('pos')
  const tCommon = useTranslations('common')
  const {
    getActiveOrder,
    updateQuantity,
    removeItem,
    setDiscount,
    clearActiveOrder,
    getSubtotal,
    getVatAmount,
    getTotal,
  } = useMultiOrderStore()

  const activeOrder = getActiveOrder()
  const items = activeOrder?.items || []
  const discount = activeOrder?.discount || 0

  const subtotal = getSubtotal()
  const vatAmount = getVatAmount()
  const total = getTotal()

  return (
    <Drawer
      title={activeOrder ? `${activeOrder.label} (${items.length})` : t('cart')}
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 400 } }}
      footer={
        <div className="space-y-3">
          <div className="flex justify-between">
            <Text>{t('subtotal')}:</Text>
            <Text>{subtotal.toLocaleString('vi-VN')}d</Text>
          </div>
          <div className="flex justify-between">
            <Text>{t('vat')}:</Text>
            <Text>{vatAmount.toLocaleString('vi-VN')}d</Text>
          </div>
          <div className="flex justify-between items-center">
            <Text>{t('discount')}:</Text>
            <Space.Compact className="w-32">
              <InputNumber
                size="small"
                min={0}
                max={subtotal + vatAmount}
                value={discount}
                onChange={(v) => setDiscount(v || 0)}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              />
              <Space.Addon>d</Space.Addon>
            </Space.Compact>
          </div>
          <Divider className="my-2" />
          <div className="flex justify-between">
            <Title level={4} className="!m-0">{t('total')}:</Title>
            <Title level={4} className="!m-0 text-blue-600">{total.toLocaleString('vi-VN')}d</Title>
          </div>
          <div className="flex gap-2 pt-2">
            <Popconfirm
              title={t('deleteOrderConfirm')}
              description={t('deleteOrderMessage')}
              onConfirm={clearActiveOrder}
              okText={tCommon('delete')}
              cancelText={tCommon('cancel')}
            >
              <Button danger className="flex-1" disabled={items.length === 0}>
                {t('deleteOrder')}
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              className="flex-1"
              disabled={items.length === 0}
              onClick={onCheckout}
            >
              {t('checkout')}
            </Button>
          </div>
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty description={t('emptyCart')} className="py-12" />
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeItem(item.product_id, item.variant_id)}
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <div className="flex flex-col">
                    <span>{item.product_name}</span>
                    {item.variant_name && (
                      <Tag color="blue" className="w-fit mt-1">{item.variant_name}</Tag>
                    )}
                  </div>
                }
                description={
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                      />
                      <InputNumber
                        size="small"
                        min={1}
                        value={item.quantity}
                        onChange={(v) => updateQuantity(item.product_id, v || 1, item.variant_id)}
                        className="w-16"
                      />
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                      />
                      {item.unit_name && (
                        <Text type="secondary" className="text-xs">/{item.unit_name}</Text>
                      )}
                    </div>
                  </div>
                }
              />
              <Text strong>
                {(item.quantity * item.unit_price).toLocaleString('vi-VN')}đ
              </Text>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  )
}
