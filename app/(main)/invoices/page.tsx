'use client'

import { useState } from 'react'
import { Typography, Button, Tabs } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import {
  InvoiceList,
  InvoiceSyncStatus,
  CreateInvoiceSheet,
  EInvoiceSettingsForm
} from '@/components/invoice'

const { Title } = Typography

export default function InvoicesPage() {
  const [createOpen, setCreateOpen] = useState(false)

  const tabItems = [
    {
      key: 'list',
      label: (
        <span className="flex items-center gap-2">
          {/* <FileTextOutlined /> */}
          Hóa đơn
        </span>
      ),
      children: (
        <>
          <InvoiceSyncStatus />

          <div className="mt-4">
            <InvoiceList />
          </div>
        </>
      ),
    },
    {
      key: 'settings',
      label: (
        <span className="flex items-center gap-2">
          <SettingOutlined />
          Cài đặt
        </span>
      ),
      children: <EInvoiceSettingsForm />,
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!mb-0">Hóa đơn điện tử</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          Tạo hóa đơn
        </Button>
      </div>

      <Tabs items={tabItems} />

      <CreateInvoiceSheet
        saleId={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
