'use client'

import { useState, useEffect } from 'react'
import { Button, Badge, Typography, Tooltip } from 'antd'
import { SyncOutlined, CloudOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { formatDateTime } from '@/lib/utils'

const { Text } = Typography

interface InvoiceSyncStatusProps {
  onSyncComplete?: () => void
}

export function InvoiceSyncStatus({ onSyncComplete }: InvoiceSyncStatusProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const queryClient = useQueryClient()

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['invoices', 'pending-count'],
    queryFn: async () => {
      const result = await api.invoice.list({ status: 'pending', limit: 100 })
      return { count: result.invoices.length }
    },
    refetchInterval: 30000,
  })

  const pendingCount = pendingData?.count || 0

  const syncMutation = useMutation({
    mutationFn: async () => {
      const pendingInvoices = await api.invoice.list({ status: 'pending', limit: 50 })
      
      const results = await Promise.allSettled(
        pendingInvoices.invoices.map((inv) => 
          api.invoice.create({ sale_id: inv.sale_id })
        )
      )
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      return { successful, failed, total: results.length }
    },
    onSuccess: (data) => {
      setLastSyncTime(new Date())
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onSyncComplete?.()
    },
  })

  useEffect(() => {
    const savedTime = localStorage.getItem('invoice_last_sync')
    if (savedTime) {
      setLastSyncTime(new Date(savedTime))
    }
  }, [])

  useEffect(() => {
    if (lastSyncTime) {
      localStorage.setItem('invoice_last_sync', lastSyncTime.toISOString())
    }
  }, [lastSyncTime])

  const getStatusIcon = () => {
    if (isLoading || syncMutation.isPending) {
      return <SyncOutlined spin className="text-blue-500" />
    }
    if (pendingCount > 0) {
      return <WarningOutlined className="text-yellow-500" />
    }
    return <CheckCircleOutlined className="text-green-500" />
  }

  const getStatusText = () => {
    if (syncMutation.isPending) {
      return t('syncing')
    }
    if (pendingCount > 0) {
      return t('pendingCount', { count: pendingCount })
    }
    return t('synced')
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <CloudOutlined className="text-gray-600 text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Text strong>{getStatusText()}</Text>
            </div>
            {lastSyncTime && (
              <Text type="secondary" className="text-xs">
                {t('lastSync')}: {formatDateTime(lastSyncTime)}
              </Text>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge count={pendingCount} size="small" />
          )}
          <Tooltip title={t('syncTooltip')}>
            <Button
              icon={<SyncOutlined spin={syncMutation.isPending} />}
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
              disabled={pendingCount === 0 || isLoading}
            >
              {tCommon('sync')}
            </Button>
          </Tooltip>
        </div>
      </div>

      {syncMutation.isSuccess && syncMutation.data && (
        <div className="mt-3 bg-green-50 text-green-700 p-2 rounded text-sm">
          {t('syncComplete', { successful: syncMutation.data.successful, total: syncMutation.data.total })}
          {syncMutation.data.failed > 0 && (
            <span className="text-red-600 ml-2">
              ({syncMutation.data.failed} {t('invoiceStatus.error').toLowerCase()})
            </span>
          )}
        </div>
      )}

      {syncMutation.isError && (
        <div className="mt-3 bg-red-50 text-red-700 p-2 rounded text-sm">
          {t('syncError')}: {syncMutation.error instanceof Error ? syncMutation.error.message : t('errorOccurred')}
        </div>
      )}
    </div>
  )
}
