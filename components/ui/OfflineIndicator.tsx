'use client'

import { Alert, Badge, Button, Tooltip, Space, message as antMessage } from 'antd'
import {
  WifiOutlined,
  CloudSyncOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOnlineStatus, usePendingSalesCount, useSyncStatus } from '@/lib/offline/hooks'
import { performFullSync } from '@/lib/offline/sync'

interface OfflineIndicatorProps {
  showBanner?: boolean
  showSyncButton?: boolean
  compact?: boolean
  onSyncComplete?: () => void
}

/**
 * Offline indicator component that shows:
 * - Banner when offline
 * - Pending sales count badge
 * - Sync button to manually trigger sync
 */
export function OfflineIndicator({
  showBanner = true,
  showSyncButton = true,
  compact = false,
  onSyncComplete,
}: OfflineIndicatorProps) {
  const t = useTranslations('common')
  const isOnline = useOnlineStatus()
  const { count: pendingSalesCount, refresh: refreshPendingCount } = usePendingSalesCount()
  const { status } = useSyncStatus()
  const [syncing, setSyncing] = useState(false)

  const handleSync = useCallback(async () => {
    if (!isOnline) {
      antMessage.warning(t('noNetworkConnection'))
      return
    }

    try {
      setSyncing(true)
      antMessage.loading({ content: t('syncing'), key: 'sync' })

      const result = await performFullSync()

      // Refresh pending count
      await refreshPendingCount()

      if (result.sales.synced > 0) {
        antMessage.success({
          content: t('syncedOrders', { count: result.sales.synced }),
          key: 'sync',
        })
      } else if (result.products.success) {
        antMessage.success({
          content: t('updatedProducts', { count: result.products.count }),
          key: 'sync',
        })
      } else {
        antMessage.info({ content: t('noDataToSync'), key: 'sync' })
      }

      if (result.sales.failed > 0) {
        antMessage.warning(t('syncFailedOrders', { count: result.sales.failed }))
      }

      onSyncComplete?.()
    } catch (error) {
      console.error('Sync error:', error)
      antMessage.error({
        content: t('syncFailed'),
        key: 'sync',
      })
    } finally {
      setSyncing(false)
    }
  }, [isOnline, refreshPendingCount, onSyncComplete, t])

  // Compact mode - just show icons/badges
  if (compact) {
    return (
      <Space size="small">
        <Tooltip title={isOnline ? t('online') : t('offline')}>
          <Badge
            status={isOnline ? 'success' : 'error'}
            text={
              <WifiOutlined
                style={{
                  color: isOnline ? '#52c41a' : '#ff4d4f',
                  fontSize: 16,
                }}
              />
            }
          />
        </Tooltip>

        {pendingSalesCount > 0 && (
          <Tooltip title={t('pendingOrdersToSync', { count: pendingSalesCount })}>
            <Badge count={pendingSalesCount} size="small">
              <CloudSyncOutlined style={{ fontSize: 16, color: '#faad14' }} />
            </Badge>
          </Tooltip>
        )}

        {showSyncButton && isOnline && (
          <Tooltip title={t('syncData')}>
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined spin={syncing} />}
              onClick={handleSync}
              loading={syncing}
            />
          </Tooltip>
        )}
      </Space>
    )
  }

  return (
    <div className="offline-indicator">
      {/* Offline Banner */}
      {showBanner && !isOnline && (
        <Alert
          type="warning"
          message={t('networkDisconnected')}
          description={t('offlineDescription')}
          icon={<ExclamationCircleOutlined />}
          showIcon
          banner
          className="mb-4"
        />
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge status="success" />
            ) : (
              <Badge status="error" />
            )}
            <span className="text-sm text-gray-600">
              {isOnline ? t('online') : t('offline')}
            </span>
          </div>

          {/* Pending Sales */}
          {pendingSalesCount > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 rounded">
              <Badge count={pendingSalesCount} size="small" />
              <span className="text-sm text-yellow-700">
                {t('ordersWaitingSync')}
              </span>
            </div>
          )}

          {/* Failed Syncs */}
          {status.failedSyncCount > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded">
              <ExclamationCircleOutlined className="text-red-500" />
              <span className="text-sm text-red-700">
                {t('syncErrors', { count: status.failedSyncCount })}
              </span>
            </div>
          )}

          {/* Last Sync Time */}
          {status.lastProductsSync && (
            <Tooltip
              title={t('productsSyncedAt', { time: new Date(status.lastProductsSync).toLocaleString('vi-VN') })}
            >
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CheckCircleOutlined />
                <span>
                  {formatRelativeTime(new Date(status.lastProductsSync), t)}
                </span>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Sync Button */}
        {showSyncButton && (
          <Button
            type={pendingSalesCount > 0 ? 'primary' : 'default'}
            size="small"
            icon={<SyncOutlined spin={syncing} />}
            onClick={handleSync}
            loading={syncing}
            disabled={!isOnline}
          >
            {pendingSalesCount > 0 ? t('syncWithCount', { count: pendingSalesCount }) : t('sync')}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Minimal offline status badge for headers/navs
 */
export function OfflineStatusBadge() {
  const t = useTranslations('common')
  const isOnline = useOnlineStatus()
  const { count: pendingSalesCount } = usePendingSalesCount()

  if (isOnline && pendingSalesCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge status="error" text={t('offline')} />
      )}
      {pendingSalesCount > 0 && (
        <Badge count={pendingSalesCount} size="small" title={t('ordersWaitingSync')} />
      )}
    </div>
  )
}

// Helper function to format relative time
function formatRelativeTime(date: Date, t: (key: string, values?: Record<string, number>) => string): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('justNow')
  if (minutes < 60) return t('minutesAgo', { count: minutes })
  if (hours < 24) return t('hoursAgo', { count: hours })
  return t('daysAgo', { count: days })
}
