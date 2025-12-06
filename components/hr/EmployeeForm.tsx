'use client'

import { useEffect } from 'react'
import { Drawer, Form, Input, Select, InputNumber, DatePicker, Button, message, Spin } from 'antd'
import { SaveOutlined, UserAddOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Employee, type CreateEmployeeData } from '@/lib/supabase/functions'
import dayjs from 'dayjs'

interface EmployeeFormProps {
  open: boolean
  onClose: () => void
  employee?: Employee | null
}

const CONTRACT_TYPES = [
  { value: 'full_time', label: 'Toan thoi gian' },
  { value: 'part_time', label: 'Ban thoi gian' },
  { value: 'contract', label: 'Hop dong' },
]

export function EmployeeForm({ open, onClose, employee }: EmployeeFormProps) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => api.hr.listPositions(),
  })

  const positions = positionsData?.positions || []

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeData) => api.hr.createEmployee(data),
    onSuccess: () => {
      message.success('Them nhan vien thanh cong')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeData>) =>
      api.hr.updateEmployee(employee!.id, data),
    onSuccess: () => {
      message.success('Cap nhat nhan vien thanh cong')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Co loi xay ra')
    },
  })

  useEffect(() => {
    if (open) {
      if (employee) {
        form.setFieldsValue({
          ...employee,
          hire_date: employee.hire_date ? dayjs(employee.hire_date) : null,
          date_of_birth: employee.date_of_birth ? dayjs(employee.date_of_birth) : null,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          hire_date: dayjs(),
          contract_type: 'full_time',
          allowances: 0,
          dependents: 0,
        })
      }
    }
  }, [open, employee, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: CreateEmployeeData = {
        ...values,
        hire_date: values.hire_date?.format('YYYY-MM-DD'),
        date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
      }

      if (employee) {
        updateMutation.mutate(data)
      } else {
        createMutation.mutate(data)
      }
    } catch {
      // Validation error
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={employee ? 'Sua nhan vien' : 'Them nhan vien'}
      placement="bottom"
      height="90%"
      extra={
        <Button
          type="primary"
          icon={employee ? <SaveOutlined /> : <UserAddOutlined />}
          onClick={handleSubmit}
          loading={isPending}
        >
          {employee ? 'Luu' : 'Them'}
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className="pb-16"
      >
        <Form.Item
          name="name"
          label="Ho va ten"
          rules={[{ required: true, message: 'Nhap ho ten' }]}
        >
          <Input placeholder="Nguyen Van A" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="So dien thoai"
          rules={[
            { required: true, message: 'Nhap so dien thoai' },
            { pattern: /^0\d{9}$/, message: 'So dien thoai khong hop le' },
          ]}
        >
          <Input placeholder="0901234567" />
        </Form.Item>

        <Form.Item
          name="id_card"
          label="So CCCD/CMND"
          rules={[
            { required: true, message: 'Nhap so CCCD/CMND' },
            { pattern: /^\d{9,12}$/, message: 'So CCCD/CMND khong hop le' },
          ]}
        >
          <Input placeholder="012345678901" />
        </Form.Item>

        <Form.Item name="date_of_birth" label="Ngay sinh">
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item name="address" label="Dia chi">
          <Input placeholder="123 Nguyen Van Linh, Q7, TP.HCM" />
        </Form.Item>

        <Form.Item
          name="position"
          label="Chuc vu"
          rules={[{ required: true, message: 'Chon chuc vu' }]}
        >
          <Select
            placeholder="Chon chuc vu"
            options={positions.map(p => ({ value: p, label: p }))}
            showSearch
            allowClear
            dropdownRender={(menu) => (
              <>
                {menu}
                <div className="text-xs text-gray-400 p-2 border-t">
                  Nhap de them chuc vu moi
                </div>
              </>
            )}
            mode={undefined}
            onSearch={() => {}}
          />
        </Form.Item>

        <Form.Item name="department" label="Phong ban">
          <Input placeholder="VD: Kinh doanh" />
        </Form.Item>

        <Form.Item
          name="hire_date"
          label="Ngay vao lam"
          rules={[{ required: true, message: 'Chon ngay vao lam' }]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="contract_type"
          label="Loai hop dong"
          rules={[{ required: true }]}
        >
          <Select options={CONTRACT_TYPES} />
        </Form.Item>

        <Form.Item
          name="base_salary"
          label="Luong co ban (VND)"
          rules={[{ required: true, message: 'Nhap luong co ban' }]}
        >
          <InputNumber
            className="w-full"
            min={0}
            step={100000}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/,/g, '') as unknown as 0}
            placeholder="8,000,000"
          />
        </Form.Item>

        <Form.Item name="allowances" label="Phu cap (VND)">
          <InputNumber
            className="w-full"
            min={0}
            step={100000}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/,/g, '') as unknown as 0}
            placeholder="1,000,000"
          />
        </Form.Item>

        <Form.Item name="dependents" label="So nguoi phu thuoc">
          <InputNumber className="w-full" min={0} max={10} />
        </Form.Item>

        <div className="text-sm font-medium text-gray-600 mb-2 mt-4">
          Thong tin ngan hang
        </div>

        <Form.Item name="bank_name" label="Ngan hang">
          <Input placeholder="VD: Vietcombank" />
        </Form.Item>

        <Form.Item name="bank_account" label="So tai khoan">
          <Input placeholder="0123456789" />
        </Form.Item>

        <Form.Item name="social_insurance_no" label="So bao hiem xa hoi">
          <Input placeholder="0123456789" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
