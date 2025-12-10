'use client'

import { Form, Input, InputNumber, Select, Button, Upload, Drawer, Tabs, Switch, Table, Space, Tag, Popconfirm, message, Divider } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
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
  pit_rate: number
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
  { label: '1% - Phân phối hàng hóa', value: 1 },
  { label: '2% - HĐKD khác', value: 2 },
  { label: '3% - SX, vận tải', value: 3 },
  { label: '5% - Dịch vụ/XD', value: 5 },
]

const PIT_OPTIONS = [
  { label: '0.5% - Phân phối hàng hóa', value: 0.5 },
  { label: '1% - HĐKD khác', value: 1 },
  { label: '1.5% - SX, vận tải', value: 1.5 },
  { label: '2% - Dịch vụ/XD', value: 2 },
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
  title,
}: ProductFormAdvancedProps) {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [variantForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [activeTab, setActiveTab] = useState('basic')

  const UNIT_OPTIONS = [
    'cái', 'chiếc', 'hộp', 'gói', 'chai', 'lon', 'kg', 'gram',
    'lít', 'ml', 'mét', 'bộ', 'đôi', 'cuộn', 'tờ',
  ]

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
      form.setFieldsValue({
        vat_rate: 1,
        pit_rate: 0.5,
        quantity: 0,
        min_stock: 10,
        unit: 'cái',
        cost_price: 0,
        ...initialValues,
      })
      setHasUnits(initialValues.has_units || false)
      setHasVariants(initialValues.has_variants || false)
      if (initialValues.image_url) {
        setFileList([{ uid: '-1', name: 'image', url: initialValues.image_url, status: 'done' }])
      } else {
        setFileList([])
      }
    } else {
      form.resetFields()
      setHasUnits(false)
      setHasVariants(false)
      setFileList([])
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
    } else {
      setUnits([])
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
    } else {
      setVariants([])
    }
  }, [initialValues, initialUnits, initialVariants, form])

  const handleCreateCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      message.warning(t('validation.categoryNameRequired'))
      return
    }

    // Check if category already exists
    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      message.warning(t('validation.categoryExists'))
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
      message.success(t('categoryCreated', { name: trimmedName }))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tCommon('error'))
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
      message.success(initialValues ? t('updateSuccess') : t('createSuccess'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tCommon('error'))
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
    { title: t('unit'), dataIndex: 'unit_name', key: 'unit_name' },
    {
      title: t('units.conversionRate'),
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      render: (rate: number) => `x${rate}`,
    },
    { title: t('barcode'), dataIndex: 'barcode', key: 'barcode', render: (v: string) => v || '-' },
    {
      title: t('sellPrice'),
      dataIndex: 'sell_price',
      key: 'sell_price',
      render: formatPrice,
    },
    {
      title: tCommon('status'),
      key: 'status',
      render: (_: unknown, record: UnitFormData) => (
        <Space>
          {record.is_base_unit && <Tag color="blue">{t('units.baseUnit')}</Tag>}
          {record.is_default && <Tag color="green">{t('units.default')}</Tag>}
        </Space>
      ),
    },
    {
      title: tCommon('actions'),
      key: 'actions',
      render: (_: unknown, record: UnitFormData) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUnit(record)} />
          <Popconfirm title={t('units.deleteConfirm')} onConfirm={() => handleDeleteUnit(record.id!)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const variantColumns = [
    { title: t('variants.variantName'), dataIndex: 'name', key: 'name' },
    { title: t('sku'), dataIndex: 'sku', key: 'sku', render: (v: string) => v || '-' },
    { title: t('barcode'), dataIndex: 'barcode', key: 'barcode', render: (v: string) => v || '-' },
    { title: t('quantity'), dataIndex: 'quantity', key: 'quantity' },
    {
      title: t('sellPrice'),
      dataIndex: 'sell_price',
      key: 'sell_price',
      render: formatPrice,
    },
    {
      title: tCommon('actions'),
      key: 'actions',
      render: (_: unknown, record: VariantFormData) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditVariant(record)} />
          <Popconfirm title={t('variants.deleteConfirm')} onConfirm={() => handleDeleteVariant(record.id!)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'basic',
      label: t('tabs.basicInfo'),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            vat_rate: 1,
            pit_rate: 0.5,
            quantity: 0,
            min_stock: 10,
            unit: 'cái',
            cost_price: 0,
            ...initialValues,
          }}
        >
          <Form.Item
            name="name"
            label={t('productName')}
            rules={[{ required: true, message: t('validation.productNameRequired') }]}
          >
            <Input placeholder={t('productNamePlaceholder')} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sku" label={t('sku')}>
              <Input placeholder="SKU001" />
            </Form.Item>
            <Form.Item name="barcode" label={t('barcode')}>
              <Input placeholder="8934563..." />
            </Form.Item>
          </div>

          <Form.Item name="category_id" label={t('category')}>
            <Select
              placeholder={tCommon('selectCategory')}
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
                      placeholder={t('newCategoryPlaceholder')}
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
                      {tCommon('add')}
                    </Button>
                  </Space>
                </>
              )}
            />
          </Form.Item>

          {!hasVariants && (
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="cost_price"
                label={t('costPrice')}
                rules={[{ required: !hasVariants, message: t('validation.costPriceRequired') }]}
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
                label={t('sellPrice')}
                rules={[{ required: !hasVariants, message: t('validation.sellPriceRequired') }]}
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="vat_rate" label={t('vatRate')}>
              <Select options={VAT_OPTIONS} />
            </Form.Item>
            <Form.Item name="pit_rate" label="Thuế TNCN" rules={[{ required: true }]}>
              <Select options={PIT_OPTIONS} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="unit" label={t('units.baseUnit')}>
              <Select
                showSearch
                options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
              />
            </Form.Item>
          </div>

          {!hasVariants && (
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="quantity" label={t('quantity')}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item name="min_stock" label={t('minStock')}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </div>
          )}

          <Form.Item name="image_url" label={t('image')}>
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
                  <div className="mt-2">{t('uploadImage')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'units',
      label: t('tabs.multiUnit'),
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={hasUnits} onChange={setHasUnits} />
              <span>{t('enableMultiUnit')}</span>
            </div>
            {hasUnits && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUnit}>
                {t('units.addUnit')}
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
              locale={{ emptyText: t('units.noUnits') }}
            />
          )}

          {/* Unit Form Modal */}
          <Drawer
            title={editingUnit ? t('units.editUnit') : t('units.addUnit')}
            open={unitModalOpen}
            onClose={() => setUnitModalOpen(false)}
            styles={{ wrapper: { width: 360 } }}
            footer={
              <div className="flex gap-2">
                <Button onClick={() => setUnitModalOpen(false)} className="flex-1">{tCommon('cancel')}</Button>
                <Button type="primary" onClick={() => unitForm.submit()} className="flex-1">{tCommon('save')}</Button>
              </div>
            }
          >
            <Form form={unitForm} layout="vertical" onFinish={handleSaveUnit}>
              <Form.Item
                name="unit_name"
                label={t('units.unitName')}
                rules={[{ required: true, message: t('validation.unitNameRequired') }]}
              >
                <Select
                  showSearch
                  allowClear
                  options={UNIT_OPTIONS.map(u => ({ label: u, value: u }))}
                  placeholder={t('units.unitNamePlaceholder')}
                />
              </Form.Item>

              <Form.Item
                name="conversion_rate"
                label={t('units.conversionRateLabel')}
                rules={[{ required: true, message: t('validation.conversionRateRequired') }]}
                extra={t('units.conversionRateHelp')}
              >
                <InputNumber className="w-full" min={0.0001} step={0.01} />
              </Form.Item>

              <Form.Item name="barcode" label={t('units.separateBarcode')}>
                <Input placeholder={t('units.barcodePlaceholder')} />
              </Form.Item>

              <Form.Item name="sell_price" label={t('units.separateSellPrice')}>
                <InputNumber<number>
                  className="w-full"
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                  placeholder={t('units.autoCalculate')}
                  addonAfter="d"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="is_base_unit" label={t('units.baseUnit')} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="is_default" label={t('units.defaultAtPOS')} valuePropName="checked">
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
      label: t('tabs.variants'),
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={hasVariants} onChange={setHasVariants} />
              <span>{t('enableVariants')}</span>
            </div>
            {hasVariants && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVariant}>
                {t('variants.addVariant')}
              </Button>
            )}
          </div>

          {hasVariants && attributes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">{t('variants.applicableAttributes')}</label>
              <Select
                mode="multiple"
                placeholder={t('variants.selectAttributes')}
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
              locale={{ emptyText: t('variants.noVariants') }}
            />
          )}

          {/* Variant Form Modal */}
          <Drawer
            title={editingVariant ? t('variants.editVariant') : t('variants.addVariant')}
            open={variantModalOpen}
            onClose={() => setVariantModalOpen(false)}
            styles={{ wrapper: { width: 400 } }}
            footer={
              <div className="flex gap-2">
                <Button onClick={() => setVariantModalOpen(false)} className="flex-1">{tCommon('cancel')}</Button>
                <Button type="primary" onClick={() => variantForm.submit()} className="flex-1">{tCommon('save')}</Button>
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
                    rules={[{ required: true, message: `${tCommon('select')} ${attr.name}` }]}
                  >
                    <Select
                      placeholder={`${tCommon('select')} ${attr.name}`}
                      options={attr.values?.map(v => ({ label: v.value, value: v.id })) || []}
                    />
                  </Form.Item>
                )
              })}

              <Form.Item name="name" label={t('variants.variantNameOptional')}>
                <Input placeholder={t('variants.autoGeneratePlaceholder')} />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="sku" label={t('sku')}>
                  <Input placeholder={t('variants.skuPlaceholder')} />
                </Form.Item>
                <Form.Item name="barcode" label={t('barcode')}>
                  <Input placeholder={t('variants.barcodePlaceholder')} />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="cost_price" label={t('costPrice')}>
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                    placeholder={t('variants.basePricePlaceholder')}
                    addonAfter="d"
                  />
                </Form.Item>
                <Form.Item name="sell_price" label={t('sellPrice')}>
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                    placeholder={t('variants.basePricePlaceholder')}
                    addonAfter="d"
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="quantity"
                  label={t('quantity')}
                  rules={[{ required: true, message: t('validation.quantityRequired') }]}
                >
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                  />
                </Form.Item>
                <Form.Item name="min_stock" label={t('minStock')}>
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                  />
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
      title={title || (initialValues ? t('editProduct') : t('addProduct'))}
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 500 } }}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">{tCommon('cancel')}</Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
            className="flex-1"
          >
            {initialValues ? tCommon('update') : tCommon('add')}
          </Button>
        </div>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Drawer>
  )
}
