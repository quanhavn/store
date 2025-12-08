'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Input,
  InputNumber,
  List,
  Tag,
  Progress,
  Typography,
  Empty,
  Button,
  Spin,
} from 'antd'
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

export interface StockCheckItem {
  id: string
  stock_check_id: string
  product_id: string
  system_quantity: number
  actual_quantity: number | null
  difference: number | null
  note: string | null
  products: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    unit: string
    cost_price: number
    categories: { name: string } | null
  }
}

interface StockCheckFormProps {
  items: StockCheckItem[]
  onUpdateItem: (productId: string, actualQuantity: number, note?: string) => Promise<void>
  onSubmit: () => void
  isUpdating: boolean
}

export function StockCheckForm({
  items,
  onUpdateItem,
  onSubmit,
  isUpdating,
}: StockCheckFormProps) {
  const t = useTranslations('inventory')
  const [search, setSearch] = useState('')
  // Local state for quantities being edited (productId -> quantity)
  const [localQuantities, setLocalQuantities] = useState<Record<string, number | null>>({})
  // Local state for notes being edited
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})
  // Track which items have pending changes
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set())
  // Track which items are currently saving
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search) return items
    const searchLower = search.toLowerCase()
    return items.filter(
      (item) =>
        item.products.name.toLowerCase().includes(searchLower) ||
        item.products.sku?.toLowerCase().includes(searchLower) ||
        item.products.barcode?.toLowerCase().includes(searchLower)
    )
  }, [items, search])

  // Get displayed quantity (local or server value)
  const getDisplayQuantity = useCallback(
    (item: StockCheckItem): number | null => {
      if (localQuantities[item.product_id] !== undefined) {
        return localQuantities[item.product_id]
      }
      return item.actual_quantity
    },
    [localQuantities]
  )

  // Calculate local difference for display
  const getLocalDifference = useCallback(
    (item: StockCheckItem): number | null => {
      const qty = getDisplayQuantity(item)
      if (qty === null) return null
      return qty - item.system_quantity
    },
    [getDisplayQuantity]
  )

  // Calculate progress using both server and local values
  const countedItems = useMemo(() => {
    return items.filter((item) => {
      const qty = localQuantities[item.product_id] !== undefined
        ? localQuantities[item.product_id]
        : item.actual_quantity
      return qty !== null
    }).length
  }, [items, localQuantities])

  const totalItems = items.length
  const progressPercent = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0

  // Calculate items with differences
  const itemsWithDifference = useMemo(() => {
    return items.filter((item) => {
      const qty = localQuantities[item.product_id] !== undefined
        ? localQuantities[item.product_id]
        : item.actual_quantity
      if (qty === null) return false
      const diff = qty - item.system_quantity
      return diff !== 0
    }).length
  }, [items, localQuantities])

  // Handle quantity change - only update local state
  const handleQuantityChange = useCallback((productId: string, value: number | null) => {
    setLocalQuantities((prev) => ({ ...prev, [productId]: value }))
    if (value !== null && value >= 0) {
      setPendingItems((prev) => new Set(prev).add(productId))
    }
  }, [])

  // Handle quantity blur - save to server
  const handleQuantityBlur = useCallback(
    async (item: StockCheckItem) => {
      const localQty = localQuantities[item.product_id]

      // Skip if no local change or invalid value
      if (localQty === undefined || localQty === null || localQty < 0) {
        return
      }

      // Skip if value hasn't changed from server
      if (localQty === item.actual_quantity) {
        setLocalQuantities((prev) => {
          const next = { ...prev }
          delete next[item.product_id]
          return next
        })
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
        return
      }

      // Save to server
      setSavingItems((prev) => new Set(prev).add(item.product_id))
      try {
        const note = localNotes[item.product_id]
        await onUpdateItem(item.product_id, localQty, note)
        // Clear local state after successful save
        setLocalQuantities((prev) => {
          const next = { ...prev }
          delete next[item.product_id]
          return next
        })
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
      } finally {
        setSavingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
      }
    },
    [localQuantities, localNotes, onUpdateItem]
  )

  // Handle note change - only update local state
  const handleNoteChange = useCallback((productId: string, note: string) => {
    setLocalNotes((prev) => ({ ...prev, [productId]: note }))
    setPendingItems((prev) => new Set(prev).add(productId))
  }, [])

  // Handle note blur - save to server if quantity exists
  const handleNoteBlur = useCallback(
    async (item: StockCheckItem) => {
      const localNote = localNotes[item.product_id]
      if (localNote === undefined) return

      const qty = localQuantities[item.product_id] !== undefined
        ? localQuantities[item.product_id]
        : item.actual_quantity

      if (qty === null) return

      // Skip if note hasn't changed
      if (localNote === (item.note || '')) {
        setLocalNotes((prev) => {
          const next = { ...prev }
          delete next[item.product_id]
          return next
        })
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
        return
      }

      setSavingItems((prev) => new Set(prev).add(item.product_id))
      try {
        await onUpdateItem(item.product_id, qty, localNote)
        setLocalNotes((prev) => {
          const next = { ...prev }
          delete next[item.product_id]
          return next
        })
        setPendingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
      } finally {
        setSavingItems((prev) => {
          const next = new Set(prev)
          next.delete(item.product_id)
          return next
        })
      }
    },
    [localNotes, localQuantities, onUpdateItem]
  )

  const getDifferenceDisplay = (item: StockCheckItem) => {
    const qty = getDisplayQuantity(item)
    const diff = getLocalDifference(item)
    const isSaving = savingItems.has(item.product_id)
    const isPending = pendingItems.has(item.product_id) && !isSaving

    if (isSaving) {
      return { icon: <SyncOutlined spin />, color: 'processing', text: t('saving') }
    }
    if (qty === null) {
      return { icon: <MinusCircleOutlined />, color: 'default', text: t('notChecked') }
    }
    if (diff === 0) {
      return {
        icon: <CheckCircleOutlined />,
        color: isPending ? 'processing' : 'success',
        text: isPending ? `${t('matched')} •` : t('matched')
      }
    }
    if (diff! > 0) {
      return {
        icon: <CloseCircleOutlined />,
        color: isPending ? 'processing' : 'warning',
        text: isPending ? `+${diff} •` : `+${diff}`,
      }
    }
    return {
      icon: <CloseCircleOutlined />,
      color: isPending ? 'processing' : 'error',
      text: isPending ? `${diff} •` : `${diff}`,
    }
  }

  // Handle Enter key to move to next item
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: StockCheckItem, index: number) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Trigger blur to save
        ;(e.target as HTMLInputElement).blur()
        // Focus next item's input
        const nextIndex = index + 1
        if (nextIndex < filteredItems.length) {
          setTimeout(() => {
            const nextInput = document.querySelector(
              `[data-product-id="${filteredItems[nextIndex].product_id}"] input`
            ) as HTMLInputElement
            nextInput?.focus()
            nextInput?.select()
          }, 100)
        }
      }
    },
    [filteredItems]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Progress Section */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <Text strong>{t('checkProgress')}</Text>
          <Text>
            {countedItems} / {totalItems} {t('productsLabel')}
          </Text>
        </div>
        <Progress
          percent={progressPercent}
          status={progressPercent === 100 ? 'success' : 'active'}
          strokeColor={progressPercent === 100 ? '#52c41a' : '#1890ff'}
        />
        <div className="flex justify-between mt-2 text-sm">
          <Text type="secondary">
            <CheckCircleOutlined className="text-green-500 mr-1" />
            {t('matched')}: {items.filter((i) => {
              const qty = localQuantities[i.product_id] !== undefined
                ? localQuantities[i.product_id]
                : i.actual_quantity
              if (qty === null) return false
              return qty - i.system_quantity === 0
            }).length}
          </Text>
          <Text type="secondary">
            <CloseCircleOutlined className="text-red-500 mr-1" />
            {t('difference')}: {itemsWithDifference}
          </Text>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder={t('searchProductSkuBarcode')}
        prefix={<SearchOutlined className="text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
        allowClear
      />

      {/* Product List */}
      <div className="flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          <Empty description={t('noProductsFound')} />
        ) : (
          <List
            dataSource={filteredItems}
            renderItem={(item, index) => {
              const status = getDifferenceDisplay(item)
              const displayQty = getDisplayQuantity(item)
              const localDiff = getLocalDifference(item)
              const isSaving = savingItems.has(item.product_id)

              return (
                <List.Item className="!px-0 !py-3 border-b">
                  <div className="w-full" data-product-id={item.product_id}>
                    {/* Product Info Row */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium truncate">{item.products.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.products.sku && <span>SKU: {item.products.sku}</span>}
                          {item.products.barcode && (
                            <span className="ml-2">| {item.products.barcode}</span>
                          )}
                        </div>
                        {item.products.categories && (
                          <Tag color="blue" className="mt-1 text-xs">
                            {item.products.categories.name}
                          </Tag>
                        )}
                      </div>
                      <Tag color={status.color as 'default' | 'success' | 'warning' | 'error' | 'processing'}>
                        {status.icon} {status.text}
                      </Tag>
                    </div>

                    {/* Quantity Row */}
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                      <div className="flex-1">
                        <Text type="secondary" className="text-xs block">
                          {t('systemQuantity')}
                        </Text>
                        <Text strong className="text-lg">
                          {item.system_quantity}{' '}
                          <span className="text-sm font-normal text-gray-500">
                            {item.products.unit}
                          </span>
                        </Text>
                      </div>
                      <div className="flex-1">
                        <Text type="secondary" className="text-xs block">
                          {t('actualQuantity')}
                        </Text>
                        <InputNumber
                          min={0}
                          value={displayQty}
                          onChange={(value) => handleQuantityChange(item.product_id, value)}
                          onBlur={() => handleQuantityBlur(item)}
                          onKeyDown={(e) => handleKeyDown(e, item, index)}
                          className="w-full"
                          placeholder={t('enterQuantity')}
                          disabled={isSaving}
                        />
                      </div>
                      {displayQty !== null && localDiff !== 0 && (
                        <div className="flex-1">
                          <Text type="secondary" className="text-xs block">
                            {t('difference')}
                          </Text>
                          <Text
                            strong
                            className={`text-lg ${
                              localDiff! > 0 ? 'text-orange-500' : 'text-red-500'
                            }`}
                          >
                            {localDiff! > 0 ? '+' : ''}
                            {localDiff}
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* Note Row - Show when there's a difference */}
                    {displayQty !== null && localDiff !== 0 && (
                      <div className="mt-2">
                        <Input
                          placeholder={t('notePlaceholderDifference')}
                          value={
                            localNotes[item.product_id] !== undefined
                              ? localNotes[item.product_id]
                              : item.note || ''
                          }
                          onChange={(e) => handleNoteChange(item.product_id, e.target.value)}
                          onBlur={() => handleNoteBlur(item)}
                          size="small"
                          disabled={isSaving}
                        />
                      </div>
                    )}

                    {/* Cost info */}
                    <div className="text-xs text-gray-400 mt-2">
                      {t('costPrice')}: {formatCurrency(item.products.cost_price)}
                      {displayQty !== null && localDiff !== 0 && (
                        <span className="ml-2">
                          | {t('adjustmentValue')}:{' '}
                          {formatCurrency(Math.abs(localDiff!) * item.products.cost_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t mt-4">
        <Button
          type="primary"
          block
          size="large"
          onClick={onSubmit}
          disabled={countedItems === 0 || pendingItems.size > 0}
          loading={isUpdating}
        >
          {pendingItems.size > 0
            ? t('savingChanges', { count: pendingItems.size })
            : t('viewSummaryAndComplete', { counted: countedItems, total: totalItems })
          }
        </Button>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Spin />
        </div>
      )}
    </div>
  )
}
