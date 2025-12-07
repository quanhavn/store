'use client'

import { Drawer, List, InputNumber, Button, Typography, Divider, Empty, Popconfirm } from 'antd'
import { DeleteOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useMultiOrderStore } from '@/lib/stores/multiOrder'

const { Text, Title } = Typography

interface MultiOrderCartSheetProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function MultiOrderCartSheet({ open, onClose, onCheckout }: MultiOrderCartSheetProps) {
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
      title={activeOrder ? `${activeOrder.label} (${items.length})` : 'Giỏ hàng'}
      open={open}
      onClose={onClose}
      width={400}
      footer={
        <div className="space-y-3">
          <div className="flex justify-between">
            <Text>Tạm tính:</Text>
            <Text>{subtotal.toLocaleString('vi-VN')}đ</Text>
          </div>
          <div className="flex justify-between">
            <Text>VAT:</Text>
            <Text>{vatAmount.toLocaleString('vi-VN')}đ</Text>
          </div>
          <div className="flex justify-between items-center">
            <Text>Giảm giá:</Text>
            <InputNumber
              size="small"
              min={0}
              max={subtotal + vatAmount}
              value={discount}
              onChange={(v) => setDiscount(v || 0)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              addonAfter="đ"
              className="w-32"
            />
          </div>
          <Divider className="my-2" />
          <div className="flex justify-between">
            <Title level={4} className="!m-0">Tổng cộng:</Title>
            <Title level={4} className="!m-0 text-blue-600">{total.toLocaleString('vi-VN')}đ</Title>
          </div>
          <div className="flex gap-2 pt-2">
            <Popconfirm
              title="Xóa đơn hàng này?"
              description="Tất cả sản phẩm sẽ bị xóa và đơn sẽ bị đóng"
              onConfirm={clearActiveOrder}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger className="flex-1" disabled={items.length === 0}>
                Xóa đơn
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              className="flex-1"
              disabled={items.length === 0}
              onClick={onCheckout}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      }
    >
      {items.length === 0 ? (
        <Empty description="Giỏ hàng trống" className="py-12" />
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
                  onClick={() => removeItem(item.product_id)}
                />,
              ]}
            >
              <List.Item.Meta
                title={item.product_name}
                description={
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    />
                    <InputNumber
                      size="small"
                      min={1}
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.product_id, v || 1)}
                      className="w-16"
                    />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    />
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
