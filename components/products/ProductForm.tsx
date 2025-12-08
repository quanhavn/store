'use client'

import { Form, Input, InputNumber, Select, Button, Upload, message, Drawer, Divider, Space, Switch, Collapse, Modal } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useRef, useEffect } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import type { InputRef } from 'antd'
import { api } from '@/lib/supabase/functions'
import type { ProductAttribute, ProductUnitInput, ProductVariantInput } from '@/lib/supabase/functions'
import { ProductUnitsSection } from './ProductUnitsSection'
import { ProductVariantsSection } from './ProductVariantsSection'
import { AttributeManagementModal } from './AttributeManagementModal'

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
  has_units?: boolean
  has_variants?: boolean
  units?: ProductUnitInput[]
  variants?: ProductVariantInput[]
}

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ProductFormData) => Promise<void>
  categories: Category[]
  onCategoryCreated?: (category: Category) => void
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
  onCategoryCreated,
  initialValues,
  title = 'Thêm sản phẩm',
}: ProductFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const inputRef = useRef<InputRef>(null)
  
  const [hasUnits, setHasUnits] = useState(false)
  const [hasVariants, setHasVariants] = useState(false)
  const [units, setUnits] = useState<ProductUnitInput[]>([])
  const [variants, setVariants] = useState<ProductVariantInput[]>([])
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [attributeModalOpen, setAttributeModalOpen] = useState(false)
  const [loadingAttributes, setLoadingAttributes] = useState(false)

  useEffect(() => {
    if (open) {
      loadAttributes()
      
      if (initialValues) {
        setHasUnits(initialValues.has_units || false)
        setHasVariants(initialValues.has_variants || false)
        setUnits(initialValues.units || [])
        setVariants(initialValues.variants || [])
      } else {
        setHasUnits(false)
        setHasVariants(false)
        setUnits([])
        setVariants([])
      }
    }
  }, [open, initialValues])

  const loadAttributes = async () => {
    setLoadingAttributes(true)
    try {
      const result = await api.attributes.list()
      setAttributes(result.attributes || [])
    } catch (error) {
      console.error('Failed to load attributes:', error)
    } finally {
      setLoadingAttributes(false)
    }
  }

  const handleCreateCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      message.warning('Vui lòng nhập tên danh mục')
      return
    }

    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      message.warning('Danh mục này đã tồn tại')
      return
    }

    setCreatingCategory(true)
    try {
      const result = await api.categories.create({ name: trimmedName })
      const newCategory = { id: result.category.id, name: result.category.name }
      onCategoryCreated?.(newCategory)
      form.setFieldValue('category_id', newCategory.id)
      setNewCategoryName('')
      message.success(`Đã tạo danh mục "${trimmedName}"`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tạo danh mục')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleSubmit = async (values: ProductFormData) => {
    setLoading(true)
    try {
      const submitData: ProductFormData = {
        ...values,
        has_units: hasUnits,
        has_variants: hasVariants,
      }

      if (hasUnits && units.length > 0) {
        const hasBaseUnit = units.some(u => u.is_base_unit)
        if (!hasBaseUnit) {
          message.error('Cần có ít nhất một đơn vị cơ bản')
          setLoading(false)
          return
        }
        submitData.units = units
      }

      if (hasVariants && variants.length > 0) {
        submitData.variants = variants
        submitData.quantity = 0
      }

      await onSubmit(submitData)
      form.resetFields()
      setFileList([])
      setUnits([])
      setVariants([])
      setHasUnits(false)
      setHasVariants(false)
      onClose()
      message.success(initialValues ? 'Cập nhật thành công' : 'Thêm sản phẩm thành công')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const formValues = Form.useWatch([], form)

  return (
    <>
      <Drawer
        title={title}
        open={open}
        onClose={onClose}
        styles={{ wrapper: { width: 520 } }}
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
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="Tên danh mục mới"
                      ref={inputRef}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      style={{ width: 180 }}
                    />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={handleCreateCategory}
                      loading={creatingCategory}
                    >
                      Thêm
                    </Button>
                  </Space>
                </>
              )}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="cost_price"
              label="Giá nhập"
              rules={[{ required: true, message: 'Nhập giá nhập' }]}
            >
              <InputNumber<number>
                className="!w-full"
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                addonAfter="đ"
              />
            </Form.Item>
            <Form.Item
              name="sell_price"
              label="Giá bán"
              rules={[{ required: true, message: 'Nhập giá bán' }]}
            >
              <InputNumber<number>
                className="!w-full"
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                addonAfter="đ"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="vat_rate" label="VAT">
              <Select options={VAT_OPTIONS} />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị cơ bản">
              <Select
                showSearch
                options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="quantity" label="Tồn kho" hidden={hasVariants}>
              <InputNumber<number>
                className="!w-full"
                min={0}
                disabled={hasVariants}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
              />
            </Form.Item>
            <Form.Item name="min_stock" label="Tồn tối thiểu">
              <InputNumber<number>
                className="!w-full"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
              />
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

          <Divider className="my-4" />

          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: (
                  <span className="font-medium text-gray-700">
                    <SettingOutlined className="mr-2" />
                    Tùy chọn nâng cao
                  </span>
                ),
                children: (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Nhiều đơn vị tính</div>
                        <div className="text-xs text-gray-500">
                          VD: Bán theo hộp (12 cái) hoặc theo cái
                        </div>
                      </div>
                      <Switch
                        checked={hasUnits}
                        onChange={setHasUnits}
                      />
                    </div>

                    {hasUnits && (
                      <ProductUnitsSection
                        units={units}
                        onChange={setUnits}
                        baseUnit={formValues?.unit || 'cái'}
                        baseSellPrice={formValues?.sell_price || 0}
                        baseCostPrice={formValues?.cost_price || 0}
                      />
                    )}

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Biến thể sản phẩm</div>
                        <div className="text-xs text-gray-500">
                          VD: Size S/M/L, Màu đỏ/xanh/vàng
                        </div>
                      </div>
                      <Switch
                        checked={hasVariants}
                        onChange={setHasVariants}
                      />
                    </div>

                    {hasVariants && (
                      <ProductVariantsSection
                        variants={variants}
                        onChange={setVariants}
                        attributes={attributes}
                        baseCostPrice={formValues?.cost_price || 0}
                        baseSellPrice={formValues?.sell_price || 0}
                        baseMinStock={formValues?.min_stock || 10}
                        onCreateAttribute={() => setAttributeModalOpen(true)}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>

      <AttributeManagementModal
        open={attributeModalOpen}
        onClose={() => {
          setAttributeModalOpen(false)
          loadAttributes()
        }}
        attributes={attributes}
        onAttributesChange={setAttributes}
      />
    </>
  )
}
