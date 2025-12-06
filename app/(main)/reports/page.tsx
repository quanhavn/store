'use client'

import { useState } from 'react'
import { Typography, Tabs } from 'antd'
import { DashboardOutlined, FileTextOutlined } from '@ant-design/icons'
import { DashboardSummary, ReportsHub, ReportPreview } from '@/components/reports'

const { Title } = Typography

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewReport, setPreviewReport] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
  })

  const handleViewReport = (reportType: string, dateFrom: string, dateTo: string) => {
    setPreviewReport({ type: reportType, dateFrom, dateTo })
    setPreviewOpen(true)
  }

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span className="flex items-center gap-1">
          <DashboardOutlined />
          Tong quan
        </span>
      ),
      children: <DashboardSummary />,
    },
    {
      key: 'reports',
      label: (
        <span className="flex items-center gap-1">
          <FileTextOutlined />
          So sach
        </span>
      ),
      children: <ReportsHub onViewReport={handleViewReport} />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4}>Bao cao</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <ReportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        reportType={previewReport.type}
        dateFrom={previewReport.dateFrom}
        dateTo={previewReport.dateTo}
      />
    </div>
  )
}
