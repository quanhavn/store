'use client'

import { Drawer, Descriptions, Tag, Button, Popconfirm, message, Divider, Radio } from 'antd'
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type PayrollWithEmployee } from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'

interface PayslipDetailProps {
  open: boolean
  onClose: () => void
  payroll: PayrollWithEmployee | null
}

export function PayslipDetail({ open, onClose, payroll }: PayslipDetailProps) {
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash')

  const markPaidMutation = useMutation({
    mutationFn: () => api.hr.markPaid(payroll!.id, paymentMethod),
    onSuccess: () => {
      message.success('Da danh dau tra luong')
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  if (!payroll) return null

  const employee = payroll.employees

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Phieu luong T${payroll.period_month}/${payroll.period_year}`}
      placement="bottom"
      height="90%"
    >
      <div className="space-y-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-medium">{employee?.name}</div>
          <div className="text-sm text-gray-500">{employee?.position}</div>
          <Tag
            color={
              payroll.status === 'paid' ? 'green' :
              payroll.status === 'approved' ? 'orange' : 'blue'
            }
            className="mt-2"
          >
            {payroll.status === 'paid' ? 'Da tra' :
             payroll.status === 'approved' ? 'Da duyet' : 'Da tinh'}
          </Tag>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500">Ngay cong</div>
          <div className="text-2xl font-bold">
            {payroll.working_days}/{payroll.standard_days}
          </div>
        </div>

        <Divider orientationMargin={0}><span className="text-sm">Thu nhap</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Luong co ban">
            {formatCurrency(payroll.base_salary)}
          </Descriptions.Item>
          <Descriptions.Item label="Luong thuc te">
            {formatCurrency(payroll.pro_rated_salary)}
          </Descriptions.Item>
          <Descriptions.Item label="Phu cap">
            {formatCurrency(payroll.allowances)}
          </Descriptions.Item>
          <Descriptions.Item label="Tong thu nhap">
            <span className="font-bold text-blue-600">
              {formatCurrency(payroll.gross_salary)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin={0}><span className="text-sm">Khau tru</span></Divider>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="BHXH (8%)">
            -{formatCurrency(payroll.social_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label="BHYT (1.5%)">
            -{formatCurrency(payroll.health_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label="BHTN (1%)">
            -{formatCurrency(payroll.unemployment_insurance)}
          </Descriptions.Item>
          <Descriptions.Item label="Thue TNCN">
            -{formatCurrency(payroll.pit)}
          </Descriptions.Item>
          <Descriptions.Item label="Tong khau tru">
            <span className="font-bold text-red-600">
              -{formatCurrency(payroll.total_deductions)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="text-sm text-gray-600">THUC LINH</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(payroll.net_salary)}
          </div>
        </div>

        <Divider orientationMargin={0}><span className="text-sm">Chi tiet thue TNCN</span></Divider>

        <Descriptions column={1} size="small">
          <Descriptions.Item label="Giam tru ban than">
            {formatCurrency(payroll.personal_deduction)}
          </Descriptions.Item>
          <Descriptions.Item label="Giam tru nguoi phu thuoc">
            {formatCurrency(payroll.dependent_deduction)}
          </Descriptions.Item>
          <Descriptions.Item label="Thu nhap chiu thue">
            {formatCurrency(payroll.taxable_income)}
          </Descriptions.Item>
        </Descriptions>

        {payroll.status === 'approved' && (
          <>
            <Divider />
            <div className="space-y-3">
              <div className="text-sm font-medium">Phuong thuc tra:</div>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full"
              >
                <Radio.Button value="cash" className="w-1/2 text-center">
                  Tien mat
                </Radio.Button>
                <Radio.Button value="bank_transfer" className="w-1/2 text-center">
                  Chuyen khoan
                </Radio.Button>
              </Radio.Group>

              {paymentMethod === 'bank_transfer' && employee?.bank_account && (
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <div>Ngan hang: {employee.bank_name}</div>
                  <div>STK: {employee.bank_account}</div>
                </div>
              )}

              <Popconfirm
                title="Xac nhan tra luong?"
                description={`Tra ${formatCurrency(payroll.net_salary)} cho ${employee?.name}`}
                onConfirm={() => markPaidMutation.mutate()}
                okText="Xac nhan"
                cancelText="Huy"
              >
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  loading={markPaidMutation.isPending}
                  block
                  className="bg-green-500 hover:bg-green-600"
                >
                  Tra luong
                </Button>
              </Popconfirm>
            </div>
          </>
        )}

        {payroll.status === 'paid' && (
          <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded">
            <CheckCircleOutlined className="text-green-600" />
            <span className="text-green-600">
              Da tra ngay {payroll.paid_date} ({payroll.payment_method === 'cash' ? 'Tien mat' : 'Chuyen khoan'})
            </span>
          </div>
        )}
      </div>
    </Drawer>
  )
}
