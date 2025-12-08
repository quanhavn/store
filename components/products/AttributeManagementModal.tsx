'use client'

import { Modal, Button, Input, Space, Tag, Popconfirm, message, List, Empty } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import type { ProductAttribute } from '@/lib/supabase/functions'

interface AttributeManagementModalProps {
  open: boolean
  onClose: () => void
  attributes: ProductAttribute[]
  onAttributesChange: (attributes: ProductAttribute[]) => void
}

export function AttributeManagementModal({
  open,
  onClose,
  attributes,
  onAttributesChange,
}: AttributeManagementModalProps) {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [newAttributeName, setNewAttributeName] = useState('')
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [addingValue, setAddingValue] = useState<Record<string, boolean>>({})

  const handleCreateAttribute = async () => {
    const name = newAttributeName.trim()
    if (!name) {
      message.warning(t('validation.attributeNameRequired'))
      return
    }

    if (attributes.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      message.warning(t('validation.attributeExists'))
      return
    }

    setLoading(true)
    try {
      const result = await api.attributes.create({ name })
      onAttributesChange([...attributes, result.attribute])
      setNewAttributeName('')
      message.success(t('attributeCreated', { name }))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tErrors('createAttribute'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAttribute = async (id: string) => {
    setLoading(true)
    try {
      await api.attributes.delete(id)
      onAttributesChange(attributes.filter(a => a.id !== id))
      message.success('Đã xóa thuộc tính')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xóa thuộc tính')
    } finally {
      setLoading(false)
    }
  }

  const handleAddValue = async (attributeId: string) => {
    const value = (newValueInputs[attributeId] || '').trim()
    if (!value) {
      message.warning('Vui lòng nhập giá trị')
      return
    }

    const attr = attributes.find(a => a.id === attributeId)
    if (attr?.values?.some(v => v.value.toLowerCase() === value.toLowerCase())) {
      message.warning('Giá trị đã tồn tại')
      return
    }

    setAddingValue(prev => ({ ...prev, [attributeId]: true }))
    try {
      const result = await api.attributes.addValue(attributeId, value)
      onAttributesChange(attributes.map(a => {
        if (a.id === attributeId) {
          return {
            ...a,
            values: [...(a.values || []), result.value],
          }
        }
        return a
      }))
      setNewValueInputs(prev => ({ ...prev, [attributeId]: '' }))
      message.success(`Đã thêm giá trị "${value}"`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm giá trị')
    } finally {
      setAddingValue(prev => ({ ...prev, [attributeId]: false }))
    }
  }

  const handleRemoveValue = async (valueId: string, attributeId: string) => {
    try {
      await api.attributes.removeValue(valueId)
      onAttributesChange(attributes.map(a => {
        if (a.id === attributeId) {
          return {
            ...a,
            values: (a.values || []).filter(v => v.id !== valueId),
          }
        }
        return a
      }))
      message.success(t('valueDeleted'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : tErrors('deleteValue'))
    }
  }

  return (
    <Modal
      title={t('manageAttributes')}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>{tCommon('close')}</Button>
      }
      width={600}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={t('attributeNamePlaceholder')}
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            onPressEnter={handleCreateAttribute}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateAttribute}
            loading={loading}
          >
            {tCommon('add')}
          </Button>
        </div>

        {attributes.length === 0 ? (
          <Empty
            description={t('noAttributes')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={attributes}
            renderItem={(attr) => (
              <List.Item
                key={attr.id}
                className="!px-0"
              >
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{attr.name}</span>
                    <Popconfirm
                      title={t('deleteAttribute')}
                      description={t('deleteAttributeMessage')}
                      onConfirm={() => handleDeleteAttribute(attr.id)}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        {tCommon('delete')}
                      </Button>
                    </Popconfirm>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {attr.values?.map(v => (
                      <Tag
                        key={v.id}
                        closable
                        onClose={(e) => {
                          e.preventDefault()
                          handleRemoveValue(v.id, attr.id)
                        }}
                      >
                        {v.value}
                      </Tag>
                    ))}
                  </div>

                  <Space.Compact className="w-full max-w-xs">
                    <Input
                      placeholder={t('addValuePlaceholder')}
                      size="small"
                      value={newValueInputs[attr.id] || ''}
                      onChange={(e) => setNewValueInputs(prev => ({
                        ...prev,
                        [attr.id]: e.target.value,
                      }))}
                      onPressEnter={() => handleAddValue(attr.id)}
                    />
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddValue(attr.id)}
                      loading={addingValue[attr.id]}
                    />
                  </Space.Compact>
                </div>
              </List.Item>
            )}
          />
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Ví dụ:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Size: S, M, L, XL</li>
            <li>Màu sắc: Đỏ, Xanh, Vàng</li>
            <li>Hương vị: Dâu, Nho, Cam</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
