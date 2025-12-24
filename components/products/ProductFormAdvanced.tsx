'use client'

import { Form, Input, InputNumber, Select, Button, Upload, Drawer, Switch, Table, Space, Tag, Popconfirm, message, Divider, Typography, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { UploadFile } from 'antd/es/upload/interface'
import type { InputRef } from 'antd'
import type { ProductUnit, ProductVariant, ProductAttribute, ProductAttributeValue } from '@/types/database'
import { api } from '@/lib/supabase/functions'
import { AttributeManagementModal } from './AttributeManagementModal'

const { Text } = Typography

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
  unit_prices?: { unit_id: string; sell_price?: number; cost_price?: number; barcode?: string; sku?: string }[]
}

interface VariantUnitRow {
  key: string
  variant_id?: string
  variant_name: string
  unit_id?: string
  unit_name: string
  conversion_rate: number
  cost_price?: number
  sell_price?: number
  quantity: number
  sku?: string
  barcode?: string
}

interface ProductFormAdvancedProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ProductFormData, units?: UnitFormData[], variants?: VariantFormData[]) => Promise<void>
  categories: Category[]
  onCategoryCreated?: (category: Category) => void
  attributes?: ProductAttribute[]
  onAttributesChange?: (attributes: ProductAttribute[]) => void
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
  attributes: initialAttributes = [],
  onAttributesChange,
  initialValues,
  initialUnits = [],
  initialVariants = [],
  title,
}: ProductFormAdvancedProps) {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm()
  const [variantForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Local attributes state for management
  const [attributes, setAttributes] = useState<ProductAttribute[]>(initialAttributes)

  const UNIT_OPTIONS = [
    'cái', 'chiếc', 'hộp', 'gói', 'chai', 'lon', 'kg', 'gram',
    'lít', 'ml', 'mét', 'bộ', 'đôi', 'cuộn', 'tờ', 'lốc', 'thùng',
  ]

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const categoryInputRef = useRef<InputRef>(null)

  // Units state
  const [units, setUnits] = useState<UnitFormData[]>([])

  // Variants state
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<VariantFormData[]>([])
  const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(null)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const [attributeModalOpen, setAttributeModalOpen] = useState(false)

  // Variant-Unit combination data (for overrides)
  const [variantUnitOverrides, setVariantUnitOverrides] = useState<Map<string, Partial<VariantUnitRow>>>(new Map())

  // Derive hasUnits from units array
  const hasUnits = units.length > 0

  // Get base unit from form
  const baseUnit = Form.useWatch('unit', form) || 'cái'

  // Generate variant-unit combinations
  const variantUnitRows = useMemo<VariantUnitRow[]>(() => {
    if (!hasVariants || variants.length === 0) return []

    // If has units, create combinations for each variant + unit
    if (hasUnits && units.length > 0) {
      const rows: VariantUnitRow[] = []
      variants.forEach(variant => {
        // Add base unit row for variant - reads directly from variant state
        const baseKey = `${variant.id}-base`
        rows.push({
          key: baseKey,
          variant_id: variant.id,
          variant_name: variant.name || 'Unnamed',
          unit_name: baseUnit,
          conversion_rate: 1,
          cost_price: variant.cost_price,
          sell_price: variant.sell_price,
          quantity: variant.quantity,
          sku: variant.sku,
          barcode: variant.barcode,
        })

        // Add rows for other units
        units.forEach(unit => {
          if (unit.is_base_unit) return // Skip base unit, already added
          const key = `${variant.id}-${unit.id}`
          const override = variantUnitOverrides.get(key)
          // Calculate default prices based on variant base price * conversion rate
          const defaultCostPrice = variant.cost_price ? Math.round(variant.cost_price * unit.conversion_rate) : undefined
          const defaultSellPrice = variant.sell_price ? Math.round(variant.sell_price * unit.conversion_rate) : undefined
          rows.push({
            key,
            variant_id: variant.id,
            variant_name: variant.name || 'Unnamed',
            unit_id: unit.id,
            unit_name: unit.unit_name,
            conversion_rate: unit.conversion_rate,
            cost_price: override?.cost_price ?? defaultCostPrice,
            sell_price: override?.sell_price ?? defaultSellPrice,
            quantity: override?.quantity ?? 0,
            sku: override?.sku,
            barcode: override?.barcode,
          })
        })
      })
      return rows
    }

    // Without units, just show variants with base unit
    // Use -base suffix so handleVariantUnitChange updates variant state directly
    return variants.map(variant => ({
      key: `${variant.id}-base`,
      variant_id: variant.id,
      variant_name: variant.name || 'Unnamed',
      unit_name: baseUnit,
      conversion_rate: 1,
      cost_price: variant.cost_price,
      sell_price: variant.sell_price,
      quantity: variant.quantity,
      sku: variant.sku,
      barcode: variant.barcode,
    }))
  }, [hasVariants, hasUnits, variants, units, baseUnit, variantUnitOverrides])

  // Initialize from props - only when drawer opens
  useEffect(() => {
    if (!open) return
    
    // Sync attributes from props
    setAttributes(initialAttributes)
    
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
      setHasVariants(initialValues.has_variants || false)
      if (initialValues.image_url) {
        setFileList([{ uid: '-1', name: 'image', url: initialValues.image_url, status: 'done' }])
      } else {
        setFileList([])
      }
    } else {
      form.resetFields()
      setHasVariants(false)
      setFileList([])
    }
    if (initialUnits && initialUnits.length > 0) {
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
    if (initialVariants && initialVariants.length > 0) {
      // Find base unit from units to extract prices from variant_units
      const baseUnit = initialUnits?.find(u => u.is_base_unit)
      
      setVariants(initialVariants.map(v => {
        // Handle both 'attributes' and 'product_variant_attributes' field names
        const attrs = (v as unknown as { product_variant_attributes?: Array<{ attribute_id: string; attribute_value_id: string }> }).product_variant_attributes || v.attributes || []
        
        // Get variant_units if available (only returned when has_units=true)
        const variantUnits = (v as unknown as { variant_units?: Array<{ 
          unit_id: string
          sell_price?: number | null
          cost_price?: number | null
          barcode?: string | null
          sku?: string | null
          product_units?: { id: string; is_base_unit?: boolean }
        }> }).variant_units || []
        
        // Find base unit entry in variant_units
        const baseUnitEntry = variantUnits.find(vu => {
          const unitId = vu.unit_id || vu.product_units?.id
          return unitId === baseUnit?.id || vu.product_units?.is_base_unit
        })
        
        // Fallback: use variant-level prices when variant_units not available (case 1-1: variants without multi-unit)
        return {
          id: v.id,
          sku: baseUnitEntry?.sku ?? v.sku ?? undefined,
          barcode: baseUnitEntry?.barcode ?? v.barcode ?? undefined,
          name: v.name || undefined,
          cost_price: baseUnitEntry?.cost_price ?? v.cost_price ?? undefined,
          sell_price: baseUnitEntry?.sell_price ?? v.sell_price ?? undefined,
          quantity: v.quantity,
          min_stock: v.min_stock || undefined,
          attribute_values: attrs.map(a => ({
            attribute_id: a.attribute_id,
            value_id: a.attribute_value_id,
          })),
        }
      }))
      
      // Initialize variantUnitOverrides from existing variant_units data
      const overrides = new Map<string, Partial<VariantUnitRow>>()
      initialVariants.forEach(v => {
        const variantUnits = (v as unknown as { variant_units?: Array<{ 
          unit_id: string
          sell_price?: number | null
          cost_price?: number | null
          barcode?: string | null
          sku?: string | null
          product_units?: { id: string }
        }> }).variant_units || []
        variantUnits.forEach(vu => {
          // Get unit_id from either direct field or nested product_units
          const unitId = vu.unit_id || vu.product_units?.id
          if (!unitId) return
          const key = `${v.id}-${unitId}`
          overrides.set(key, {
            sell_price: vu.sell_price ?? undefined,
            cost_price: vu.cost_price ?? undefined,
            barcode: vu.barcode ?? undefined,
            sku: vu.sku ?? undefined,
          })
        })
      })
      setVariantUnitOverrides(overrides)
    } else {
      setVariants([])
      setVariantUnitOverrides(new Map())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleCreateCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      message.warning(t('validation.categoryNameRequired'))
      return
    }

    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      message.warning(t('validation.categoryExists'))
      return
    }

    setCreatingCategory(true)
    try {
      const result = await api.categories.create({ name: trimmedName })
      const newCategory = { id: result.category.id, name: result.category.name }
      onCategoryCreated?.(newCategory)
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
      // Build unit_prices for each variant from variantUnitOverrides
      let variantsWithUnitPrices = variants
      if (hasVariants && hasUnits && units.length > 0) {
        variantsWithUnitPrices = variants.map(variant => {
          const unitPrices: { unit_id: string; sell_price?: number; cost_price?: number; barcode?: string; sku?: string }[] = []
          
          units.forEach(unit => {
            if (unit.is_base_unit) return
            const key = `${variant.id}-${unit.id}`
            const override = variantUnitOverrides.get(key)
            if (override && (override.sell_price !== undefined || override.cost_price !== undefined || override.barcode || override.sku)) {
              unitPrices.push({
                unit_id: unit.id!,
                sell_price: override.sell_price,
                cost_price: override.cost_price,
                barcode: override.barcode,
                sku: override.sku,
              })
            }
          })
          
          return {
            ...variant,
            unit_prices: unitPrices.length > 0 ? unitPrices : undefined,
          }
        })
      }
      
      await onSubmit(
        { ...values, has_variants: hasVariants, has_units: hasUnits },
        hasUnits ? units : undefined,
        hasVariants ? variantsWithUnitPrices : undefined
      )
      form.resetFields()
      setFileList([])
      setUnits([])
      setVariants([])
      setHasVariants(false)
      onClose()
      message.success(initialValues ? t('updateSuccess') : t('createSuccess'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  // Unit management - inline editing
  const handleAddUnit = () => {
    const newUnit: UnitFormData = {
      id: `temp-${Date.now()}`,
      unit_name: '',
      conversion_rate: 1,
      is_base_unit: false,
      is_default: false,
    }
    setUnits(prev => [...prev, newUnit])
  }

  const handleUpdateUnit = (unitId: string, field: keyof UnitFormData, value: unknown) => {
    setUnits(prev => prev.map(u =>
      u.id === unitId ? { ...u, [field]: value } : u
    ))
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

  const handleSaveVariant = (values: Record<string, unknown>) => {
    // Transform attribute_values from { attrId: valueId } to [{ attribute_id, value_id }]
    const attrValuesObj = (values.attribute_values || {}) as Record<string, string>
    const attributeValues = Object.entries(attrValuesObj).map(([attribute_id, value_id]) => ({
      attribute_id,
      value_id,
    }))

    const attrNames = attributeValues.map(av => {
      const attr = attributes.find(a => a.id === av.attribute_id)
      const value = attr?.values?.find(v => v.id === av.value_id)
      return value?.value
    }).filter(Boolean).join(' - ')

    const variantData: VariantFormData = {
      name: (values.name as string) || attrNames || 'Variant',
      sku: values.sku as string | undefined,
      barcode: values.barcode as string | undefined,
      cost_price: values.cost_price as number | undefined,
      sell_price: values.sell_price as number | undefined,
      quantity: (values.quantity as number) || 0,
      min_stock: values.min_stock as number | undefined,
      attribute_values: attributeValues,
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

  const handleAttributesChange = (newAttributes: ProductAttribute[]) => {
    setAttributes(newAttributes)
    onAttributesChange?.(newAttributes)
  }

  const handleVariantUnitChange = (key: string, field: keyof VariantUnitRow, value: unknown) => {
    // Check if this is a base unit row (key ends with "-base")
    if (key.endsWith('-base')) {
      // For base unit, update the variant directly
      const variantId = key.replace('-base', '')
      setVariants(prev => prev.map(v => {
        if (v.id === variantId) {
          // Map field names: VariantUnitRow field -> VariantFormData field
          const fieldMap: Record<string, string> = {
            cost_price: 'cost_price',
            sell_price: 'sell_price',
            quantity: 'quantity',
            sku: 'sku',
            barcode: 'barcode',
          }
          const variantField = fieldMap[field]
          if (variantField) {
            return { ...v, [variantField]: value }
          }
        }
        return v
      }))
    } else {
      // For non-base units, store in overrides
      setVariantUnitOverrides(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(key) || {}
        newMap.set(key, { ...existing, [field]: value })
        return newMap
      })
    }
  }

  const formatPrice = (value: number | undefined) => {
    if (!value) return '-'
    return `${value.toLocaleString('vi-VN')}đ`
  }

  // Variant + Unit combined table columns
  const variantUnitColumns = [
    { 
      title: t('variants.variantName'), 
      dataIndex: 'variant_name', 
      key: 'variant_name',
      width: 100,
      render: (name: string, record: VariantUnitRow, index: number) => {
        // Check if this is the first row for this variant
        const isFirst = index === 0 || variantUnitRows[index - 1]?.variant_id !== record.variant_id
        const rowSpan = isFirst 
          ? variantUnitRows.filter(r => r.variant_id === record.variant_id).length 
          : 0
        return {
          children: <Text strong>{name}</Text>,
          props: { rowSpan },
        }
      },
    },
    { 
      title: t('unit'), 
      dataIndex: 'unit_name', 
      key: 'unit_name',
      width: 80,
    },
    { 
      title: t('costPrice'), 
      key: 'cost_price',
      width: 120,
      render: (_: unknown, record: VariantUnitRow) => (
        <InputNumber<number>
          size="small"
          className="w-full"
          min={0}
          value={record.cost_price}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
          placeholder="-"
          onChange={(v) => handleVariantUnitChange(record.key, 'cost_price', v)}
        />
      ),
    },
    { 
      title: t('sellPrice'), 
      key: 'sell_price',
      width: 120,
      render: (_: unknown, record: VariantUnitRow) => (
        <InputNumber<number>
          size="small"
          className="w-full"
          min={0}
          value={record.sell_price}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
          placeholder="-"
          onChange={(v) => handleVariantUnitChange(record.key, 'sell_price', v)}
        />
      ),
    },
    { 
      title: t('quantity'), 
      key: 'quantity',
      width: 80,
      render: (_: unknown, record: VariantUnitRow) => {
        const isBaseUnit = record.conversion_rate === 1
        if (!isBaseUnit) {
          const baseQty = variants.find(v => v.id === record.variant_id)?.quantity || 0
          const convertedQty = Math.floor(baseQty / record.conversion_rate)
          return <span className="text-gray-400">{convertedQty}</span>
        }
        return (
          <InputNumber<number>
            size="small"
            className="w-full"
            min={0}
            value={record.quantity}
            onChange={(v) => handleVariantUnitChange(record.key, 'quantity', v)}
          />
        )
      },
    },
    { 
      title: t('sku'), 
      key: 'sku',
      width: 100,
      render: (_: unknown, record: VariantUnitRow) => (
        <Input
          size="small"
          value={record.sku}
          placeholder="-"
          onChange={(e) => handleVariantUnitChange(record.key, 'sku', e.target.value)}
        />
      ),
    },
    { 
      title: t('barcode'), 
      key: 'barcode',
      width: 120,
      render: (_: unknown, record: VariantUnitRow) => (
        <Input
          size="small"
          value={record.barcode}
          placeholder="-"
          onChange={(e) => handleVariantUnitChange(record.key, 'barcode', e.target.value)}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: VariantUnitRow) => {
        // Only show delete for base unit rows (one per variant)
        if (!record.key.endsWith('-base')) return null
        return (
          <Popconfirm 
            title={t('variants.deleteConfirm')} 
            onConfirm={() => handleDeleteVariant(record.variant_id!)}
          >
            <Button size="small" type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        )
      },
    },
  ]

  return (
    <Drawer
      title={title || (initialValues ? t('editProduct') : t('addProduct'))}
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 600 } }}
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
        {/* Product Name */}
        <Form.Item
          name="name"
          label={t('productName')}
          rules={[{ required: true, message: t('validation.productNameRequired') }]}
        >
          <Input placeholder={t('productNamePlaceholder')} />
        </Form.Item>

        {/* Category */}
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

        {/* VAT and PIT rates */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="vat_rate" label={t('vatRate')}>
            <Select options={VAT_OPTIONS} />
          </Form.Item>
          <Form.Item name="pit_rate" label="Thuế TNCN" rules={[{ required: true }]}>
            <Select options={PIT_OPTIONS} />
          </Form.Item>
        </div>

        {/* Unit Section */}
        <Divider className="!mb-3 !mt-4">
          <Text type="secondary">{t('unit')}</Text>
        </Divider>

        <div className="space-y-3">
          {/* Base unit row */}
          <div className="flex items-center gap-2">
            <Form.Item name="unit" noStyle>
              <Select
                style={{ width: 100 }}
                showSearch
                options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
              />
            </Form.Item>
            <Tag color="blue">{t('units.baseUnit')}</Tag>
            <Button 
              type="link" 
              icon={<PlusOutlined />}
              onClick={handleAddUnit}
            >
              {t('units.addUnit')}
            </Button>
          </div>

          {/* Conversion units list - inline editing */}
          {units.filter(u => !u.is_base_unit).length > 0 && (
            <div className="space-y-2">
              {units.filter(u => !u.is_base_unit).map(unit => (
                <div key={unit.id} className="flex items-center gap-2">
                  <Input
                    style={{ width: 100, height: 32 }}
                    value={unit.unit_name}
                    placeholder="lốc, thùng..."
                    onChange={(e) => handleUpdateUnit(unit.id!, 'unit_name', e.target.value)}
                  />
                  <Text type="secondary">=</Text>
                  <InputNumber
                    style={{ width: 70 }}
                    min={1}
                    value={unit.conversion_rate}
                    onChange={(v) => handleUpdateUnit(unit.id!, 'conversion_rate', v || 1)}
                  />
                  <Text type="secondary">{baseUnit}</Text>
                  <Popconfirm title={t('units.deleteConfirm')} onConfirm={() => handleDeleteUnit(unit.id!)}>
                    <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants Section */}
        <Divider className="!mb-3 !mt-4">
          <Text type="secondary">{t('productVariants')}</Text>
        </Divider>

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Switch checked={hasVariants} onChange={setHasVariants} />
              <span>{t('enableVariants')}</span>
            </div>
          </div>
          <Text type="secondary" className="text-xs">
            {t('productVariantsDescription')}
          </Text>
        </div>

        {hasVariants && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button icon={<SettingOutlined />} onClick={() => setAttributeModalOpen(true)}>
                {t('manageAttributes')}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVariant}>
                {t('variants.addVariant')}
              </Button>
            </div>

            {/* Variant + Unit Table */}
            {variantUnitRows.length > 0 && (
              <Table
                dataSource={variantUnitRows}
                columns={variantUnitColumns}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: 720 }}
                bordered
              />
            )}

            {variants.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {t('variants.noVariants')}
              </div>
            )}
          </div>
        )}

        {/* Price/SKU/Quantity Section - only show when NO variants */}
        {!hasVariants && (
          <>
            <Divider className="!mb-3 !mt-4">
              <Text type="secondary">{t('costPrice')} / {t('sellPrice')}</Text>
            </Divider>

            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[750px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-24">{t('unit')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-24">{t('costPrice')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-24">{t('sellPrice')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-20">{t('sku')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-24">{t('barcode')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-20">{t('quantity')}</th>
                    <th className="border border-gray-200 px-2 py-2 text-left text-sm font-medium w-20">{t('minStock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Base unit row */}
                  <tr>
                    <td className="border border-gray-200 px-2 py-1">
                      <Text strong>{baseUnit}</Text>
                      <Tag color="blue" className="ml-1 text-xs">{t('units.baseUnit')}</Tag>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="cost_price" noStyle>
                        <InputNumber<number>
                          className="w-full"
                          size="small"
                          min={0}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                        />
                      </Form.Item>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="sell_price" noStyle>
                        <InputNumber<number>
                          className="w-full"
                          size="small"
                          min={0}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                        />
                      </Form.Item>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="sku" noStyle>
                        <Input size="small" placeholder="-" />
                      </Form.Item>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="barcode" noStyle>
                        <Input size="small" placeholder="-" />
                      </Form.Item>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="quantity" noStyle>
                        <InputNumber className="w-full" size="small" min={0} />
                      </Form.Item>
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <Form.Item name="min_stock" noStyle>
                        <InputNumber className="w-full" size="small" min={0} />
                      </Form.Item>
                    </td>
                  </tr>
                  {/* Conversion units */}
                  {units.filter(u => !u.is_base_unit).map(unit => {
                    const baseCost = form.getFieldValue('cost_price') || 0
                    const baseSell = form.getFieldValue('sell_price') || 0
                    const autoCost = Math.round(baseCost * unit.conversion_rate)
                    const autoSell = Math.round(baseSell * unit.conversion_rate)
                    return (
                      <tr key={unit.id}>
                        <td className="border border-gray-200 px-2 py-1">
                          <Text>{unit.unit_name}</Text>
                          <Text type="secondary" className="ml-1 text-xs">= {unit.conversion_rate} {baseUnit}</Text>
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <InputNumber<number>
                            className="w-full"
                            size="small"
                            min={0}
                            value={unit.cost_price}
                            placeholder={autoCost > 0 ? String(autoCost) : '-'}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                            onChange={(v) => handleUpdateUnit(unit.id!, 'cost_price', v)}
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <InputNumber<number>
                            className="w-full"
                            size="small"
                            min={0}
                            value={unit.sell_price}
                            placeholder={autoSell > 0 ? String(autoSell) : '-'}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                            onChange={(v) => handleUpdateUnit(unit.id!, 'sell_price', v)}
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <Input
                            size="small"
                            value={unit.barcode}
                            placeholder="-"
                            onChange={(e) => handleUpdateUnit(unit.id!, 'barcode', e.target.value)}
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <Input
                            size="small"
                            value={unit.barcode}
                            placeholder="-"
                            onChange={(e) => handleUpdateUnit(unit.id!, 'barcode', e.target.value)}
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1 text-center text-gray-400">
                          -
                        </td>
                        <td className="border border-gray-200 px-1 py-1 text-center text-gray-400">
                          -
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          
          </>
        )}

        {/* Image upload */}
        <Form.Item name="image_url" label={t('image')} className="mt-4">
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

      {/* Variant Form Modal */}
      <Modal
        title={editingVariant ? t('variants.editVariant') : t('variants.addVariant')}
        open={variantModalOpen}
        onCancel={() => setVariantModalOpen(false)}
        onOk={() => variantForm.submit()}
        okText={tCommon('save')}
        cancelText={tCommon('cancel')}
        width={500}
      >
        <Form form={variantForm} layout="vertical" onFinish={handleSaveVariant}>
          {attributes.length > 0 && (
            <Form.Item label={t('variants.applicableAttributes')}>
              <Select
                mode="multiple"
                placeholder={t('variants.selectAttributes')}
                className="w-full"
                value={selectedAttributes}
                onChange={setSelectedAttributes}
                options={attributes.map(a => ({ label: a.name, value: a.id }))}
              />
            </Form.Item>
          )}

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

          {!hasUnits && (
            <>
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
                    addonAfter="đ"
                  />
                </Form.Item>
                <Form.Item name="sell_price" label={t('sellPrice')}>
                  <InputNumber<number>
                    className="w-full"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as number}
                    placeholder={t('variants.basePricePlaceholder')}
                    addonAfter="đ"
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
            </>
          )}

          {hasUnits && (
            <Text type="secondary" className="block mt-2">
              {t('variants.unitPricesHint')}
            </Text>
          )}
        </Form>
      </Modal>

      {/* Attribute Management Modal */}
      <AttributeManagementModal
        open={attributeModalOpen}
        onClose={() => setAttributeModalOpen(false)}
        attributes={attributes}
        onAttributesChange={handleAttributesChange}
      />
    </Drawer>
  )
}
