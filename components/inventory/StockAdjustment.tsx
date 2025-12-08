'use client'

import { useState } from 'react'
import {
  Segmented,
  Button,
  List,
  InputNumber,
  Input,
  Empty,
  Modal,
  message,
  Spin,
  Typography,
  Switch
} from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { useInventoryStore, AdjustmentType } from '@/lib/stores/inventory'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography
const { TextArea } = Input

interface Product {
  id: string
  name: string
  sku: string | null
  quantity: number
  cost_price: number
  unit: string
}

export function StockAdjustment() {
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const t = useTranslations('inventory')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const {
    adjustmentType,
    adjustmentItems,
    adjustmentNote,
    recordExpense,
    supplierName,
    setAdjustmentType,
    addAdjustmentItem,
    removeAdjustmentItem,
    updateAdjustmentQuantity,
    updateAdjustmentCost,
    setAdjustmentNote,
    setRecordExpense,
    setSupplierName,
    clearAdjustment,
    getItemCount,
    getTotalValue,
  } = useInventoryStore()

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['products-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return []
      const result = await api.products.list({ search: searchTerm, limit: 20 })
      return result.products as Product[]
    },
    enabled: searchTerm.length > 0,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      for (const item of adjustmentItems) {
        if (adjustmentType === 'import') {
          await api.inventory.import({
            product_id: item.product_id,
            quantity: item.adjustment_quantity,
            unit_cost: item.unit_cost ?? undefined,
            note: item.note || adjustmentNote,
            record_expense: recordExpense,
            payment_method: 'cash',
            supplier_name: supplierName || undefined,
          })
        } else if (adjustmentType === 'export') {
          await api.inventory.export({
            product_id: item.product_id,
            quantity: item.adjustment_quantity,
            note: item.note || adjustmentNote,
          })
        } else {
          await api.inventory.adjust({
            product_id: item.product_id,
            new_quantity: item.current_quantity + item.adjustment_quantity,
            note: item.note || adjustmentNote,
          })
        }
      }
      return true
    },
    onSuccess: () => {
      const expenseMsg = adjustmentType === 'import' && recordExpense 
        ? ` (${t('expenseRecorded')})` 
        : ''
      message.success(
        adjustmentType === 'import'
          ? `${t('stockInSuccess')}${expenseMsg}`
          : adjustmentType === 'export'
          ? t('stockOutSuccess')
          : t('adjustmentSuccess')
      )
      clearAdjustment()
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => {
      message.error(`${tErrors('generic')}: ${error.message}`)
    },
  })

  const handleAddProduct = (product: Product) => {
    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      cost_price: product.cost_price,
    })
    setProductSearchOpen(false)
    setSearchTerm('')
  }

  const getTypeLabel = (type: AdjustmentType) => {
    switch (type) {
      case 'import':
        return t('stockIn')
      case 'export':
        return t('stockOut')
      case 'adjustment':
        return t('adjustment')
    }
  }

  return (
    <div>
      <Segmented
        block
        options={[
          { value: 'import', label: t('stockIn') },
          { value: 'export', label: t('stockOut') },
          { value: 'adjustment', label: t('adjustment') },
        ]}
        value={adjustmentType}
        onChange={(value) => setAdjustmentType(value as AdjustmentType)}
        className="mb-4"
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setProductSearchOpen(true)}
        block
        className="mb-4"
      >
        {t('addProduct')}
      </Button>

      {adjustmentItems.length === 0 ? (
        <Empty
          description={t('noProducts')}
          className="my-8"
        />
      ) : (
        <>
          <List
            dataSource={adjustmentItems}
            renderItem={(item) => (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {t('currentStock')}: {item.current_quantity}
                      </div>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeAdjustmentItem(item.product_id)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        type="text"
                        icon={<MinusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity - 1
                          )
                        }
                      />
                      <InputNumber
                        min={1}
                        value={item.adjustment_quantity}
                        onChange={(value) =>
                          updateAdjustmentQuantity(item.product_id, value || 1)
                        }
                        controls={false}
                        className="w-16 text-center border-0"
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity + 1
                          )
                        }
                      />
                    </div>
                    {adjustmentType === 'import' && (
                      <InputNumber
                        placeholder={t('costPrice')}
                        value={item.unit_cost}
                        onChange={(value) =>
                          updateAdjustmentCost(item.product_id, value)
                        }
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        }
                        parser={(value) =>
                          Number(value?.replace(/,/g, '')) || 0
                        }
                        className="flex-1"
                        suffix="đ"
                      />
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />

          <TextArea
            placeholder={t('notePlaceholder')}
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            rows={2}
            className="mt-4"
          />

          {adjustmentType === 'import' && (
            <>
              <Input
                placeholder={t('supplierNamePlaceholder')}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="mt-4"
              />
              <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarOutlined className="text-blue-500" />
                  <Text>{t('recordExpense')}</Text>
                </div>
                <Switch
                  checked={recordExpense}
                  onChange={setRecordExpense}
                />
              </div>
              {recordExpense && (
                <div className="text-xs text-gray-500 mt-1 px-3">
                  {t('autoDeductExpense', { amount: formatCurrency(getTotalValue()) })}
                </div>
              )}
            </>
          )}

          <div className="bg-gray-50 p-3 rounded-lg mt-4">
            <div className="flex justify-between mb-1">
              <Text type="secondary">{tCommon('type')}:</Text>
              <Text>{getTypeLabel(adjustmentType)}</Text>
            </div>
            <div className="flex justify-between mb-1">
              <Text type="secondary">Số lượng:</Text>
              <Text>{getItemCount()} {tCommon('products')}</Text>
            </div>
            {adjustmentType === 'import' && (
              <div className="flex justify-between">
                <Text type="secondary">{t('totalValue')}:</Text>
                <Text strong>{formatCurrency(getTotalValue())}</Text>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={clearAdjustment} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
              className="flex-1"
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </>
      )}

      <Modal
        title={t('selectProduct')}
        open={productSearchOpen}
        onCancel={() => {
          setProductSearchOpen(false)
          setSearchTerm('')
        }}
        footer={null}
      >
        <Input
          placeholder={t('searchProductPlaceholder')}
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
          autoFocus
        />

        {searchLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : searchResults.length === 0 ? (
          <Empty description={searchTerm ? t('noProductsFound') : t('enterProductNameToSearch')} />
        ) : (
          <List
            dataSource={searchResults}
            renderItem={(product) => {
              const isAdded = adjustmentItems.some(
                (item) => item.product_id === product.id
              )
              return (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => !isAdded && handleAddProduct(product)}
                >
                  <div className="flex justify-between w-full">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.sku && `SKU: ${product.sku} | `}
                        {t('stock')}: {product.quantity} {product.unit}
                      </div>
                    </div>
                    {isAdded ? (
                      <Text type="secondary">{t('added')}</Text>
                    ) : (
                      <PlusOutlined className="text-blue-500" />
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Modal>
    </div>
  )
}
