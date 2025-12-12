'use client'

import { useState, useMemo } from 'react'
import { List, Empty, Tag, Typography, Spin, DatePicker, Select, Button, Collapse } from 'antd'
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  SwapOutlined,
  ShoppingCartOutlined,
  RollbackOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import dayjs, { Dayjs } from 'dayjs'
import { api, InventoryLog } from '@/lib/supabase/functions'
import { formatDateTime } from '@/lib/utils'

const { Text } = Typography
const { RangePicker } = DatePicker

type LogType = 'import' | 'export' | 'sale' | 'return' | 'adjustment'

const TYPE_CONFIG: Record<LogType, { color: string; icon: React.ReactNode }> = {
  import: { color: 'green', icon: <PlusCircleOutlined /> },
  export: { color: 'orange', icon: <MinusCircleOutlined /> },
  sale: { color: 'blue', icon: <ShoppingCartOutlined /> },
  return: { color: 'purple', icon: <RollbackOutlined /> },
  adjustment: { color: 'default', icon: <SwapOutlined /> },
}

interface GroupedLog {
  id: string
  type: LogType
  created_at: string
  note: string | null
  reference_id: string | null
  items: InventoryLog[]
  totalQuantity: number
}

function groupLogs(logs: InventoryLog[]): GroupedLog[] {
  const groups: Map<string, GroupedLog> = new Map()

  logs.forEach((log) => {
    const timestamp = dayjs(log.created_at).format('YYYY-MM-DD HH:mm')
    const groupKey = log.reference_id || `${log.type}-${timestamp}-${log.created_by || 'unknown'}`

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!
      group.items.push(log)
      group.totalQuantity += Math.abs(log.quantity)
    } else {
      groups.set(groupKey, {
        id: groupKey,
        type: log.type as LogType,
        created_at: log.created_at,
        note: log.note,
        reference_id: log.reference_id,
        items: [log],
        totalQuantity: Math.abs(log.quantity),
      })
    }
  })

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function InventoryHistory() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const pageSize = 50

  const t = useTranslations('inventory')
  const tCommon = useTranslations('common')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory-logs', page, typeFilter, dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: async () => {
      const params: {
        type?: string
        date_from?: string
        date_to?: string
        page?: number
        limit?: number
      } = {
        page,
        limit: pageSize,
      }

      if (typeFilter) {
        params.type = typeFilter
      }

      if (dateRange?.[0]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD')
      }

      if (dateRange?.[1]) {
        params.date_to = dateRange[1].format('YYYY-MM-DD')
      }

      return api.inventory.logs(params)
    },
  })

  const logs = data?.logs || []
  const pagination = data?.pagination
  const groupedLogs = useMemo(() => groupLogs(logs), [logs])

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type as LogType] || { color: 'default', icon: <SwapOutlined /> }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'import':
        return t('stockIn')
      case 'export':
        return t('stockOut')
      case 'sale':
        return t('history.sale')
      case 'return':
        return t('history.return')
      case 'adjustment':
        return t('adjustment')
      default:
        return type
    }
  }

  const handleClearFilters = () => {
    setDateRange(null)
    setTypeFilter(undefined)
    setPage(1)
  }

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const hasFilters = dateRange || typeFilter

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          <Select
            placeholder={t('history.filterByType')}
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
            allowClear
            className="flex-1 min-w-[120px]"
            options={[
              { value: 'import', label: t('stockIn') },
              { value: 'export', label: t('stockOut') },
              { value: 'sale', label: t('history.sale') },
              { value: 'return', label: t('history.return') },
              { value: 'adjustment', label: t('adjustment') },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates)
              setPage(1)
            }}
            className="flex-1"
            placeholder={[t('history.startDate'), t('history.endDate')]}
          />
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button
              size="small"
              icon={<FilterOutlined />}
              onClick={handleClearFilters}
            >
              {t('history.clearFilters')}
            </Button>
          )}
          <Button
            size="small"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            {tCommon('refresh')}
          </Button>
        </div>
      </div>

      {groupedLogs.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('history.noLogs')}
          className="my-8"
        />
      ) : (
        <>
          <List
            dataSource={groupedLogs}
            renderItem={(group: GroupedLog) => {
              const config = getTypeConfig(group.type)
              const isPositive = group.type === 'import' || group.type === 'return'
              const isExpanded = expandedGroups.has(group.id)
              const hasMultipleItems = group.items.length > 1

              return (
                <List.Item className="!px-0 !block">
                  <div className="w-full">
                    <div
                      className={`flex justify-between items-start ${hasMultipleItems ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded' : ''}`}
                      onClick={() => hasMultipleItems && toggleExpanded(group.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasMultipleItems && (
                            <span className="text-gray-400">
                              {isExpanded ? <DownOutlined className="text-xs" /> : <RightOutlined className="text-xs" />}
                            </span>
                          )}
                          <Tag color={config.color} icon={config.icon}>
                            {getTypeLabel(group.type)}
                          </Tag>
                          <span className="text-sm text-gray-600">
                            {group.items.length} {t('history.products')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 ml-5">
                          {formatDateTime(group.created_at)}
                        </div>
                        {group.note && (
                          <div className="text-xs text-gray-400 mt-1 ml-5 truncate">
                            {group.note}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{group.totalQuantity}
                        </div>
                      </div>
                    </div>

                    {isExpanded && hasMultipleItems && (
                      <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-3">
                        {group.items.map((item) => {
                          const unitName = item.product_units?.unit_name || item.products?.unit || ''
                          const variantName = item.product_variants?.name
                          return (
                            <div key={item.id} className="py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {item.products?.name || t('history.unknownProduct')}
                                  </div>
                                  {variantName && (
                                    <Tag color="blue" className="text-xs mt-1">{variantName}</Tag>
                                  )}
                                  {item.note && item.note !== group.note && (
                                    <div className="text-xs text-gray-400 truncate mt-1">
                                      {item.note}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? '+' : '-'}{Math.abs(item.quantity)} {unitName}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {!hasMultipleItems && (
                      <div className="ml-5 mt-1 flex items-center gap-2">
                        <Text className="text-sm">
                          {group.items[0]?.products?.name || t('history.unknownProduct')}
                        </Text>
                        {group.items[0]?.product_variants?.name && (
                          <Tag color="blue" className="text-xs">{group.items[0].product_variants.name}</Tag>
                        )}
                        <Text type="secondary" className="text-xs">
                          {group.items[0]?.product_units?.unit_name || group.items[0]?.products?.unit || ''}
                        </Text>
                      </div>
                    )}
                  </div>
                </List.Item>
              )
            }}
          />

          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {tCommon('previous')}
              </Button>
              <Text className="self-center">
                {page} / {pagination.total_pages}
              </Text>
              <Button
                size="small"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tCommon('next')}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="bg-gray-50 p-3 rounded-lg mt-4">
        <Text type="secondary" className="text-xs">
          {t('history.info')}
        </Text>
      </div>
    </div>
  )
}
