'use client'

import { Form, Input, InputNumber, Select, Button, Upload, Drawer, Tabs, Switch, Table, Space, Tag, Popconfirm, message, Divider } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import type { InputRef } from 'antd'
import type { ProductUnit, ProductVariant, ProductAttribute, ProductAttributeValue } from '@/types/database'
import { api } from '@/lib/supabase/functions'

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
  has_variants?: boolean
  has_units?: boolean
}

interface UnitFormData {
  id?: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
}

interface VariantFormData {
  id?: string
  sku?: string
  barcode?: string
  name?: string
  cost_price?: number
  sell_price?: number
  quantity: number
  min_stock?: number
  attribute_values: { attribute_id: string; value_id: string }[]
}

interface ProductFormAdvancedProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ProductFormData, units?: UnitFormData[], variants?: VariantFormData[]) => Promise<void>
  categories: Category[]
  onCategoryCreated?: (category: Category) => void
  attributes?: ProductAttribute[]
  initialValues?: Partial<ProductFormData>
  initialUnits?: ProductUnit[]
  initialVariants?: ProductVariant[]
  title?: string
}

const VAT_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '8%', value: 8 },
  { label: '10%', value: 10 },
]

const UNIT_OPTIONS = [
  'cái', 'chiếc', 'hộp', 'gói', 'chai', 'lon', 'kg', 'gram',
  'lít', 'ml', 'mét', 'bộ', 'đôi', 'cuộn', 'tờ',
]

