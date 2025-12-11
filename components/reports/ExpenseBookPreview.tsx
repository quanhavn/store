'use client'

import { useState } from 'react'
import { Table, Typography, DatePicker, Button, Space, Spin, Empty, message } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api, type ExpenseBookReport } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { exportExpenseBookExcel } from '@/lib/reports/expense-book-export'
import { exportExpenseBookPDFNew } from '@/lib/reports/expense-book-export'
import { useTranslations } from 'next-intl'

const { Text } = Typography
const { RangePicker } = DatePicker

interface ExpenseBookPreviewProps {
  storeInfo?: {
    name: string
    address?: string
  }
}

const EXPENSE_CATEGORIES = [
  { key: 'labor', label: 'CHI PHÍ NHÂN CÔNG', code: 'LABOR' },
  { key: 'electricity', label: 'CHI PHÍ ĐIỆN', code: 'ELECTRICITY' },
  { key: 'water', label: 'CHI PHÍ NƯỚC', code: 'WATER' },
  { key: 'telecom', label: 'CHI PHÍ VIỄN THÔNG', code: 'TELECOM' },
  { key: 'rent', label: 'CHI PHÍ THUÊ KHO BÃI, MẶT BẰNG KINH DOANH', code: 'RENT' },
  { key: 'admin', label: 'CHI PHÍ QUẢN LÝ', code: 'ADMIN' },
  { key: 'other', label: 'CHI PHÍ KHÁC', code: 'OTHER' },
]

interface ProcessedEntry {
  stt: number
  record_date: string
  voucher_no: string
  voucher_date: string
  description: string
  total_amount: number
  labor: number
  electricity: number
  water: number
  telecom: number
  rent: number
  admin: number
  other: number
}

function processExpenseData(data: ExpenseBookReport): { entries: ProcessedEntry[]; totals: Record<string, number> } {
  const totals = {
    total_amount: 0,
    labor: 0,
    electricity: 0,
    water: 0,
    telecom: 0,
    rent: 0,
    admin: 0,
    other: 0,
  }

  const entries: ProcessedEntry[] = data.entries.map((entry, index) => {
    const categoryCode = (entry.category_code || '').toUpperCase()
    const amount = entry.amount || 0

    const processed: ProcessedEntry = {
      stt: index + 1,
      record_date: entry.date,
      voucher_no: entry.invoice_no || '',
      voucher_date: entry.date,
      description: entry.description,
      total_amount: amount,
      labor: categoryCode === 'LABOR' ? amount : 0,
      electricity: categoryCode === 'ELECTRICITY' ? amount : 0,
      water: categoryCode === 'WATER' ? amount : 0,
      telecom: categoryCode === 'TELECOM' ? amount : 0,
      rent: categoryCode === 'RENT' ? amount : 0,
      admin: categoryCode === 'ADMIN' ? amount : 0,
      other: !['LABOR', 'ELECTRICITY', 'WATER', 'TELECOM', 'RENT', 'ADMIN'].includes(categoryCode) ? amount : 0,
    }

    totals.total_amount += amount
    totals.labor += processed.labor
    totals.electricity += processed.electricity
    totals.water += processed.water
    totals.telecom += processed.telecom
    totals.rent += processed.rent
    totals.admin += processed.admin
    totals.other += processed.other

    return processed
  })

  return { entries, totals }
}

export function ExpenseBookPreview({ storeInfo }: ExpenseBookPreviewProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const storeName = storeInfo?.name || 'Cửa hàng'

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['expense-book-report', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => api.reports.expenseBook(
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

  const { entries, totals } = data ? processExpenseData(data) : { entries: [], totals: {} }

  const handleExportExcel = () => {
    if (!data) return
    const period = `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`
    const year = dateRange[0].year()
    exportExpenseBookExcel(
      { entries, totals, period: data.period },
      { name: storeName, address: storeInfo?.address },
      year
    )
    message.success(tCommon('success'))
  }

  const handleExportPDF = async () => {
    if (!data) return
    setIsExportingPDF(true)
    try {
      await exportExpenseBookPDFNew(
        { entries, totals, period: data.period },
        { name: storeName, address: storeInfo?.address },
        dateRange[0].year()
      )
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
      title: <div className="text-center font-bold">NGÀY, THÁNG<br/>GHI SỔ</div>,
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
              render: (v: string) => <div className="text-center">{v || ''}</div>,
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
          width: 150,
          ellipsis: true,
        },
      ],
    },
    {
      title: <div className="text-center font-bold">TẬP HỢP CHI PHÍ THEO CÁC YẾU TỐ SẢN XUẤT, KINH DOANH</div>,
      children: [
        {
          title: <div className="text-center">TỔNG SỐ TIỀN</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">1</div>,
              dataIndex: 'total_amount',
              key: 'total_amount',
              width: 100,
              render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
            },
          ],
        },
        {
          title: <div className="text-center">CHIA RA</div>,
          children: [
            {
              title: <div className="text-center text-xs">NHÂN CÔNG</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">2</div>,
                  dataIndex: 'labor',
                  key: 'labor',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">ĐIỆN</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">3</div>,
                  dataIndex: 'electricity',
                  key: 'electricity',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">NƯỚC</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">4</div>,
                  dataIndex: 'water',
                  key: 'water',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">VIỄN THÔNG</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">5</div>,
                  dataIndex: 'telecom',
                  key: 'telecom',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">THUÊ MẶT BẰNG</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">6</div>,
                  dataIndex: 'rent',
                  key: 'rent',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">QUẢN LÝ</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">7</div>,
                  dataIndex: 'admin',
                  key: 'admin',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
            {
              title: <div className="text-center text-xs">KHÁC</div>,
              children: [
                {
                  title: <div className="text-center text-xs text-gray-500">8</div>,
                  dataIndex: 'other',
                  key: 'other',
                  width: 85,
                  render: (v: number) => <div className="text-right">{formatAmount(v)}</div>,
                },
              ],
            },
          ],
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
          <div className="text-right text-xs text-gray-500 mb-2">
            Mẫu số S3-HKD
          </div>
          <div className="mb-4">
            <Text strong>HỘ, CÁ NHÂN KINH DOANH: {storeName}</Text>
            <br />
            <Text type="secondary">Địa chỉ: {storeInfo?.address || '...'}</Text>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <Text strong className="text-lg">SỔ CHI PHÍ SẢN XUẤT, KINH DOANH</Text>
            <br />
            <Text>Tên địa điểm kinh doanh: {storeInfo?.address || '...'}</Text>
            <div className="flex justify-between mt-2">
              <Text type="secondary">Năm: {dateRange[0].year()}</Text>
              <Text type="secondary">ĐVT: Đồng</Text>
            </div>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={entries}
            rowKey="stt"
            size="small"
            pagination={false}
            bordered
            scroll={{ x: 1100 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-50">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text>Số phát sinh trong kỳ</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} />
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7} />
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9} />
                </Table.Summary.Row>
                <Table.Summary.Row className="bg-gray-100">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text strong>Tổng cộng</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatAmount(totals.total_amount || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{formatAmount(totals.labor || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{formatAmount(totals.electricity || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong>{formatAmount(totals.water || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Text strong>{formatAmount(totals.telecom || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <Text strong>{formatAmount(totals.rent || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    <Text strong>{formatAmount(totals.admin || 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    <Text strong>{formatAmount(totals.other || 0)}</Text>
                  </Table.Summary.Cell>
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
