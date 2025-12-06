'use client'

import { Drawer, Descriptions, Tag, Button, Popconfirm, message, Divider } from 'antd'
import { EditOutlined, DeleteOutlined, PhoneOutlined, IdcardOutlined, BankOutlined, CalendarOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Employee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'

interface EmployeeDetailProps {
  open: boolean
  onClose: () => void
  employee: Employee | null
  onEdit?: () => void
}

export function EmployeeDetail({ open, onClose, employee, onEdit }: EmployeeDetailProps) {
  const queryClient = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: () => api.hr.deactivateEmployee(employee!.id),
    onSuccess: () => {
      message.success('Da cho nhan vien nghi viec')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  if (!employee) return null

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'full_time': return 'Toan thoi gian'
      case 'part_time': return 'Ban thoi gian'
      case 'contract': return 'Hop dong'
      default: return type
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={employee.name}
      placement="bottom"
      height="85%"
      extra={
        employee.active && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            Sua
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag color={employee.active ? 'green' : 'red'}>
            {employee.active ? 'Dang lam viec' : 'Da nghi viec'}
          </Tag>
          <Tag color="blue">{employee.position}</Tag>
        </div>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<><PhoneOutlined /> Dien thoai</>}>
            <a href={`tel:${employee.phone}`}>{employee.phone}</a>
          </Descriptions.Item>
          <Descriptions.Item label={<><IdcardOutlined /> CCCD/CMND</>}>
            {employee.id_card}
          </Descriptions.Item>
          {employee.date_of_birth && (
            <Descriptions.Item label="Ngay sinh">
              {dayjs(employee.date_of_birth).format('DD/MM/YYYY')}
            </Descriptions.Item>
          )}
          {employee.address && (
            <Descriptions.Item label="Dia chi">
              {employee.address}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">Cong viec</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Chuc vu">
            {employee.position}
          </Descriptions.Item>
          {employee.department && (
            <Descriptions.Item label="Phong ban">
              {employee.department}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Loai hop dong">
            {getContractTypeLabel(employee.contract_type)}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> Ngay vao lam</>}>
            {dayjs(employee.hire_date).format('DD/MM/YYYY')}
          </Descriptions.Item>
          {employee.termination_date && (
            <Descriptions.Item label="Ngay nghi viec">
              {dayjs(employee.termination_date).format('DD/MM/YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">Luong & Phu cap</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Luong co ban">
            <span className="font-semibold text-green-600">
              {formatCurrency(employee.base_salary)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Phu cap">
            {formatCurrency(employee.allowances || 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Nguoi phu thuoc">
            {employee.dependents || 0} nguoi
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">Thong tin ngan hang</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<><BankOutlined /> Ngan hang</>}>
            {employee.bank_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="So tai khoan">
            {employee.bank_account || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="So BHXH">
            {employee.social_insurance_no || '-'}
          </Descriptions.Item>
        </Descriptions>

        {employee.active && (
          <div className="pt-4">
            <Popconfirm
              title="Cho nhan vien nghi viec?"
              description="Hanh dong nay khong the hoan tac"
              onConfirm={() => deactivateMutation.mutate()}
              okText="Xac nhan"
              cancelText="Huy"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deactivateMutation.isPending}
                block
              >
                Cho nghi viec
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Drawer>
  )
}
