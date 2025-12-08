'use client'

import { Button, Card, Typography, message, Space, Tag } from 'antd'
import { LoginOutlined, LogoutOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Employee } from '@/lib/supabase/functions'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

const { Text, Title } = Typography

interface CheckInOutButtonProps {
  employee: Employee
}

export function CheckInOutButton({ employee }: CheckInOutButtonProps) {
  const t = useTranslations('hr')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const today = dayjs().format('YYYY-MM-DD')

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-today', employee.id, today],
    queryFn: () => api.hr.getAttendance({
      employee_id: employee.id,
      date_from: today,
      date_to: today,
    }),
  })

  const todayAttendance = data?.attendance?.[0]
  const hasCheckedIn = !!todayAttendance?.check_in
  const hasCheckedOut = !!todayAttendance?.check_out

  const checkInMutation = useMutation({
    mutationFn: () => api.hr.checkIn(employee.id),
    onSuccess: () => {
      message.success(t('checkInSuccess'))
      queryClient.invalidateQueries({ queryKey: ['attendance-today', employee.id] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: () => api.hr.checkOut(employee.id),
    onSuccess: () => {
      message.success(t('checkOutSuccess'))
      queryClient.invalidateQueries({ queryKey: ['attendance-today', employee.id] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    },
  })

  const formatTime = (isoString: string) => {
    return dayjs(isoString).format('HH:mm')
  }

  return (
    <Card className="text-center">
      <Title level={4} className="!mb-2">
        {t('greeting', { name: employee.name })}
      </Title>
      <Text type="secondary" className="block mb-4">
        {dayjs().format('dddd, DD/MM/YYYY')}
      </Text>

      {hasCheckedIn && (
        <div className="mb-4">
          <Tag color="green" icon={<LoginOutlined />} className="text-sm py-1 px-3">
            {t('checkIn')}: {formatTime(todayAttendance.check_in!)}
          </Tag>
          {hasCheckedOut && (
            <Tag color="blue" icon={<LogoutOutlined />} className="text-sm py-1 px-3 ml-2">
              {t('checkOut')}: {formatTime(todayAttendance.check_out!)}
            </Tag>
          )}
        </div>
      )}

      {hasCheckedOut ? (
        <div className="py-4">
          <div className="text-5xl mb-2">🎉</div>
          <Text type="success" className="text-lg">
            {t('workdayComplete')}
          </Text>
          {todayAttendance?.working_hours && (
            <div className="mt-2">
              <Tag icon={<ClockCircleOutlined />} color="blue">
                {todayAttendance.working_hours} {t('hours')}
              </Tag>
            </div>
          )}
        </div>
      ) : (
        <Space direction="vertical" className="w-full" size="large">
          {!hasCheckedIn ? (
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={() => checkInMutation.mutate()}
              loading={checkInMutation.isPending || isLoading}
              className="w-full h-20 text-xl bg-green-500 hover:bg-green-600"
            >
              {t('checkIn').toUpperCase()}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<LogoutOutlined />}
              onClick={() => checkOutMutation.mutate()}
              loading={checkOutMutation.isPending || isLoading}
              className="w-full h-20 text-xl bg-blue-500 hover:bg-blue-600"
            >
              {t('checkOut').toUpperCase()}
            </Button>
          )}
        </Space>
      )}
    </Card>
  )
}
