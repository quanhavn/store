'use client'

import { Form, Input, InputNumber, Select, Button, Upload, message, Drawer } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'

interface Category {
  id: string
  name: string
}

interface ProductFormData {
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  cost_price: number
  sell_price: number
  vat_rate: number
  quantity: number
  min_stock: number
  unit: string
  image_url?: string
}

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ProductFormData) => Promise<void>
  categories: Category[]
  initialValues?: Partial<ProductFormData>
  title?: string
}

const VAT_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '8%', value: 8 },
  { label: '10%', value: 10 },
]

const UNIT_OPTIONS = [
  'cái',
  'chiếc',
  'hộp',
  'gói',
  'chai',
  'lon',
  'kg',
  'gram',
  'lít',
  'ml',
  'mét',
  'bộ',
  'đôi',
  'cuộn',
  'tờ',
]

export function ProductForm({
  open,
  onClose,
  onSubmit,
  categories,
  initialValues,
  title = 'Thêm sản phẩm',
}: ProductFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleSubmit = async (values: ProductFormData) => {
    setLoading(true)
    try {
      await onSubmit(values)
      form.resetFields()
      setFileList([])
      onClose()
      message.success(initialValues ? 'Cập nhật thành công' : 'Thêm sản phẩm thành công')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={400}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
            className="flex-1"
          >
            {initialValues ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          vat_rate: 8,
          quantity: 0,
          min_stock: 10,
          unit: 'cái',
          cost_price: 0,
          ...initialValues,
        }}
      >
        <Form.Item
          name="name"
          label="Tên sản phẩm"
          rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
        >
          <Input placeholder="VD: Mì Hảo Hảo" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="sku" label="Mã SKU">
            <Input placeholder="SKU001" />
          </Form.Item>
          <Form.Item name="barcode" label="Mã vạch">
            <Input placeholder="8934563..." />
          </Form.Item>
        </div>

        <Form.Item name="category_id" label="Danh mục">
          <Select
            placeholder="Chọn danh mục"
            allowClear
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="cost_price"
            label="Giá nhập"
            rules={[{ required: true, message: 'Nhập giá nhập' }]}
          >
            <InputNumber<number>
              className="w-full"
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as number}
              addonAfter="đ"
            />
          </Form.Item>
          <Form.Item
            name="sell_price"
            label="Giá bán"
            rules={[{ required: true, message: 'Nhập giá bán' }]}
          >
            <InputNumber<number>
              className="w-full"
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as number}
              addonAfter="đ"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="vat_rate" label="VAT">
            <Select options={VAT_OPTIONS} />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị">
            <Select
              showSearch
              options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="quantity" label="Tồn kho">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="min_stock" label="Tồn tối thiểu">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>

        <Form.Item name="image_url" label="Hình ảnh">
          <Upload
            listType="picture-card"
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
            beforeUpload={() => false}
          >
            {fileList.length === 0 && (
              <div>
                <PlusOutlined />
                <div className="mt-2">Tải ảnh</div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
