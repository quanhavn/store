'use client'

import { Drawer, Table, Typography, Spin, Empty, Button, Space, Card } from 'antd'
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Title, Text } = Typography

interface ReportPreviewProps {
  open: boolean
  onClose: () => void
  reportType: string
  dateFrom: string
  dateTo: string
}

export function ReportPreview({ open, onClose, reportType, dateFrom, dateTo }: ReportPreviewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType, dateFrom, dateTo],
    queryFn: async () => {
      switch (reportType) {
        case 'revenue':
          return api.reports.revenueBook(dateFrom, dateTo)
        case 'cash':
          return api.reports.cashBook(dateFrom, dateTo)
        case 'bank':
          return api.reports.bankBook(dateFrom, dateTo)
        case 'expense':
          return api.reports.expenseBook(dateFrom, dateTo)
        case 'inventory':
          return api.reports.inventoryBook(dateFrom, dateTo)
        default:
          return null
      }
    },
    enabled: open && !!reportType,
  })

  const getReportTitle = () => {
    switch (reportType) {
      case 'revenue': return 'SO DOANH THU'
      case 'cash': return 'SO TIEN MAT'
      case 'bank': return 'SO TIEN GUI NGAN HANG'
      case 'expense': return 'SO CHI PHI'
      case 'inventory': return 'SO TON KHO'
      default: return 'BAO CAO'
    }
  }

  const getColumns = () => {
    switch (reportType) {
      case 'revenue':
        return [
          { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: 'Ngay', dataIndex: 'date', key: 'date', width: 100 },
          { title: 'So HD', dataIndex: 'invoice_no', key: 'invoice_no', width: 100 },
          { title: 'Khach hang', dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
          {
            title: 'Tong tien',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'cash':
        return [
          { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: 'Ngay', dataIndex: 'date', key: 'date', width: 100 },
          { title: 'Dien giai', dataIndex: 'description', key: 'description', ellipsis: true },
          {
            title: 'Thu',
            dataIndex: 'debit',
            key: 'debit',
            width: 100,
            align: 'right' as const,
            render: (v: number) => v > 0 ? formatCurrency(v) : '-',
          },
          {
            title: 'Chi',
            dataIndex: 'credit',
            key: 'credit',
            width: 100,
            align: 'right' as const,
            render: (v: number) => v > 0 ? formatCurrency(v) : '-',
          },
          {
            title: 'Ton',
            dataIndex: 'balance',
            key: 'balance',
            width: 110,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'expense':
        return [
          { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: 'Ngay', dataIndex: 'date', key: 'date', width: 100 },
          { title: 'Loai', dataIndex: 'category', key: 'category', width: 100 },
          { title: 'Dien giai', dataIndex: 'description', key: 'description', ellipsis: true },
          {
            title: 'So tien',
            dataIndex: 'amount',
            key: 'amount',
            width: 120,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'inventory':
        return [
          { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: 'Ngay', dataIndex: 'date', key: 'date', width: 100 },
          { title: 'San pham', dataIndex: 'product_name', key: 'product_name', ellipsis: true },
          { title: 'Loai', dataIndex: 'movement_type', key: 'movement_type', width: 80 },
          { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 60, align: 'right' as const },
          { title: 'Ton', dataIndex: 'after_quantity', key: 'after_quantity', width: 60, align: 'right' as const },
        ]
      default:
        return []
    }
  }

  const getDataSource = () => {
    if (!data) return []

    if ('entries' in data) {
      return data.entries
    }

    return []
  }

  const getTotals = () => {
    if (!data || !('totals' in data)) return null
    return data.totals
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={getReportTitle()}
      placement="bottom"
      height="90%"
      extra={
        <Space>
          <Button icon={<FileExcelOutlined />} size="small">
            Excel
          </Button>
          <Button icon={<FilePdfOutlined />} size="small">
            PDF
          </Button>
        </Space>
      }
    >
      <div className="text-center mb-4">
        <Text type="secondary">
          Ky: {dateFrom} - {dateTo}
        </Text>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : !data ? (
        <Empty description="Khong co du lieu" />
      ) : (
        <>
          <Table
            dataSource={getDataSource() as Record<string, unknown>[]}
            columns={getColumns() as { title: string; dataIndex: string; key: string }[]}
            rowKey="stt"
            size="small"
            pagination={false}
            scroll={{ x: true }}
          />

          {getTotals() && (
            <Card size="small" className="mt-4 bg-gray-50">
              <Title level={5} className="!mb-2">Tong cong</Title>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(getTotals() || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <Text type="secondary">{key.replace(/_/g, ' ')}:</Text>
                    <Text strong>
                      {typeof value === 'number' ? formatCurrency(value) : value}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Drawer>
  )
}
