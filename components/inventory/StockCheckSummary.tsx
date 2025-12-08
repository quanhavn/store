'use client'

import { useMemo } from 'react'
import { Button, List, Tag, Typography, Divider, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/utils'
import type { StockCheckItem } from './StockCheckForm'

const { Text, Title } = Typography

interface StockCheckSummaryProps {
  items: StockCheckItem[]
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function StockCheckSummary({
  items,
  onConfirm,
  onBack,
  isSubmitting,
}: StockCheckSummaryProps) {
  const t = useTranslations('inventory')
  const tCommon = useTranslations('common')

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalItems = items.length
    const countedItems = items.filter((i) => i.actual_quantity !== null).length
    const uncountedItems = totalItems - countedItems
    const matchingItems = items.filter(
      (i) => i.actual_quantity !== null && i.difference === 0
    ).length
    const itemsWithDifference = items.filter(
      (i) => i.actual_quantity !== null && i.difference !== 0
    )
    const positiveAdjustments = itemsWithDifference.filter((i) => i.difference! > 0)
    const negativeAdjustments = itemsWithDifference.filter((i) => i.difference! < 0)

    const totalPositiveValue = positiveAdjustments.reduce(
      (sum, i) => sum + i.difference! * i.products.cost_price,
      0
    )
    const totalNegativeValue = negativeAdjustments.reduce(
      (sum, i) => sum + Math.abs(i.difference!) * i.products.cost_price,
      0
    )
    const netAdjustmentValue = totalPositiveValue - totalNegativeValue

    return {
      totalItems,
      countedItems,
      uncountedItems,
      matchingItems,
      itemsWithDifference,
      positiveAdjustments,
      negativeAdjustments,
      totalPositiveValue,
      totalNegativeValue,
      netAdjustmentValue,
    }
  }, [items])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="mb-2"
        >
          {tCommon('back')}
        </Button>
        <Title level={5} className="!mb-0">
          {t('stockCheckSummary')}
        </Title>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <Text type="secondary" className="text-xs">
            {t('totalProducts')}
          </Text>
          <div className="text-xl font-bold text-blue-600">{summary.totalItems}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <Text type="secondary" className="text-xs">
            {t('checked')}
          </Text>
          <div className="text-xl font-bold text-green-600">{summary.countedItems}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <Text type="secondary" className="text-xs">
            <CheckCircleOutlined className="mr-1" />
            {t('quantityMatched')}
          </Text>
          <div className="text-xl font-bold text-gray-600">{summary.matchingItems}</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <Text type="secondary" className="text-xs">
            <CloseCircleOutlined className="mr-1" />
            {t('hasDifference')}
          </Text>
          <div className="text-xl font-bold text-red-600">
            {summary.itemsWithDifference.length}
          </div>
        </div>
      </div>

      {/* Uncounted Warning */}
      {summary.uncountedItems > 0 && (
        <Alert
          type="warning"
          icon={<ExclamationCircleOutlined />}
          message={t('uncheckedWarning', { count: summary.uncountedItems })}
          description={t('uncheckedWarningDescription')}
          className="mb-4"
          showIcon
        />
      )}

      {/* Adjustment Value Summary */}
      {summary.itemsWithDifference.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <Text strong className="block mb-2">
            {t('adjustmentValue')}
          </Text>
          <div className="space-y-1">
            {summary.positiveAdjustments.length > 0 && (
              <div className="flex justify-between text-sm">
                <Text type="secondary">{t('increase')} ({summary.positiveAdjustments.length} SP):</Text>
                <Text className="text-orange-500">+{formatCurrency(summary.totalPositiveValue)}</Text>
              </div>
            )}
            {summary.negativeAdjustments.length > 0 && (
              <div className="flex justify-between text-sm">
                <Text type="secondary">{t('decrease')} ({summary.negativeAdjustments.length} SP):</Text>
                <Text className="text-red-500">-{formatCurrency(summary.totalNegativeValue)}</Text>
              </div>
            )}
            <Divider className="!my-2" />
            <div className="flex justify-between">
              <Text strong>{t('netDifference')}:</Text>
              <Text
                strong
                className={summary.netAdjustmentValue >= 0 ? 'text-orange-500' : 'text-red-500'}
              >
                {summary.netAdjustmentValue >= 0 ? '+' : ''}
                {formatCurrency(summary.netAdjustmentValue)}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Items with Differences List */}
      {summary.itemsWithDifference.length > 0 && (
        <div className="flex-1 overflow-auto mb-4">
          <Text strong className="block mb-2">
            {t('differenceDetail')}
          </Text>
          <List
            size="small"
            dataSource={summary.itemsWithDifference}
            renderItem={(item) => (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium block truncate">
                        {item.products.name}
                      </Text>
                      <Text type="secondary" className="text-xs">
                        {item.products.sku && `SKU: ${item.products.sku}`}
                      </Text>
                    </div>
                    <div className="text-right ml-2">
                      <Tag color={item.difference! > 0 ? 'orange' : 'red'}>
                        {item.difference! > 0 ? '+' : ''}
                        {item.difference} {item.products.unit}
                      </Tag>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      {t('system')}: {item.system_quantity} | {t('actual')}: {item.actual_quantity}
                    </span>
                    <span>
                      {formatCurrency(Math.abs(item.difference!) * item.products.cost_price)}
                    </span>
                  </div>
                  {item.note && (
                    <Text type="secondary" className="text-xs block mt-1 italic">
                      {t('noteLabel')}: {item.note}
                    </Text>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* No Differences Message */}
      {summary.itemsWithDifference.length === 0 && summary.countedItems > 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
            <Title level={5}>{t('allMatched')}</Title>
            <Text type="secondary">
              {t('noAdjustmentNeeded')}
            </Text>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t space-y-2">
        <Button
          type="primary"
          block
          size="large"
          onClick={onConfirm}
          loading={isSubmitting}
          danger={summary.itemsWithDifference.length > 0}
        >
          {summary.itemsWithDifference.length > 0
            ? t('confirmAdjustProducts', { count: summary.itemsWithDifference.length })
            : t('completeStockCheck')}
        </Button>
        <Button block onClick={onBack} disabled={isSubmitting}>
          {t('backToEdit')}
        </Button>
      </div>
    </div>
  )
}
