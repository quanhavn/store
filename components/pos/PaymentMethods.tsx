'use client'

import { Card, Radio, InputNumber, Button, Typography, Input, Space, QRCode, Divider } from 'antd'
import {
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  QrcodeOutlined,
} from '@ant-design/icons'
import { useState } from 'react'

const { Text, Title } = Typography

export interface PaymentInfo {
  method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
  amount: number
  bank_account_id?: string
  bank_ref?: string
}

interface PaymentMethodsProps {
  total: number
  onConfirm: (payments: PaymentInfo[]) => void
  loading?: boolean
  bankAccounts?: { id: string; bank_name: string; account_number: string }[]
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Tiền mặt', icon: <DollarOutlined /> },
  { value: 'bank_transfer', label: 'Chuyển khoản', icon: <BankOutlined /> },
  { value: 'momo', label: 'MoMo', icon: <WalletOutlined /> },
  { value: 'zalopay', label: 'ZaloPay', icon: <WalletOutlined /> },
]

export function PaymentMethods({
  total,
  onConfirm,
  loading = false,
  bankAccounts = [],
}: PaymentMethodsProps) {
  const [method, setMethod] = useState<PaymentInfo['method']>('cash')
  const [cashReceived, setCashReceived] = useState(total)
  const [bankRef, setBankRef] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string>()

  const change = method === 'cash' ? Math.max(0, cashReceived - total) : 0
  const isValid = method === 'cash' ? cashReceived >= total : true

  const handleConfirm = () => {
    const payment: PaymentInfo = {
      method,
      amount: method === 'cash' ? total : total,
      bank_account_id: method === 'bank_transfer' ? selectedBankId : undefined,
      bank_ref: method === 'bank_transfer' ? bankRef : undefined,
    }
    onConfirm([payment])
  }

  // Generate VietQR URL
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId)
  const vietQRUrl = selectedBank
    ? `https://img.vietqr.io/image/${selectedBank.bank_name}-${selectedBank.account_number}-compact.png?amount=${total}&addInfo=${encodeURIComponent(`Thanh toan`)}`
    : undefined

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Text type="secondary">Số tiền cần thanh toán</Text>
        <Title level={2} className="!m-0 text-blue-600">
          {total.toLocaleString('vi-VN')}đ
        </Title>
      </div>

      <Radio.Group
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full"
      >
        <Space direction="vertical" className="w-full">
          {PAYMENT_OPTIONS.map((opt) => (
            <Card
              key={opt.value}
              size="small"
              className={`cursor-pointer ${method === opt.value ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setMethod(opt.value as PaymentInfo['method'])}
            >
              <Radio value={opt.value}>
                <Space>
                  {opt.icon}
                  {opt.label}
                </Space>
              </Radio>
            </Card>
          ))}
        </Space>
      </Radio.Group>

      <Divider />

      {method === 'cash' && (
        <div className="space-y-4">
          <div>
            <Text className="block mb-2">Tiền khách đưa:</Text>
            <InputNumber
              size="large"
              className="w-full"
              min={0}
              value={cashReceived}
              onChange={(v) => setCashReceived(v || 0)}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              addonAfter="đ"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[50000, 100000, 200000, 500000].map((amount) => (
              <Button key={amount} onClick={() => setCashReceived(amount)}>
                {(amount / 1000).toFixed(0)}k
              </Button>
            ))}
          </div>
          {change > 0 && (
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Text type="secondary">Tiền thối:</Text>
              <Title level={3} className="!m-0 text-green-600">
                {change.toLocaleString('vi-VN')}đ
              </Title>
            </div>
          )}
        </div>
      )}

      {method === 'bank_transfer' && (
        <div className="space-y-4">
          {bankAccounts.length > 0 ? (
            <>
              <div>
                <Text className="block mb-2">Chọn tài khoản:</Text>
                <Radio.Group
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full"
                >
                  <Space direction="vertical" className="w-full">
                    {bankAccounts.map((bank) => (
                      <Radio key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_number}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
              {selectedBankId && vietQRUrl && (
                <div className="text-center">
                  <QRCode value={vietQRUrl} size={200} className="mx-auto" />
                  <Text type="secondary" className="block mt-2">
                    Quét mã QR để chuyển khoản
                  </Text>
                </div>
              )}
              <div>
                <Text className="block mb-2">Mã giao dịch:</Text>
                <Input
                  placeholder="Nhập mã giao dịch ngân hàng"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Text type="secondary">Chưa có tài khoản ngân hàng nào</Text>
            </div>
          )}
        </div>
      )}

      {(method === 'momo' || method === 'zalopay') && (
        <div className="text-center py-4">
          <QrcodeOutlined className="text-6xl text-gray-300" />
          <Text type="secondary" className="block mt-2">
            Tính năng đang phát triển
          </Text>
        </div>
      )}

      <Button
        type="primary"
        size="large"
        block
        onClick={handleConfirm}
        loading={loading}
        disabled={!isValid}
      >
        Xác nhận thanh toán
      </Button>
    </div>
  )
}
