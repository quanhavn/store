'use client'

import { useState } from 'react'
import { Table, Typography, DatePicker, Button, Space, Spin, Empty, message } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api, type RevenueBookReport } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { exportRevenueBook } from '@/lib/reports/export-templates'
import { exportRevenueBookPDF } from '@/lib/reports/pdf-templates'
import { useTranslations } from 'next-intl'

const { Text } = Typography
const { RangePicker } = DatePicker

interface RevenueBookPreviewProps {
  storeInfo?: {
    name: string
    address?: string
  }
}

export function RevenueBookPreview({ storeInfo }: RevenueBookPreviewProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year'),
  ])
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const storeName = storeInfo?.name || 'Cửa hàng'

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['revenue-book-report', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => api.reports.revenueBook(
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
    if (!amount || amount === 0) return '-'
    return formatCurrency(amount)
  }

  const handleExportExcel = () => {
    if (!data) return
    const period = `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`
    exportRevenueBook(data, storeName, period)
    message.success(tCommon('success'))
  }

  const handleExportPDF = async () => {
    if (!data) return
    setIsExportingPDF(true)
    try {
      await exportRevenueBookPDF(data, { name: storeName, address: storeInfo?.address })
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
      title: <div className="text-center font-bold text-xs">NGÀY, THÁNG<br/>GHI SỔ</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">A</div>,
          dataIndex: 'record_date',
          key: 'record_date',
          width: 70,
          render: (v: string) => <div className="text-center text-xs">{formatShortDate(v)}</div>,
        },
      ],
    },
    {
      title: <div className="text-center font-bold text-xs">CHỨNG TỪ</div>,
      children: [
        {
          title: <div className="text-center text-xs">SỐ HIỆU</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">B</div>,
              dataIndex: 'voucher_no',
              key: 'voucher_no',
              width: 60,
              render: (v: string) => <div className="text-center text-xs">{v || ''}</div>,
            },
          ],
        },
        {
          title: <div className="text-center text-xs">NGÀY, THÁNG</div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">C</div>,
              dataIndex: 'voucher_date',
              key: 'voucher_date',
              width: 70,
              render: (v: string) => <div className="text-center text-xs">{formatShortDate(v)}</div>,
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-bold text-xs">DIỄN GIẢI</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">D</div>,
          dataIndex: 'description',
          key: 'description',
          width: 150,
          ellipsis: true,
          render: (v: string) => <div className="text-xs">{v}</div>,
        },
      ],
    },
    {
      title: <div className="text-center font-bold text-xs">DOANH THU BÁN HÀNG HÓA, DỊCH VỤ CHIA THEO DANH MỤC NGÀNH NGHỀ</div>,
      children: [
        {
          title: <div className="text-center text-xs leading-tight">PHÂN PHỐI,<br/>CUNG CẤP HH<br/><span className="text-gray-500">(GTGT 1%, TNCN 0.5%)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">1</div>,
              dataIndex: 'goods_distribution',
              key: 'goods_distribution',
              width: 90,
              render: (v: number) => <div className="text-right text-xs">{formatAmount(v)}</div>,
            },
          ],
        },
        {
          title: <div className="text-center text-xs leading-tight">DỊCH VỤ,<br/>XÂY DỰNG<br/><span className="text-gray-500">(GTGT 5%, TNCN 2%)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">4</div>,
              dataIndex: 'service_construction',
              key: 'service_construction',
              width: 90,
              render: (v: number) => <div className="text-right text-xs">{formatAmount(v)}</div>,
            },
          ],
        },
        {
          title: <div className="text-center text-xs leading-tight">SẢN XUẤT,<br/>VẬN TẢI<br/><span className="text-gray-500">(GTGT 3%, TNCN 1.5%)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">7</div>,
              dataIndex: 'manufacturing_transport',
              key: 'manufacturing_transport',
              width: 90,
              render: (v: number) => <div className="text-right text-xs">{formatAmount(v)}</div>,
            },
          ],
        },
        {
          title: <div className="text-center text-xs leading-tight">HOẠT ĐỘNG<br/>KHÁC<br/><span className="text-gray-500">(GTGT 2%, TNCN 1%)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs text-gray-500">10</div>,
              dataIndex: 'other_business',
              key: 'other_business',
              width: 90,
              render: (v: number) => <div className="text-right text-xs">{formatAmount(v)}</div>,
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-bold text-xs">GHI CHÚ</div>,
      children: [
        {
          title: <div className="text-center text-xs text-gray-500">12</div>,
          dataIndex: 'note',
          key: 'note',
          width: 70,
          render: (v: string) => <div className="text-xs">{v || ''}</div>,
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

  const totals = data?.totals || { goods_distribution: 0, service_construction: 0, manufacturing_transport: 0, other_business: 0, total_revenue: 0 }
  const taxPayable = data?.tax_payable || { total_vat: 0, total_pit: 0 }

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
            <Text strong className="text-lg">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</Text>
            <br />
            <Text>Tên địa điểm kinh doanh: ...</Text>
            <br />
            <Text>Năm: {data.year}</Text>
            <div className="flex justify-end mt-2">
              <Text type="secondary">Đơn vị tính: Đồng</Text>
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
            scroll={{ x: 900 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-100">
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={1}>
                    <Text strong className="text-xs">Tổng cộng</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong className="text-xs">{formatAmount(totals.goods_distribution)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong className="text-xs">{formatAmount(totals.service_construction)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong className="text-xs">{formatAmount(totals.manufacturing_transport)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong className="text-xs">{formatAmount(totals.other_business)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          {/* Footer */}
          <div className="mt-6 text-sm text-gray-600">
            <div>- Sổ này có ... trang, đánh số từ trang 01 đến trang ...</div>
            <div>- Ngày mở sổ: ...</div>
          </div>

          {/* Tax Summary & Signature */}
          <div className="flex justify-between mt-8">
            <div className="text-sm">
              <Text strong>Tiền thuế phải nộp:</Text>
              <div className="ml-4 mt-1">
                <div>- Thuế GTGT: {formatCurrency(taxPayable.total_vat)}</div>
                <div>- Thuế TNCN: {formatCurrency(taxPayable.total_pit)}</div>
              </div>
            </div>
            <div className="text-center">
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
