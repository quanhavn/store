'use client'

import { Result, Button, Typography, Divider } from 'antd'
import { PrinterOutlined, ShareAltOutlined, PlusOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface CheckoutSuccessProps {
  invoiceNo: string
  total: number
  onNewSale: () => void
  onPrint?: () => void
  onShare?: () => void
}

export function CheckoutSuccess({
  invoiceNo,
  total,
  onNewSale,
  onPrint,
  onShare,
}: CheckoutSuccessProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <Result
        status="success"
        title="Thanh toán thành công!"
        subTitle={
          <div className="space-y-2">
            <div>
              <Text type="secondary">Số hóa đơn:</Text>
              <Title level={4} className="!m-0">{invoiceNo}</Title>
            </div>
            <div>
              <Text type="secondary">Tổng tiền:</Text>
              <Title level={3} className="!m-0 text-blue-600">
                {total.toLocaleString('vi-VN')}đ
              </Title>
            </div>
          </div>
        }
        extra={
          <div className="space-y-3 w-full max-w-xs mx-auto">
            {onPrint && (
              <Button
                icon={<PrinterOutlined />}
                size="large"
                block
                onClick={onPrint}
              >
                In hóa đơn
              </Button>
            )}
            {onShare && (
              <Button
                icon={<ShareAltOutlined />}
                size="large"
                block
                onClick={onShare}
              >
                Chia sẻ
              </Button>
            )}
            <Divider />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              block
              onClick={onNewSale}
            >
              Đơn hàng mới
            </Button>
          </div>
        }
      />
    </div>
  )
}
