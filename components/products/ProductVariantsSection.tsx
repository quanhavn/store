'use client'

import { Button, Input, InputNumber, Table, Space, Popconfirm, Select, Tag, Modal, Form, message } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { ColumnsType } from 'antd/es/table'
import type { ProductAttribute, ProductAttributeValue } from '@/lib/supabase/functions'

export interface ProductVariantInput {
  id?: string
  sku?: string
  barcode?: string
  name?: string
  cost_price?: number
  sell_price?: number
  quantity: number
  min_stock?: number
  attribute_values?: { attribute_id: string; value_id: string }[]
}

interface ProductVariantsSectionProps {
  variants: ProductVariantInput[]
  onChange: (variants: ProductVariantInput[]) => void
  attributes: ProductAttribute[]
  baseCostPrice?: number
  baseSellPrice?: number
  baseMinStock?: number
  disabled?: boolean
  onCreateAttribute?: () => void
}

export function ProductVariantsSection({
  variants,
  onChange,
  attributes,
  baseCostPrice = 0,
  baseSellPrice = 0,
  baseMinStock = 10,
  disabled = false,
  onCreateAttribute,
}: ProductVariantsSectionProps) {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const [editingVariant, setEditingVariant] = useState<ProductVariantInput | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const handleAdd = () => {
    const newVariant: ProductVariantInput = {
      id: `temp-${Date.now()}`,
      name: '',
      quantity: 0,
      cost_price: baseCostPrice,
      sell_price: baseSellPrice,
      min_stock: baseMinStock,
      attribute_values: [],
    }
    setEditingVariant(newVariant)
    form.setFieldsValue({
      ...newVariant,
      attributes: {},
    })
    setIsModalOpen(true)
  }

  const handleEdit = (variant: ProductVariantInput) => {
    setEditingVariant(variant)
    
    const attributeValues: Record<string, string> = {}
    variant.attribute_values?.forEach(av => {
      attributeValues[av.attribute_id] = av.value_id
    })
    
    form.setFieldsValue({
      ...variant,
      attributes: attributeValues,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    onChange(variants.filter(v => v.id !== id))
  }

  const handleSaveVariant = () => {
    form.validateFields().then(values => {
      const { attributes: attrValues, ...variantData } = values
      
      const attributeValuesList = Object.entries(attrValues || {})
        .filter(([_, valueId]) => valueId)
        .map(([attrId, valueId]) => ({
          attribute_id: attrId,
          value_id: valueId as string,
        }))

      const generatedName = generateVariantName(attributeValuesList)
      
      const updatedVariant: ProductVariantInput = {
        ...editingVariant,
        ...variantData,
        name: variantData.name || generatedName,
        attribute_values: attributeValuesList,
      }

      if (editingVariant?.id?.startsWith('temp-')) {
        const existingIndex = variants.findIndex(v => v.id === editingVariant.id)
        if (existingIndex >= 0) {
          const newVariants = [...variants]
          newVariants[existingIndex] = updatedVariant
          onChange(newVariants)
        } else {
          onChange([...variants, updatedVariant])
        }
      } else {
        onChange(variants.map(v => v.id === editingVariant?.id ? updatedVariant : v))
      }

      setIsModalOpen(false)
      setEditingVariant(null)
      form.resetFields()
    })
  }

  const generateVariantName = (attrValues: { attribute_id: string; value_id: string }[]) => {
    return attrValues.map(av => {
      const attr = attributes.find(a => a.id === av.attribute_id)
      const value = attr?.values?.find(v => v.id === av.value_id)
      return value?.value || ''
    }).filter(Boolean).join(' - ')
  }

  const getVariantAttributeDisplay = (variant: ProductVariantInput) => {
    if (!variant.attribute_values?.length) return null
    
    return (
      <Space size={[4, 4]} wrap>
        {variant.attribute_values.map(av => {
          const attr = attributes.find(a => a.id === av.attribute_id)
          const value = attr?.values?.find(v => v.id === av.value_id)
          return (
            <Tag key={av.value_id} color="blue" className="text-xs">
              {attr?.name}: {value?.value}
            </Tag>
          )
        })}
      </Space>
    )
  }

  const formatCurrency = (value: number | undefined) => {
    if (!value && value !== 0) return '-'
    return `${value.toLocaleString('vi-VN')}đ`
  }

  const columns: ColumnsType<ProductVariantInput> = [
    {
      title: t('variants.variantName'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (value, record) => (
        <div>
          <div className="font-medium">{value || t('variants.unnamed')}</div>
          {getVariantAttributeDisplay(record)}
        </div>
      ),
    },
    {
      title: t('sku'),
      dataIndex: 'sku',
      key: 'sku',
      width: 100,
      render: (value) => value || '-',
    },
    {
      title: t('sellPrice'),
      dataIndex: 'sell_price',
      key: 'sell_price',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: t('quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={disabled}
            size="small"
          />
          <Popconfirm
            title={t('variants.deleteConfirm')}
            onConfirm={() => handleDelete(record.id!)}
            disabled={disabled}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={disabled}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{t('variants.title')}</span>
        <Space>
          {onCreateAttribute && (
            <Button
              type="link"
              size="small"
              onClick={onCreateAttribute}
              disabled={disabled}
            >
              {t('manageAttributes')}
            </Button>
          )}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled}
          >
            {t('variants.addVariant')}
          </Button>
        </Space>
      </div>

      {attributes.length === 0 && (
        <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
          {t('variants.noAttributesWarning')}
        </div>
      )}

      <Table
        dataSource={variants}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
        locale={{ emptyText: t('variants.noVariants') }}
      />

      <Modal
        title={editingVariant?.id?.startsWith('temp-') ? t('variants.addVariant') : t('variants.editVariant')}
        open={isModalOpen}
        onOk={handleSaveVariant}
        onCancel={() => {
          setIsModalOpen(false)
          setEditingVariant(null)
          form.resetFields()
        }}
        okText={tCommon('save')}
        cancelText={tCommon('cancel')}
        width={500}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label={t('variants.variantName')}>
            <Input placeholder={t('variants.variantNamePlaceholder')} />
          </Form.Item>

          {attributes.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">{t('variants.attributes')}</div>
              <div className="space-y-3">
                {attributes.map(attr => (
                  <Form.Item
                    key={attr.id}
                    name={['attributes', attr.id]}
                    label={attr.name}
                    className="mb-2"
                  >
                    <Select
                      placeholder={`${tCommon('select')} ${attr.name}`}
                      allowClear
                      options={attr.values?.map(v => ({
                        label: v.value,
                        value: v.id,
                      }))}
                    />
                  </Form.Item>
                ))}
              </div>
            </div>
          )}

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
                className="!w-full"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
                addonAfter="d"
              />
            </Form.Item>
            <Form.Item
              name="sell_price"
              label={t('sellPrice')}
              rules={[{ required: true, message: t('validation.sellPriceRequired') }]}
            >
              <InputNumber<number>
                className="!w-full"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
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
                className="!w-full"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
              />
            </Form.Item>
            <Form.Item name="min_stock" label={t('minStock')}>
              <InputNumber<number>
                className="!w-full"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => (v ? Number(v.replace(/,/g, '')) : 0) as number}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
