'use client'

import { useState } from 'react'
import { Typography, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  InvoiceList,
  InvoiceSyncStatus,
  CreateInvoiceSheet
} from '@/components/invoice'

const { Title } = Typography

export default function InvoicesPage() {
  const [createOpen, setCreateOpen] = useState(false)

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

      <InvoiceSyncStatus />

      <div className="mt-4">
        <InvoiceList />
      </div>

      <CreateInvoiceSheet
        saleId={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
