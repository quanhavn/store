'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Form, Input, Select, InputNumber } from 'antd'
import type { Category } from '@/lib/supabase/functions'

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: { name: string; parent_id?: string | null; sort_order?: number }) => Promise<void>
  categories: Category[]
  initialValues?: Category
  parentCategory?: Category
  title: string
  loading?: boolean
}

export function CategoryForm({
  open,
  onClose,
  onSubmit,
  categories,
  initialValues,
  parentCategory,
  title,
  loading,
}: CategoryFormProps) {
  const t = useTranslations('categories')
  const tCommon = useTranslations('common')
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          parent_id: initialValues.parent_id,
          sort_order: initialValues.sort_order,
        })
      } else if (parentCategory) {
        form.setFieldsValue({
          name: '',
          parent_id: parentCategory.id,
          sort_order: 0,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, initialValues, parentCategory, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
      form.resetFields()
      onClose()
    } catch {
      // Validation error, form will show error message
    }
  }

  // Filter out the current category and its children from parent options
  const getAvailableParents = () => {
    if (!initialValues) {
      return categories
    }

    const getDescendantIds = (category: Category): string[] => {
      const ids = [category.id]
      if (category.children) {
        category.children.forEach(child => {
          ids.push(...getDescendantIds(child))
        })
      }
      return ids
    }

    // Find the current category in the flat list to get its tree structure
    const currentCat = categories.find(c => c.id === initialValues.id)
    const excludeIds = currentCat ? getDescendantIds(currentCat) : [initialValues.id]

    return categories.filter(c => !excludeIds.includes(c.id))
  }

  const availableParents = getAvailableParents()

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText={initialValues ? tCommon('update') : tCommon('create')}
      cancelText={tCommon('cancel')}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="name"
          label={t('name')}
          rules={[{ required: true, message: t('nameRequired') }]}
        >
          <Input placeholder={t('namePlaceholder')} autoFocus />
        </Form.Item>

        {!parentCategory && (
          <Form.Item
            name="parent_id"
            label={t('parentCategory')}
          >
            <Select
              placeholder={t('parentCategoryPlaceholder')}
              allowClear
              options={[
                { value: '', label: t('noParent') },
                ...availableParents.map(c => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          name="sort_order"
          label={t('sortOrder')}
          initialValue={0}
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
