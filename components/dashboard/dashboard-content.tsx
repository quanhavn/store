'use client'

import { Card, Typography, Row, Col, Statistic, Alert, Spin } from 'antd'
import { 
  ShoppingCartOutlined, 
  InboxOutlined, 
  WalletOutlined, 
  RiseOutlined,
  WarningOutlined,
  PlusOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Title, Text } = Typography

interface DashboardContentProps {
  storeName: string
}

export function DashboardContent({ storeName }: DashboardContentProps) {
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.reports.dashboardSummary(),
  })

  const { data: financeData, isLoading: isFinanceLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.finance.summary('day'),
  })

  const { data: inventoryData, isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api.inventory.summary(),
  })

  const todayRevenue = dashboardData?.today?.revenue || 0
  const todayOrders = dashboardData?.today?.orders || 0
  const cashBalance = financeData?.summary?.cash_balance || 0
  const totalProducts = inventoryData?.summary?.total_products || 0
  const lowStockCount = dashboardData?.alerts?.lowStockCount || 0

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={4} className="!mb-0">Xin chào</Title>
          <Text type="secondary">{storeName}</Text>
        </div>
        <Link href="/settings">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-lg font-semibold text-blue-600">
              {storeName[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </Link>
      </div>

      <Row gutter={[12, 12]}>
        <Col span={12}>
          <Card size="small">
            {isDashboardLoading ? (
              <div className="py-2"><Spin size="small" /></div>
            ) : (
              <Statistic
                title={<span className="text-xs"><RiseOutlined /> Doanh thu hôm nay</span>}
                value={todayRevenue}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ fontSize: 18, color: '#3ecf8e' }}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            {isDashboardLoading ? (
              <div className="py-2"><Spin size="small" /></div>
            ) : (
              <Statistic
                title={<span className="text-xs"><ShoppingCartOutlined /> Đơn hàng</span>}
                value={todayOrders}
                suffix="đơn"
                valueStyle={{ fontSize: 18 }}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            {isFinanceLoading ? (
              <div className="py-2"><Spin size="small" /></div>
            ) : (
              <Statistic
                title={<span className="text-xs"><WalletOutlined /> Tiền mặt</span>}
                value={cashBalance}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ fontSize: 18 }}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            {isInventoryLoading ? (
              <div className="py-2"><Spin size="small" /></div>
            ) : (
              <Statistic
                title={<span className="text-xs"><InboxOutlined /> Sản phẩm</span>}
                value={totalProducts}
                suffix="SP"
                valueStyle={{ fontSize: 18 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {lowStockCount > 0 ? (
        <Alert
          message="Cảnh báo tồn kho"
          description={
            <div>
              <Text>Có {lowStockCount} sản phẩm sắp hết hàng.</Text>
              <br />
              <Link href="/inventory" className="text-blue-500 font-medium">
                Xem chi tiết →
              </Link>
            </div>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
        />
      ) : totalProducts === 0 ? (
        <Alert
          message="Bắt đầu kinh doanh"
          description={
            <div>
              <Text>Chưa có sản phẩm nào. Bắt đầu thêm sản phẩm để quản lý kho.</Text>
              <br />
              <Link href="/products" className="text-blue-500 font-medium">
                Thêm sản phẩm →
              </Link>
            </div>
          }
          type="info"
          showIcon
        />
      ) : null}

      <div>
        <Title level={5}>Truy cập nhanh</Title>
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Link href="/pos">
              <Card hoverable size="small" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <ShoppingCartOutlined className="text-xl text-blue-600" />
                  </div>
                  <div>
                    <Text strong>Bán hàng</Text>
                    <br />
                    <Text type="secondary" className="text-xs">Tạo đơn mới</Text>
                  </div>
                </div>
              </Card>
            </Link>
          </Col>
          <Col span={12}>
            <Link href="/inventory">
              <Card hoverable size="small" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <PlusOutlined className="text-xl text-green-600" />
                  </div>
                  <div>
                    <Text strong>Nhập kho</Text>
                    <br />
                    <Text type="secondary" className="text-xs">Thêm hàng</Text>
                  </div>
                </div>
              </Card>
            </Link>
          </Col>
          <Col span={12}>
            <Link href="/finance">
              <Card hoverable size="small" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <WalletOutlined className="text-xl text-purple-600" />
                  </div>
                  <div>
                    <Text strong>Thu chi</Text>
                    <br />
                    <Text type="secondary" className="text-xs">Quản lý tiền</Text>
                  </div>
                </div>
              </Card>
            </Link>
          </Col>
          <Col span={12}>
            <Link href="/reports">
              <Card hoverable size="small" className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-orange-600" />
                  </div>
                  <div>
                    <Text strong>Báo cáo</Text>
                    <br />
                    <Text type="secondary" className="text-xs">Xem thống kê</Text>
                  </div>
                </div>
              </Card>
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  )
}
