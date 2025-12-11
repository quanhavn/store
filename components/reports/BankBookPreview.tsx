'use client'

import { Table, Typography } from 'antd'
import type { BankBookReport } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'

const { Text } = Typography

interface BankBookPreviewProps {
  data: BankBookReport
  storeName?: string
}

export function BankBookPreview({ data, storeName = 'Cửa hàng' }: BankBookPreviewProps) {
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

  const bankName = data.bank_account?.bank_name || ''
  const accountNumber = data.bank_account?.account_number || ''

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
              render: (v: string | null) => <div className="text-center">{v || ''}</div>,
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
          title: <div className="text-center text-xs">THU<br/>(GỬI VÀO)</div>,
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
          title: <div className="text-center text-xs">CHI<br/>(RÚT RA)</div>,
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
          title: <div className="text-center">CÒN LẠI</div>,
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
          title: <div className="text-center text-xs text-gray-500">F</div>,
          dataIndex: 'note',
          key: 'note',
          width: 80,
          render: (v: string) => v || '',
        },
      ],
    },
  ]

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-4">
        <Text strong>HỘ, CÁ NHÂN KINH DOANH: {storeName}</Text>
        <br />
        <Text type="secondary">Địa chỉ: ...</Text>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <Text strong className="text-lg">SỔ TIỀN GỬI NGÂN HÀNG</Text>
        <br />
        <Text>Nơi mở tài khoản giao dịch: {bankName}</Text>
        <br />
        <Text>Số hiệu tài khoản tại nơi gửi: {accountNumber}</Text>
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
    </div>
  )
}
