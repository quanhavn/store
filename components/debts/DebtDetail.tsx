'use client'

import { useState } from 'react'
import { Drawer, Button, Descriptions, Tag, Progress, Alert, Spin, Popconfirm, message, Typography, Divider, List } from 'antd'
import { DollarOutlined, CloseCircleOutlined, HistoryOutlined, UserOutlined, PhoneOutlined, CalendarOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type DebtDetail as DebtDetailType, type DebtInstallment, type DebtPayment } from '@/lib/supabase/functions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { InstallmentList } from './InstallmentList'
import { DebtPaymentForm } from './DebtPaymentForm'
import type { DebtDisplayData } from './DebtCard'

const { Text, Title } = Typography

interface DebtDetailProps {
  open: boolean
  onClose: () => void
  debtId: string | null
}

// Transform DebtDetail to DebtDisplayData for the payment form
function transformToDisplayData(debt: DebtDetailType): DebtDisplayData {
  return {
    id: debt.id,
    store_id: debt.store_id,
    customer_id: debt.customer_id,
    customer_name: debt.customer?.name || 'Khach hang',
    customer_phone: debt.customer?.phone || null,
    debt_type: debt.debt_type,
    original_amount: debt.original_amount,
    remaining_amount: debt.remaining_amount,
    due_date: debt.due_date,
    status: debt.status,
    sale_id: debt.sale_id,
    notes: debt.notes,
    created_at: debt.created_at,
    created_by: debt.created_by,
    installments: debt.installments,
  }
}

