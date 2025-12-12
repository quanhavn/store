'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tabs, Typography, Button, Modal, message, Spin, Alert, Dropdown } from 'antd'
import {
  UnorderedListOutlined,
  SwapOutlined,
  WarningOutlined,
  AuditOutlined,
  PlusOutlined,
  ShoppingOutlined,
  DownOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StockCheckList } from '@/components/inventory/StockCheckList'
import { StockAdjustment } from '@/components/inventory/StockAdjustment'
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts'
import { InventoryHistory } from '@/components/inventory/InventoryHistory'
import { StockCheckForm, StockCheckItem } from '@/components/inventory/StockCheckForm'
import { StockCheckSummary } from '@/components/inventory/StockCheckSummary'
import { ProductForm } from '@/components/products/ProductForm'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/supabase/functions'
import { formatDateTime } from '@/lib/utils'
import { useInventoryStore } from '@/lib/stores/inventory'

const { Title, Text } = Typography

interface Category {
  id: string
  name: string
}

type StockCheckStep = 'form' | 'summary'

interface StockCheck {
  id: string
  store_id: string
  status: 'in_progress' | 'completed'
  started_at: string
  completed_at: string | null
  created_by: string
  note: string | null
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock-check')
  const [stockCheckModalOpen, setStockCheckModalOpen] = useState(false)
  const [stockCheckStep, setStockCheckStep] = useState<StockCheckStep>('form')
  const [currentStockCheck, setCurrentStockCheck] = useState<StockCheck | null>(null)
  const [stockCheckItems, setStockCheckItems] = useState<StockCheckItem[]>([])
  const [productFormOpen, setProductFormOpen] = useState(false)

  const supabase = createClient()
  const queryClient = useQueryClient()
  const { shouldNavigateToAdjustment, setShouldNavigateToAdjustment } = useInventoryStore()

  useEffect(() => {
    if (shouldNavigateToAdjustment) {
      setActiveTab('adjustment')
      setShouldNavigateToAdjustment(false)
    }
  }, [shouldNavigateToAdjustment, setShouldNavigateToAdjustment])

