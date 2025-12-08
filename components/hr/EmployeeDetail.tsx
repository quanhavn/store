'use client'

import { Drawer, Descriptions, Tag, Button, Popconfirm, message, Divider } from 'antd'
import { EditOutlined, DeleteOutlined, PhoneOutlined, IdcardOutlined, BankOutlined, CalendarOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Employee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

interface EmployeeDetailProps {
  open: boolean
  onClose: () => void
  employee: Employee | null
  onEdit?: () => void
}

export function EmployeeDetail({ open, onClose, employee, onEdit }: EmployeeDetailProps) {
  const t = useTranslations('hr')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: () => api.hr.deactivateEmployee(employee!.id),
    onSuccess: () => {
      message.success(t('employeeDeactivated'))
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  if (!employee) return null

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'full_time': return t('contractType.fullTime')
      case 'part_time': return t('contractType.partTime')
      case 'contract': return t('contractType.contract')
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
            {tCommon('edit')}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag color={employee.active ? 'green' : 'red'}>
            {employee.active ? t('status.active') : t('status.inactive')}
          </Tag>
          <Tag color="blue">{employee.position}</Tag>
        </div>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<><PhoneOutlined /> {tCommon('phone')}</>}>
            <a href={`tel:${employee.phone}`}>{employee.phone}</a>
          </Descriptions.Item>
          <Descriptions.Item label={<><IdcardOutlined /> {t('idCard')}</>}>
            {employee.id_card}
          </Descriptions.Item>
          {employee.date_of_birth && (
            <Descriptions.Item label={t('dateOfBirth')}>
              {dayjs(employee.date_of_birth).format('DD/MM/YYYY')}
            </Descriptions.Item>
          )}
          {employee.address && (
            <Descriptions.Item label={t('address')}>
              {employee.address}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">{t('workInfo')}</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('position')}>
            {employee.position}
          </Descriptions.Item>
          {employee.department && (
            <Descriptions.Item label={t('department')}>
              {employee.department}
            </Descriptions.Item>
          )}
          <Descriptions.Item label={t('contractType')}>
            {getContractTypeLabel(employee.contract_type)}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> {t('startDate')}</>}>
            {dayjs(employee.hire_date).format('DD/MM/YYYY')}
          </Descriptions.Item>
          {employee.termination_date && (
            <Descriptions.Item label={t('terminationDate')}>
              {dayjs(employee.termination_date).format('DD/MM/YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">{t('salaryAndAllowances')}</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('baseSalary')}>
            <span className="font-semibold text-green-600">
              {formatCurrency(employee.base_salary)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t('allowances')}>
            {formatCurrency(employee.allowances || 0)}
          </Descriptions.Item>
          <Descriptions.Item label={t('dependents')}>
            {employee.dependents || 0} {t('people')}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">{t('bankInfo')}</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<><BankOutlined /> {t('bankName')}</>}>
            {employee.bank_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('bankAccount')}>
            {employee.bank_account || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('socialInsuranceNo')}>
            {employee.social_insurance_no || '-'}
          </Descriptions.Item>
        </Descriptions>

        {employee.active && (
          <div className="pt-4">
            <Popconfirm
              title={t('deactivateEmployeeConfirm')}
              description={t('actionCannotBeUndone')}
              onConfirm={() => deactivateMutation.mutate()}
              okText={tCommon('confirm')}
              cancelText={tCommon('cancel')}
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deactivateMutation.isPending}
                block
              >
                {t('deactivateEmployee')}
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Drawer>
  )
}
