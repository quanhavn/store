'use client'

import { useState } from 'react'
import { Calendar, Badge, Select, Card, Typography, Spin, Empty } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { api, type Employee } from '@/lib/supabase/functions'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const { Text } = Typography

interface AttendanceCalendarProps {
  employee?: Employee | null
}

export function AttendanceCalendar({ employee }: AttendanceCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(dayjs())

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', employee?.id, selectedMonth.month() + 1, selectedMonth.year()],
    queryFn: () => api.hr.getAttendance({
      employee_id: employee?.id,
      date_from: selectedMonth.startOf('month').format('YYYY-MM-DD'),
      date_to: selectedMonth.endOf('month').format('YYYY-MM-DD'),
    }),
    enabled: !!employee,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', employee?.id, selectedMonth.month() + 1, selectedMonth.year()],
    queryFn: () => api.hr.attendanceSummary(
      employee!.id,
      selectedMonth.month() + 1,
      selectedMonth.year()
    ),
    enabled: !!employee,
  })

  const attendanceMap = new Map(
    data?.attendance.map(a => [a.work_date, a]) || []
  )

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    const attendance = attendanceMap.get(dateStr)

    if (!attendance) return null

    let status: 'success' | 'warning' | 'error' | 'default' = 'default'
    let text = ''

    switch (attendance.status) {
      case 'present':
        status = 'success'
        text = 'Co mat'
        break
      case 'half_day':
        status = 'warning'
        text = 'Nua ngay'
        break
      case 'absent':
        status = 'error'
        text = 'Vang'
        break
      case 'leave':
        status = 'default'
        text = 'Phep'
        break
    }

    return (
      <div className="text-center">
        <Badge status={status} />
        <div className="text-xs">{text}</div>
        {attendance.working_hours && (
          <div className="text-xs text-gray-400">{attendance.working_hours}h</div>
        )}
      </div>
    )
  }

  if (!employee) {
    return (
      <Empty
        description="Chon nhan vien de xem cham cong"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  const summary = summaryData?.summary

  return (
    <div className="space-y-4">
      {summary && (
        <Card size="small">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{summary.present}</div>
              <Text type="secondary" className="text-xs">Co mat</Text>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">{summary.half_day}</div>
              <Text type="secondary" className="text-xs">Nua ngay</Text>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{summary.absent}</div>
              <Text type="secondary" className="text-xs">Vang</Text>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{summary.total_working_days}</div>
              <Text type="secondary" className="text-xs">Tong ngay</Text>
            </div>
          </div>
        </Card>
      )}

      <Calendar
        fullscreen={false}
        value={selectedMonth}
        onPanelChange={(value) => setSelectedMonth(value)}
        cellRender={(current, info) => {
          if (info.type === 'date') {
            return dateCellRender(current)
          }
          return null
        }}
      />
    </div>
  )
}