  // Fetch categories for product form
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await api.categories.list()
      return result.categories as Category[]
    },
  })

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: {
      name: string
      sku?: string
      barcode?: string
      category_id?: string
      cost_price: number
      sell_price: number
      vat_rate: number
      quantity: number
      min_stock: number
      unit: string
      image_url?: string
    }) => {
      const result = await api.products.create(data)
      return result.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      setProductFormOpen(false)
      message.success('Thêm sản phẩm thành công')
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // Fetch active stock check on page load
  const { data: activeStockCheckData, isLoading: isLoadingActive } = useQuery({
    queryKey: ['active-stock-check'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'get_active_stock_check' }),
        }
      )

      if (!response.ok) throw new Error('Failed to fetch active stock check')
      const result = await response.json()
      return result as { stock_check: StockCheck | null; items: StockCheckItem[] }
    },
  })

  // Create stock check mutation
  const createStockCheckMutation = useMutation({
    mutationFn: async (note?: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'create_stock_check',
            data: { note },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create stock check')
      }
      const result = await response.json()
      return result as { stock_check: StockCheck; items: StockCheckItem[] }
    },
    onSuccess: (data) => {
      setCurrentStockCheck(data.stock_check)
      setStockCheckItems(data.items)
      setStockCheckStep('form')
      setStockCheckModalOpen(true)
      queryClient.invalidateQueries({ queryKey: ['active-stock-check'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // Update stock check item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({
      productId,
      actualQuantity,
      note,
    }: {
      productId: string
      actualQuantity: number
      note?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update_stock_check_item',
            data: {
              stock_check_id: currentStockCheck?.id,
              product_id: productId,
              actual_quantity: actualQuantity,
              note,
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update item')
      }
      const result = await response.json()
      return result.item as StockCheckItem
    },
    onSuccess: (updatedItem) => {
      setStockCheckItems((prev) =>
        prev.map((item) =>
          item.product_id === updatedItem.product_id ? updatedItem : item
        )
      )
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // Submit stock check mutation
  const submitStockCheckMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'submit_stock_check',
            data: { stock_check_id: currentStockCheck?.id },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit stock check')
      }
      const result = await response.json()
      return result
    },
    onSuccess: (data) => {
      const { summary } = data
      message.success(
        `Hoàn tất kiểm kê! Đã điều chỉnh ${summary.items_with_difference} sản phẩm.`
      )
      setStockCheckModalOpen(false)
      setCurrentStockCheck(null)
      setStockCheckItems([])
      setStockCheckStep('form')
      queryClient.invalidateQueries({ queryKey: ['active-stock-check'] })
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // Cancel stock check mutation
  const cancelStockCheckMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'cancel_stock_check',
            data: { stock_check_id: currentStockCheck?.id },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel stock check')
      }
      return true
    },
    onSuccess: () => {
      message.info('Đã hủy phiên kiểm kê')
      setStockCheckModalOpen(false)
      setCurrentStockCheck(null)
      setStockCheckItems([])
      setStockCheckStep('form')
      queryClient.invalidateQueries({ queryKey: ['active-stock-check'] })
    },
    onError: (error: Error) => {
      message.error(error.message)
    },
  })

  // Handle start stock check
  const handleStartStockCheck = useCallback(() => {
    if (activeStockCheckData?.stock_check) {
      // Resume existing stock check
      setCurrentStockCheck(activeStockCheckData.stock_check)
      setStockCheckItems(activeStockCheckData.items)
      setStockCheckStep('form')
      setStockCheckModalOpen(true)
    } else {
      // Create new stock check
      createStockCheckMutation.mutate(undefined)
    }
  }, [activeStockCheckData, createStockCheckMutation])

  // Handle update item
  const handleUpdateItem = useCallback(
    async (productId: string, actualQuantity: number, note?: string) => {
      await updateItemMutation.mutateAsync({ productId, actualQuantity, note })
    },
    [updateItemMutation]
  )

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (currentStockCheck) {
      Modal.confirm({
        title: 'Tạm dừng kiểm kê?',
        content: 'Tiến độ kiểm kê sẽ được lưu lại. Bạn có thể tiếp tục sau.',
        okText: 'Tạm dừng',
        cancelText: 'Tiếp tục kiểm',
        onOk: () => {
          setStockCheckModalOpen(false)
        },
      })
    } else {
      setStockCheckModalOpen(false)
    }
  }, [currentStockCheck])

  // Handle cancel stock check
  const handleCancelStockCheck = useCallback(() => {
    Modal.confirm({
      title: 'Hủy phiên kiểm kê?',
      content: 'Toàn bộ tiến độ kiểm kê sẽ bị xóa. Bạn có chắc chắn?',
      okText: 'Hủy kiểm kê',
      okButtonProps: { danger: true },
      cancelText: 'Không',
      onOk: () => {
        cancelStockCheckMutation.mutate()
      },
    })
  }, [cancelStockCheckMutation])

  const tabItems = [
    {
      key: 'stock-check',
      label: (
        <span className="flex items-center gap-1">
          <UnorderedListOutlined />
          Tồn kho
        </span>
      ),
      children: <StockCheckList />,
    },
    {
      key: 'adjustment',
      label: (
        <span className="flex items-center gap-1">
          <SwapOutlined />
          Nhập/Xuất
        </span>
      ),
      children: <StockAdjustment />,
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-1">
          <HistoryOutlined />
          Lịch sử
        </span>
      ),
      children: <InventoryHistory />,
    },
    {
      key: 'low-stock',
      label: (
        <span className="flex items-center gap-1">
          <WarningOutlined />
          Cảnh báo
        </span>
      ),
      children: <LowStockAlerts />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!mb-0">Quản lý kho</Title>
        <div className="flex gap-2">
          <Dropdown
            menu={{
              items: [
                {
                  key: 'add-product',
                  icon: <ShoppingOutlined />,
                  label: 'Thêm sản phẩm mới',
                  onClick: () => setProductFormOpen(true),
                },
                {
                  key: 'stock-check',
                  icon: <AuditOutlined />,
                  label: activeStockCheckData?.stock_check ? 'Tiếp tục kiểm kê' : 'Kiểm kê tồn kho',
                  onClick: handleStartStockCheck,
                },
              ],
            }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={createStockCheckMutation.isPending || isLoadingActive}
            >
              Thêm <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Active Stock Check Banner */}
      {activeStockCheckData?.stock_check && !stockCheckModalOpen && (
        <Alert
          type="info"
          message="Dang co phien kiem ke"
          description={
            <div>
              <Text type="secondary">
                Bat dau: {formatDateTime(activeStockCheckData.stock_check.started_at)}
              </Text>
              <br />
              <Text type="secondary">
                Tien do: {activeStockCheckData.items.filter((i) => i.actual_quantity !== null).length}/
                {activeStockCheckData.items.length} san pham
              </Text>
            </div>
          }
          action={
            <Button size="small" onClick={handleStartStockCheck}>
              Tiep tuc
            </Button>
          }
          className="mb-4"
          showIcon
          icon={<AuditOutlined />}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="inventory-tabs"
      />

      {/* Stock Check Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AuditOutlined />
            <span>Kiem ke ton kho</span>
          </div>
        }
        open={stockCheckModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100vw', margin: 0, padding: 0 }}
        styles={{ body: { height: 'calc(100vh - 55px)', overflow: 'hidden', padding: '16px' } }}
        destroyOnHidden
      >
        {isLoadingActive ? (
          <div className="flex items-center justify-center h-full">
            <Spin size="large" />
          </div>
        ) : stockCheckStep === 'form' ? (
          <div className="h-full flex flex-col">
            <StockCheckForm
              items={stockCheckItems}
              onUpdateItem={handleUpdateItem}
              onSubmit={() => setStockCheckStep('summary')}
              isUpdating={updateItemMutation.isPending}
            />
            <div className="pt-2">
              <Button
                type="text"
                danger
                onClick={handleCancelStockCheck}
                loading={cancelStockCheckMutation.isPending}
                block
              >
                Huy phien kiem ke
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <StockCheckSummary
              items={stockCheckItems}
              onConfirm={() => submitStockCheckMutation.mutate()}
              onBack={() => setStockCheckStep('form')}
              isSubmitting={submitStockCheckMutation.isPending}
            />
          </div>
        )}
      </Modal>

      {/* Product Form */}
      <ProductForm
        open={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        onSubmit={async (data) => {
          await createProductMutation.mutateAsync(data)
        }}
        categories={categories}
        title="Thêm sản phẩm mới"
      />
    </div>
  )
}
