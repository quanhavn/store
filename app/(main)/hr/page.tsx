'use client'

import { useState } from 'react'
import { Typography, Tabs, Button } from 'antd'
import { TeamOutlined, ClockCircleOutlined, DollarOutlined, UploadOutlined } from '@ant-design/icons'
import {
  EmployeeList,
  EmployeeForm,
  EmployeeDetail,
  PayrollDashboard,
  PayslipList,
  PayslipDetail,
} from '@/components/hr'
import { CSVImportModal } from '@/components/import'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import type { Employee, PayrollWithEmployee } from '@/lib/supabase/functions'

const { Title } = Typography

type HRTab = 'employees' | 'payroll'

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<HRTab>('employees')
  const openImport = useCSVImportStore((state) => state.openImport)

  // Employee state
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)

  // Payroll state
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollWithEmployee | null>(null)
  const [showPayslipDetail, setShowPayslipDetail] = useState(false)

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeDetail(true)
  }

  const handleEditEmployee = () => {
    setShowEmployeeDetail(false)
    setShowEditEmployee(true)
  }

  const handleSelectPayroll = (payroll: PayrollWithEmployee) => {
    setSelectedPayroll(payroll)
    setShowPayslipDetail(true)
  }

  const tabItems = [
    {
      key: 'employees',
      label: (
        <span className="flex items-center gap-1">
          <TeamOutlined />
          Nhân viên
        </span>
      ),
      children: (
        <EmployeeList
          onAdd={() => setShowAddEmployee(true)}
          onSelect={handleSelectEmployee}
        />
      ),
    },
    {
      key: 'payroll',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          Bảng lương
        </span>
      ),
      children: (
        <div className="space-y-4">
          <PayrollDashboard />
          <div className="border-t pt-4">
            <Title level={5}>Phieu luong</Title>
            <PayslipList onSelect={handleSelectPayroll} />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!mb-0">Nhân sự</Title>
        {activeTab === 'employees' && (
          <Button
            icon={<UploadOutlined />}
            onClick={() => openImport('employee')}
          >
            Import CSV
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as HRTab)}
        items={tabItems}
      />

      {/* Employee Form - Add */}
      <EmployeeForm
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
      />

      {/* Employee Form - Edit */}
      <EmployeeForm
        open={showEditEmployee}
        onClose={() => setShowEditEmployee(false)}
        employee={selectedEmployee}
      />

      {/* Employee Detail */}
      <EmployeeDetail
        open={showEmployeeDetail}
        onClose={() => setShowEmployeeDetail(false)}
        employee={selectedEmployee}
        onEdit={handleEditEmployee}
      />

      {/* Payslip Detail */}
      <PayslipDetail
        open={showPayslipDetail}
        onClose={() => setShowPayslipDetail(false)}
        payroll={selectedPayroll}
      />

      {/* CSV Import Modal */}
      <CSVImportModal />
    </div>
  )
}
