'use client'

import { useState } from 'react'
import { Card, List, Typography, DatePicker, Segmented, Button, Space } from 'antd'
import {
  DollarOutlined,
  WalletOutlined,
  BankOutlined,
  FileTextOutlined,
  InboxOutlined,
  PercentageOutlined,
  TeamOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

interface ReportsHubProps {
  onViewReport: (reportType: string, dateFrom: string, dateTo: string) => void
}

const REPORTS = [
  {
    key: 'revenue',
    title: 'So doanh thu',
    description: 'Doanh thu ban hang',
    icon: <DollarOutlined className="text-green-600" />,
    color: 'bg-green-50',
  },
  {
    key: 'cash',
    title: 'So tien mat',
    description: 'Thu chi tien mat',
    icon: <WalletOutlined className="text-blue-600" />,
    color: 'bg-blue-50',
  },
  {
    key: 'bank',
    title: 'So tien gui',
    description: 'Thu chi ngan hang',
    icon: <BankOutlined className="text-purple-600" />,
    color: 'bg-purple-50',
  },
  {
    key: 'expense',
    title: 'So chi phi',
    description: 'Chi phi theo danh muc',
    icon: <FileTextOutlined className="text-orange-600" />,
    color: 'bg-orange-50',
  },
  {
    key: 'inventory',
    title: 'So ton kho',
    description: 'Xuat nhap ton',
    icon: <InboxOutlined className="text-cyan-600" />,
    color: 'bg-cyan-50',
  },
  {
    key: 'tax',
    title: 'So nghia vu thue',
    description: 'VAT, TNCN theo quy',
    icon: <PercentageOutlined className="text-red-600" />,
    color: 'bg-red-50',
  },
  {
    key: 'salary',
    title: 'So luong',
    description: 'Luong nhan vien',
    icon: <TeamOutlined className="text-indigo-600" />,
    color: 'bg-indigo-50',
  },
]

export function ReportsHub({ onViewReport }: ReportsHubProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)

  const getDateRange = (): [string, string] => {
    const now = dayjs()

    switch (datePreset) {
      case 'today':
        return [now.format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
      case 'week':
        return [now.startOf('week').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
      case 'month':
        return [now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
      case 'quarter': {
        const currentQuarter = Math.floor(now.month() / 3)
        const quarterStart = now.month(currentQuarter * 3).startOf('month')
        return [quarterStart.format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
      }
      case 'year':
        return [now.startOf('year').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
      case 'custom':
        if (customRange) {
          return [customRange[0].format('YYYY-MM-DD'), customRange[1].format('YYYY-MM-DD')]
        }
        return [now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
    }
  }

  const handleViewReport = (reportKey: string) => {
    const [dateFrom, dateTo] = getDateRange()
    onViewReport(reportKey, dateFrom, dateTo)
  }

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="space-y-3">
          <Text type="secondary" className="text-xs">Chon ky bao cao:</Text>
          <Segmented
            block
            size="small"
            value={datePreset}
            onChange={(v) => setDatePreset(v as DatePreset)}
            options={[
              { value: 'today', label: 'Hom nay' },
              { value: 'week', label: 'Tuan' },
              { value: 'month', label: 'Thang' },
              { value: 'quarter', label: 'Quy' },
            ]}
          />
          <div className="flex gap-2">
            <Button
              size="small"
              type={datePreset === 'year' ? 'primary' : 'default'}
              onClick={() => setDatePreset('year')}
            >
              Ca nam
            </Button>
            <Button
              size="small"
              type={datePreset === 'custom' ? 'primary' : 'default'}
              onClick={() => setDatePreset('custom')}
            >
              Tuy chon
            </Button>
          </div>
          {datePreset === 'custom' && (
            <RangePicker
              className="w-full"
              value={customRange}
              onChange={(dates) => setCustomRange(dates as [Dayjs, Dayjs])}
              format="DD/MM/YYYY"
            />
          )}
        </div>
      </Card>

      <List
        dataSource={REPORTS}
        renderItem={(report) => (
          <Card
            size="small"
            className={`mb-2 cursor-pointer hover:shadow-md transition-shadow ${report.color}`}
            onClick={() => handleViewReport(report.key)}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{report.icon}</div>
              <div className="flex-1">
                <Text strong>{report.title}</Text>
                <div className="text-xs text-gray-500">{report.description}</div>
              </div>
              <Button type="text" icon={<DownloadOutlined />} size="small" />
            </div>
          </Card>
        )}
      />
    </div>
  )
}
