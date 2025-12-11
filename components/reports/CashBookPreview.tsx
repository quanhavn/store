'use client'

import { useState } from 'react'
import { Table, Typography, DatePicker, Button, Space, Spin, Empty, message } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api, type CashBookReport } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { exportCashBook } from '@/lib/reports/export-templates'
import { exportCashBookPDF } from '@/lib/reports/pdf-templates'
import { useTranslations } from 'next-intl'

const { Text } = Typography
const { RangePicker } = DatePicker

interface CashBookPreviewProps {
  storeInfo?: {
    name: string
    address?: string
  }
}

export function CashBookPreview({ storeInfo }: CashBookPreviewProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const storeName = storeInfo?.name || 'Cửa hàng'

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cash-book-report', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => api.reports.cashBook(
      dateRange[0].format('YYYY-MM-DD'),
      dateRange[1].format('YYYY-MM-DD')
    ),
  })

  const formatShortDate = (dateStr: string | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${day}/${month}`
    } catch {
      return dateStr
    }
  }

  const formatAmount = (amount: number) => {
    if (amount === 0) return '-'
    return formatCurrency(amount)
  }

  const handleExportExcel = () => {
    if (!data) return
    const period = `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`
    exportCashBook(data, storeName, period)
    message.success(tCommon('success'))
  }

  const handleExportPDF = async () => {
    if (!data) return
    setIsExportingPDF(true)
    try {
      await exportCashBookPDF(data, { name: storeName, address: storeInfo?.address })
      message.success(tCommon('success'))
    } catch (error) {
      console.error('PDF export error:', error)
      message.error(tCommon('error'))
    } finally {
      setIsExportingPDF(false)
    }
  }

  const columns = [
    {
      title: <div className="text-center font-bold">GHI SỔ</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">A</div>,
          dataIndex: 'record_date',
          key: 'record_date',
          width: 70,
          render: (v: string) => <div className="text-center">{formatShortDate(v)}</div>,
        },
      ],
    },
    {
      title: <div className="text-center font-bold">CHỨNG TỪ</div>,
      children: [
        {
          title: <div className="text-center">SỐ HIỆU</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">B</div>,
              dataIndex: 'voucher_no',
              key: 'voucher_no',
              width: 70,
              render: (_: unknown, r: { voucher_no_in?: string; voucher_no_out?: string }) => 
                <div className="text-center">{r.voucher_no_in || r.voucher_no_out || ''}</div>,
            },
          ],
        },
        {
          title: <div className="text-center">NGÀY, THÁNG</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">C</div>,
              dataIndex: 'voucher_date',
              key: 'voucher_date',
              width: 80,
              render: (v: string) => <div className="text-center">{formatShortDate(v)}</div>,
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-bold">DIỄN GIẢI</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">D</div>,
          dataIndex: 'description',
          key: 'description',
          ellipsis: true,
        },
      ],
    },
    {
      title: <div className="text-center font-bold">SỐ TIỀN</div>,
      children: [
        {
          title: <div className="text-center">THU</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">1</div>,
              dataIndex: 'debit',
              key: 'debit',
              width: 100,
              render: (v: number) => <div className="text-right">{v > 0 ? formatAmount(v) : '-'}</div>,
            },
          ],
        },
        {
          title: <div className="text-center">CHI</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">2</div>,
              dataIndex: 'credit',
              key: 'credit',
              width: 100,
              render: (v: number) => <div className="text-right">{v > 0 ? formatAmount(v) : '-'}</div>,
            },
          ],
        },
        {
          title: <div className="text-center">TỒN</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">3</div>,
              dataIndex: 'balance',
              key: 'balance',
              width: 110,
              render: (v: number) => <div className="text-right font-medium">{formatAmount(v)}</div>,
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-bold">GHI CHÚ</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">E</div>,
          dataIndex: 'note',
          key: 'note',
          width: 80,
          render: (v: string) => v || '',
        },
      ],
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="bg-white">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            {tCommon('refresh')}
          </Button>
        </Space>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            disabled={!data}
          >
            Excel
          </Button>
          <Button
            icon={isExportingPDF ? <LoadingOutlined /> : <FilePdfOutlined />}
            onClick={handleExportPDF}
            disabled={!data || isExportingPDF}
            loading={isExportingPDF}
          >
            PDF
          </Button>
        </Space>
      </div>

      {!data ? (
        <Empty description={tCommon('noData')} />
      ) : (
        <>
          {/* Header */}
          <div className="mb-4">
            <Text strong>HỘ, CÁ NHÂN KINH DOANH: {storeName}</Text>
            <br />
            <Text type="secondary">Địa chỉ: {storeInfo?.address || '...'}</Text>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <Text strong className="text-lg">SỔ QUỸ TIỀN MẶT</Text>
            <br />
            <Text>Loại quỹ: Tiền mặt</Text>
            <div className="flex justify-between mt-2">
              <Text type="secondary">Kỳ: {data.period.from} - {data.period.to}</Text>
              <Text type="secondary">ĐVT: Đồng</Text>
            </div>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={data.entries}
            rowKey="stt"
            size="small"
            pagination={false}
            bordered
            scroll={{ x: true }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-50">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text strong>- Số dư đầu kỳ</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{formatAmount(data.opening_balance || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
                <Table.Summary.Row className="bg-gray-100">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text strong>- Cộng số phát sinh trong kỳ</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatAmount(data.totals.total_debit)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{formatAmount(data.totals.total_credit)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
                <Table.Summary.Row className="bg-gray-100">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text strong>- Số dư cuối kỳ</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{formatAmount(data.totals.closing_balance)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          {/* Footer */}
          <div className="mt-6 text-sm text-gray-600">
            <div>- Sổ này có ... trang, đánh số từ trang 01 đến trang ...</div>
            <div>- Ngày mở sổ: ...</div>
          </div>

          {/* Signature */}
          <div className="flex justify-between mt-8 text-center">
            <div>
              <Text strong>Người lập biểu</Text>
              <br />
              <Text type="secondary">(Ký, họ tên)</Text>
            </div>
            <div>
              <Text type="secondary">Ngày ... tháng ... năm ...</Text>
              <br />
              <Text strong>Người đại diện HKD/Cá nhân KD</Text>
              <br />
              <Text type="secondary">(Ký, họ tên, đóng dấu)</Text>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
