'use client'

import { useState } from 'react'
import { Typography, Tabs, Drawer } from 'antd'
import { DashboardOutlined, FileTextOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DashboardSummary, ReportsHub, ReportPreview, BankDepositBook } from '@/components/reports'
import { api } from '@/lib/supabase/functions'

const { Title } = Typography

export default function ReportsPage() {
  const t = useTranslations('reports')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [bankBookOpen, setBankBookOpen] = useState(false)
  const [previewReport, setPreviewReport] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
  })

  const { data: storeData } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore(),
  })

  const store = storeData?.store
  const storeInfo = store ? {
    name: store.name,
    address: store.address || '',
    taxCode: store.tax_code || undefined,
  } : undefined

  const handleViewReport = (reportType: string, dateFrom: string, dateTo: string) => {
    if (reportType === 'bank') {
      setBankBookOpen(true)
    } else {
      setPreviewReport({ type: reportType, dateFrom, dateTo })
      setPreviewOpen(true)
    }
  }

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span className="flex items-center gap-1">
          <DashboardOutlined />
          Tổng quan
        </span>
      ),
      children: <DashboardSummary />,
    },
    {
      key: 'reports',
      label: (
        <span className="flex items-center gap-1">
          <FileTextOutlined />
          Sổ sách
        </span>
      ),
      children: <ReportsHub onViewReport={handleViewReport} />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <Title level={4}>Báo cáo</Title>
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

      <Drawer
        open={bankBookOpen}
        onClose={() => setBankBookOpen(false)}
        title={t('bankBook.title')}
        placement="bottom"
        height="95%"
        destroyOnClose
      >
        <BankDepositBook storeInfo={storeInfo} />
      </Drawer>
    </div>
  )
}