export function DebtDetail({ open, onClose, debtId }: DebtDetailProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<DebtInstallment | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['debt', debtId],
    queryFn: () => api.debts.get(debtId!),
    enabled: !!debtId && open,
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.debts.cancel(debtId!),
    onSuccess: () => {
      message.success('Da huy cong no')
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const debt = data?.debt
  const payments: DebtPayment[] = debt?.payments || []

  const handlePayment = (installment?: DebtInstallment) => {
    setSelectedInstallment(installment || null)
    setPaymentOpen(true)
  }

  const handlePaymentSuccess = () => {
    setPaymentOpen(false)
    setSelectedInstallment(null)
    queryClient.invalidateQueries({ queryKey: ['debt', debtId] })
    queryClient.invalidateQueries({ queryKey: ['debts'] })
    queryClient.invalidateQueries({ queryKey: ['debt-summary'] })
  }

  if (!open) return null

  const paidAmount = debt ? debt.original_amount - debt.remaining_amount : 0
  const paidPercentage = debt && debt.original_amount > 0
    ? Math.round((paidAmount / debt.original_amount) * 100)
    : 0

  const isOverdue = debt && (debt.status === 'overdue' ||
    (debt.due_date && new Date(debt.due_date) < new Date() && debt.status === 'active'))

  const getStatusBadge = (status: DebtDetailType['status']) => {
    switch (status) {
      case 'active':
        return <Tag color="blue">Dang no</Tag>
      case 'overdue':
        return <Tag color="red">Qua han</Tag>
      case 'paid':
        return <Tag color="green">Da tra</Tag>
      case 'cancelled':
        return <Tag color="default">Da huy</Tag>
      default:
        return null
    }
  }

  const customerName = debt?.customer?.name || 'Khach hang'
  const customerPhone = debt?.customer?.phone

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Chi tiet cong no"
        placement="bottom"
        height="90%"
        extra={
          debt && debt.status !== 'paid' && debt.status !== 'cancelled' && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => handlePayment()}
            >
              Thanh toan
            </Button>
          )
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : debt ? (
          <div className="space-y-6 pb-16">
            {/* Overdue warning */}
            {isOverdue && (
              <Alert
                type="error"
                message="Cong no qua han"
                description={`Han tra: ${formatDate(debt.due_date!)}. Vui long lien he khach hang de thu no.`}
                showIcon
              />
            )}

            {/* Customer info section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserOutlined className="text-blue-600 text-xl" />
                </div>
                <div>
                  <Title level={5} className="!mb-0">{customerName}</Title>
                  {customerPhone && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <PhoneOutlined />
                      <span>{customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(debt.status)}
                <Tag color={debt.debt_type === 'credit' ? 'purple' : 'orange'}>
                  {debt.debt_type === 'credit' ? 'Ghi no' : 'Tra gop'}
                </Tag>
              </div>
            </div>

            {/* Amount info */}
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Text type="secondary" className="text-xs block">Tong no</Text>
                  <Text strong className="text-lg">{formatCurrency(debt.original_amount)}</Text>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Text type="secondary" className="text-xs block">Da tra</Text>
                  <Text strong className="text-lg text-green-600">{formatCurrency(paidAmount)}</Text>
                </div>
                <div className={`text-center p-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <Text type="secondary" className="text-xs block">Con no</Text>
                  <Text strong className={`text-lg ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatCurrency(debt.remaining_amount)}
                  </Text>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Text type="secondary">Tien do thanh toan</Text>
                  <Text type="secondary">{paidPercentage}%</Text>
                </div>
                <Progress
                  percent={paidPercentage}
                  showInfo={false}
                  strokeColor={isOverdue ? '#dc2626' : '#2563eb'}
                />
              </div>
            </div>

            {/* Due date */}
            {debt.due_date && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>
                <CalendarOutlined />
                <span>
                  {isOverdue ? 'Qua han tu: ' : 'Han tra: '}
                  <strong>{formatDate(debt.due_date)}</strong>
                </span>
              </div>
            )}

            {/* Note */}
            {debt.notes && (
              <div>
                <Text type="secondary" className="text-xs block mb-1">Ghi chu</Text>
                <Text>{debt.notes}</Text>
              </div>
            )}

            <Divider />

            {/* Installments section */}
            {debt.debt_type === 'installment' && debt.installments && debt.installments.length > 0 && (
              <div>
                <Title level={5}>Lich tra gop</Title>
                <InstallmentList
                  installments={debt.installments}
                  onPayInstallment={handlePayment}
                />
              </div>
            )}

            <Divider />

            {/* Payment history */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HistoryOutlined />
                <Title level={5} className="!mb-0">Lich su thanh toan</Title>
              </div>
              {payments.length === 0 ? (
                <Text type="secondary">Chua co thanh toan nao</Text>
              ) : (
                <List
                  dataSource={payments}
                  renderItem={(payment) => (
                    <List.Item className="!px-0">
                      <div className="w-full flex items-center justify-between">
                        <div>
                          <Text strong className="text-green-600">
                            +{formatCurrency(payment.amount)}
                          </Text>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(payment.paid_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Tag color={payment.payment_method === 'cash' ? 'green' : 'blue'}>
                            {payment.payment_method === 'cash' ? 'Tien mat' : 'Chuyen khoan'}
                          </Tag>
                          {payment.notes && (
                            <div className="text-xs text-gray-500">{payment.notes}</div>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </div>

            <Divider />

            {/* Info */}
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Ngay tao">
                {formatDateTime(debt.created_at)}
              </Descriptions.Item>
              {debt.sale_id && (
                <Descriptions.Item label="Ma don hang">
                  {debt.sale_id}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Cancel button (manager only) */}
            {debt.status === 'active' && (
              <div className="pt-4">
                <Popconfirm
                  title="Huy cong no?"
                  description="Hanh dong nay khong the hoan tac. Ban co chac chan muon huy cong no nay?"
                  onConfirm={() => cancelMutation.mutate()}
                  okText="Huy cong no"
                  cancelText="Quay lai"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    block
                    loading={cancelMutation.isPending}
                  >
                    Huy cong no
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Text type="secondary">Khong tim thay cong no</Text>
          </div>
        )}
      </Drawer>

      {/* Payment form drawer */}
      {debt && (
        <DebtPaymentForm
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false)
            setSelectedInstallment(null)
          }}
          debt={transformToDisplayData(debt)}
          installment={selectedInstallment}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  )
}
