'use client'

import { useState } from 'react'
import { List, Tag, Empty, Spin, Typography, Button, Select, DatePicker } from 'antd'
import { FileTextOutlined, PlusOutlined, InboxOutlined, FilterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Invoice } from '@/lib/supabase/functions'
import { formatCurrency, formatDate } from '@/lib/utils'
import dayjs from 'dayjs'

const { Text } = Typography

interface InvoiceListProps {
  onSelect?: (invoice: Invoice) => void
  onCreateNew?: () => void
  limit?: number
}

export function InvoiceList({ onSelect, onCreateNew, limit = 20 }: InvoiceListProps) {
  const t = useTranslations('invoices')
  const tCommon = useTranslations('common')

  const statusConfig: Record<string, { color: string; label: string }> = {
    issued: { color: 'green', label: t('invoiceStatus.issued') },
    cancelled: { color: 'red', label: t('invoiceStatus.cancelled') },
    pending: { color: 'gold', label: t('invoiceStatus.pending') },
    error: { color: 'red', label: t('invoiceStatus.error') },
  }

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, limit, statusFilter, dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: () => api.invoice.list({
      page,
      limit,
      status: statusFilter as 'pending' | 'issued' | 'cancelled' | 'error' | undefined,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
  })

  const invoices = data?.invoices || []
  const pagination = data?.pagination

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button
          icon={<FilterOutlined />}
          onClick={() => setShowFilters(!showFilters)}
          type={showFilters ? 'primary' : 'default'}
        >
          {tCommon('filter')}
        </Button>
        {onCreateNew && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateNew}
          >
            {t('createInvoice')}
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Text type="secondary" className="text-sm mb-1 block">{t('status')}</Text>
            <Select
              className="w-full"
              placeholder={t('allStatuses')}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'issued', label: t('invoiceStatus.issued') },
                { value: 'pending', label: t('invoiceStatus.pending') },
                { value: 'cancelled', label: t('invoiceStatus.cancelled') },
                { value: 'error', label: t('invoiceStatus.error') },
              ]}
            />
          </div>
          <div>
            <Text type="secondary" className="text-sm mb-1 block">{t('period')}</Text>
            <DatePicker.RangePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
            />
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <Empty
          image={<InboxOutlined className="text-5xl text-gray-300" />}
          description={t('noInvoicesYet')}
        >
          {onCreateNew && (
            <Button type="primary" onClick={onCreateNew}>
              {t('createFirstInvoice')}
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <List
            dataSource={invoices}
            renderItem={(invoice: Invoice) => {
              const status = statusConfig[invoice.status] || { color: 'default', label: invoice.status }
              const sale = invoice.sales as { invoice_no?: string; customer_name?: string; total?: number } | null

              return (
                <List.Item
                  className="!px-0 !py-3 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => onSelect?.(invoice)}
                >
                  <div className="w-full flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileTextOutlined className="text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {invoice.invoice_no || sale?.invoice_no || t('awaitingNumber')}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Tag color={status.color} className="text-xs m-0">
                          {status.label}
                        </Tag>
                        {sale?.customer_name && (
                          <Text type="secondary" className="text-xs truncate max-w-[120px]">
                            {sale.customer_name}
                          </Text>
                        )}
                        <Text type="secondary" className="text-xs">
                          {formatDate(invoice.issue_date || invoice.created_at)}
                        </Text>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(sale?.total || 0)}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />

          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t('prev')}
              </Button>
              <span className="py-1 px-3 bg-gray-100 rounded">
                {page} / {pagination.total_pages}
              </span>
              <Button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage(p => p + 1)}
              >
                {t('nextPage')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