export function ProductFormAdvanced({
  open,
  onClose,
  onSubmit,
  categories,
  onCategoryCreated,
  attributes = [],
  initialValues,
  initialUnits = [],
  initialVariants = [],
  title = 'Thêm sản phẩm',
}: ProductFormAdvancedProps) {
  const [form] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [variantForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [activeTab, setActiveTab] = useState('basic')

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const categoryInputRef = useRef<InputRef>(null)

  // Units state
  const [hasUnits, setHasUnits] = useState(false)
  const [units, setUnits] = useState<UnitFormData[]>([])
  const [editingUnit, setEditingUnit] = useState<UnitFormData | null>(null)
  const [unitModalOpen, setUnitModalOpen] = useState(false)

  // Variants state
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<VariantFormData[]>([])
  const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])

  // Initialize from props
  useEffect(() => {
    if (initialValues) {
      setHasUnits(initialValues.has_units || false)
      setHasVariants(initialValues.has_variants || false)
    }
    if (initialUnits.length > 0) {
      setUnits(initialUnits.map(u => ({
        id: u.id,
        unit_name: u.unit_name,
        conversion_rate: u.conversion_rate,
        barcode: u.barcode || undefined,
        sell_price: u.sell_price || undefined,
        cost_price: u.cost_price || undefined,
        is_base_unit: u.is_base_unit,
        is_default: u.is_default,
      })))
    }
    if (initialVariants.length > 0) {
      setVariants(initialVariants.map(v => ({
        id: v.id,
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        name: v.name || undefined,
        cost_price: v.cost_price || undefined,
        sell_price: v.sell_price || undefined,
        quantity: v.quantity,
        min_stock: v.min_stock || undefined,
        attribute_values: v.attributes?.map(a => ({
          attribute_id: a.attribute_id,
          value_id: a.attribute_value_id,
        })) || [],
      })))
    }
  }, [initialValues, initialUnits, initialVariants])

  const handleCreateCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      message.warning('Vui lòng nhập tên danh mục')
      return
    }

    // Check if category already exists
    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      message.warning('Danh mục này đã tồn tại')
      return
    }

    setCreatingCategory(true)
    try {
      const result = await api.categories.create({ name: trimmedName })
      const newCategory = { id: result.category.id, name: result.category.name }

      // Notify parent to update categories list
      onCategoryCreated?.(newCategory)

      // Set the new category as selected
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
      await onSubmit(
        { ...values, has_variants: hasVariants, has_units: hasUnits },
        hasUnits ? units : undefined,
        hasVariants ? variants : undefined
      )
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

  // Unit management
  const handleAddUnit = () => {
    setEditingUnit(null)
    unitForm.resetFields()
    unitForm.setFieldsValue({
      conversion_rate: 1,
      is_base_unit: units.length === 0,
      is_default: units.length === 0,
    })
    setUnitModalOpen(true)
  }

  const handleSaveUnit = (values: UnitFormData) => {
    if (editingUnit?.id) {
      setUnits(prev => prev.map(u =>
        u.id === editingUnit.id ? { ...values, id: editingUnit.id } : u
      ))
    } else {
      setUnits(prev => [...prev, { ...values, id: `temp-${Date.now()}` }])
    }
    setUnitModalOpen(false)
    setEditingUnit(null)
  }

  const handleEditUnit = (unit: UnitFormData) => {
    setEditingUnit(unit)
    unitForm.setFieldsValue(unit)
    setUnitModalOpen(true)
  }

  const handleDeleteUnit = (unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId))
  }

  // Variant management
  const handleAddVariant = () => {
    setEditingVariant(null)
    variantForm.resetFields()
    variantForm.setFieldsValue({ quantity: 0 })
    setVariantModalOpen(true)
  }

  const handleSaveVariant = (values: VariantFormData) => {
    // Build variant name from selected attributes
    const attrNames = values.attribute_values?.map(av => {
      const attr = attributes.find(a => a.id === av.attribute_id)
      const value = attr?.values?.find(v => v.id === av.value_id)
      return value?.value
    }).filter(Boolean).join(' - ')

    const variantData: VariantFormData = {
      ...values,
      name: values.name || attrNames || 'Variant',
      attribute_values: values.attribute_values || [],
    }

    if (editingVariant?.id) {
      setVariants(prev => prev.map(v =>
        v.id === editingVariant.id ? { ...variantData, id: editingVariant.id } : v
      ))
    } else {
      setVariants(prev => [...prev, { ...variantData, id: `temp-${Date.now()}` }])
    }
    setVariantModalOpen(false)
    setEditingVariant(null)
  }

  const handleEditVariant = (variant: VariantFormData) => {
    setEditingVariant(variant)
    variantForm.setFieldsValue(variant)
    setVariantModalOpen(true)
  }

  const handleDeleteVariant = (variantId: string) => {
    setVariants(prev => prev.filter(v => v.id !== variantId))
  }

  const formatPrice = (value: number | undefined) => {
    if (!value) return '-'
    return `${value.toLocaleString('vi-VN')}đ`
  }

  const unitColumns = [
    { title: 'Đơn vị', dataIndex: 'unit_name', key: 'unit_name' },
    {
      title: 'Tỷ lệ quy đổi',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      render: (rate: number) => `x${rate}`,
    },
    { title: 'Mã vạch', dataIndex: 'barcode', key: 'barcode', render: (v: string) => v || '-' },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      key: 'sell_price',
      render: formatPrice,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: unknown, record: UnitFormData) => (
        <Space>
          {record.is_base_unit && <Tag color="blue">Đơn vị gốc</Tag>}
          {record.is_default && <Tag color="green">Mặc định</Tag>}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: UnitFormData) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUnit(record)} />
          <Popconfirm title="Xóa đơn vị này?" onConfirm={() => handleDeleteUnit(record.id!)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const variantColumns = [
    { title: 'Tên biến thể', dataIndex: 'name', key: 'name' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => v || '-' },
    { title: 'Mã vạch', dataIndex: 'barcode', key: 'barcode', render: (v: string) => v || '-' },
    { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity' },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      key: 'sell_price',
      render: formatPrice,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: VariantFormData) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditVariant(record)} />
          <Popconfirm title="Xóa biến thể này?" onConfirm={() => handleDeleteVariant(record.id!)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'basic',
      label: 'Thông tin cơ bản',
      children: (
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
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="Tên danh mục mới"
                      ref={categoryInputRef}
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
            <Form.Item name="unit" label="Đơn vị gốc">
              <Select
                showSearch
                options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
              />
            </Form.Item>
          </div>

          {!hasVariants && (
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="quantity" label="Tồn kho">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item name="min_stock" label="Tồn tối thiểu">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </div>
          )}

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
      ),
    },
    {
      key: 'units',
      label: 'Đa đơn vị',
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={hasUnits} onChange={setHasUnits} />
              <span>Bật đa đơn vị (VD: thùng = 24 lon)</span>
            </div>
            {hasUnits && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUnit}>
                Thêm đơn vị
              </Button>
            )}
          </div>

          {hasUnits && (
            <Table
              dataSource={units}
              columns={unitColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có đơn vị nào' }}
            />
          )}

          {/* Unit Form Modal */}
          <Drawer
            title={editingUnit ? 'Sửa đơn vị' : 'Thêm đơn vị'}
            open={unitModalOpen}
            onClose={() => setUnitModalOpen(false)}
            width={360}
            footer={
              <div className="flex gap-2">
                <Button onClick={() => setUnitModalOpen(false)} className="flex-1">Hủy</Button>
                <Button type="primary" onClick={() => unitForm.submit()} className="flex-1">Lưu</Button>
              </div>
            }
          >
            <Form form={unitForm} layout="vertical" onFinish={handleSaveUnit}>
              <Form.Item
                name="unit_name"
                label="Tên đơn vị"
                rules={[{ required: true, message: 'Nhập tên đơn vị' }]}
              >
                <Select
                  showSearch
                  allowClear
                  options={UNIT_OPTIONS.map(u => ({ label: u, value: u }))}
                  placeholder="VD: thùng, hộp, kg"
                />
              </Form.Item>

              <Form.Item
                name="conversion_rate"
                label="Tỷ lệ quy đổi (so với đơn vị gốc)"
                rules={[{ required: true, message: 'Nhập tỷ lệ' }]}
                extra="VD: 1 thùng = 24 lon → nhập 24"
              >
                <InputNumber className="w-full" min={0.0001} step={0.01} />
              </Form.Item>

              <Form.Item name="barcode" label="Mã vạch riêng">
                <Input placeholder="Mã vạch cho đơn vị này" />
              </Form.Item>

              <Form.Item name="sell_price" label="Giá bán riêng">
                <InputNumber<number>
                  className="w-full"
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as number}
                  addonAfter="đ"
                  placeholder="Để trống sẽ tính tự động"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="is_base_unit" label="Đơn vị gốc" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="is_default" label="Mặc định ở POS" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </div>
            </Form>
          </Drawer>
        </div>
      ),
    },
    {
      key: 'variants',
      label: 'Biến thể',
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={hasVariants} onChange={setHasVariants} />
              <span>Bật biến thể (size, màu, mùi vị...)</span>
            </div>
            {hasVariants && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVariant}>
                Thêm biến thể
              </Button>
            )}
          </div>

          {hasVariants && attributes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Thuộc tính áp dụng</label>
              <Select
                mode="multiple"
                placeholder="Chọn thuộc tính"
                className="w-full"
                value={selectedAttributes}
                onChange={setSelectedAttributes}
                options={attributes.map(a => ({ label: a.name, value: a.id }))}
              />
            </div>
          )}

          {hasVariants && (
            <Table
              dataSource={variants}
              columns={variantColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có biến thể nào' }}
            />
          )}

          {/* Variant Form Modal */}
          <Drawer
            title={editingVariant ? 'Sửa biến thể' : 'Thêm biến thể'}
            open={variantModalOpen}
            onClose={() => setVariantModalOpen(false)}
            width={400}
            footer={
              <div className="flex gap-2">
                <Button onClick={() => setVariantModalOpen(false)} className="flex-1">Hủy</Button>
                <Button type="primary" onClick={() => variantForm.submit()} className="flex-1">Lưu</Button>
              </div>
            }
          >
            <Form form={variantForm} layout="vertical" onFinish={handleSaveVariant}>
              {selectedAttributes.map(attrId => {
                const attr = attributes.find(a => a.id === attrId)
                if (!attr) return null
                return (
                  <Form.Item
                    key={attrId}
                    name={['attribute_values', attrId]}
                    label={attr.name}
                    rules={[{ required: true, message: `Chọn ${attr.name}` }]}
                  >
                    <Select
                      placeholder={`Chọn ${attr.name}`}
                      options={attr.values?.map(v => ({ label: v.value, value: v.id })) || []}
                    />
                  </Form.Item>
                )
              })}

              <Form.Item name="name" label="Tên biến thể (tùy chọn)">
                <Input placeholder="Để trống sẽ tự động tạo từ thuộc tính" />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="sku" label="SKU">
                  <Input placeholder="SKU riêng" />
                </Form.Item>
                <Form.Item name="barcode" label="Mã vạch">
                  <Input placeholder="Mã vạch riêng" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="cost_price" label="Giá nhập">
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as number}
                    addonAfter="đ"
                    placeholder="Giá sản phẩm gốc"
                  />
                </Form.Item>
                <Form.Item name="sell_price" label="Giá bán">
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as number}
                    addonAfter="đ"
                    placeholder="Giá sản phẩm gốc"
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="quantity"
                  label="Tồn kho"
                  rules={[{ required: true, message: 'Nhập số lượng' }]}
                >
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item name="min_stock" label="Tồn tối thiểu">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
            </Form>
          </Drawer>
        </div>
      ),
    },
  ]

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={500}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">Hủy</Button>
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
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Drawer>
  )
}
