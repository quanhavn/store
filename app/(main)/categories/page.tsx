'use client'

import { useState } from 'react'
import { Button, FloatButton, message, Modal, Typography, Empty } from 'antd'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Category } from '@/lib/supabase/functions'
import { CategoryList } from '@/components/categories/CategoryList'
import { CategoryForm } from '@/components/categories/CategoryForm'

const { Title } = Typography

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category>()
  const [parentCategory, setParentCategory] = useState<Category>()

  const queryClient = useQueryClient()

  // Fetch categories (tree structure)
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await api.categories.list()
      return result
    },
  })

  const categories = data?.categories || []
  const flatCategories = data?.flat_categories || []

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; parent_id?: string; sort_order?: number }) => {
      const result = await api.categories.create(data)
      return result.category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      message.success('Tao danh muc thanh cong')
    },
    onError: (error: Error) => {
      message.error(error.message || 'Khong the tao danh muc')
    },
  })

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; parent_id?: string | null; sort_order?: number }) => {
      const result = await api.categories.update(id, data)
      return result.category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      message.success('Cap nhat danh muc thanh cong')
    },
    onError: (error: Error) => {
      message.error(error.message || 'Khong the cap nhat danh muc')
    },
  })

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.categories.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      message.success('Xoa danh muc thanh cong')
    },
    onError: (error: Error) => {
      message.error(error.message || 'Khong the xoa danh muc')
    },
  })

  const handleEdit = (category: Category) => {
    setEditCategory(category)
    setParentCategory(undefined)
    setFormOpen(true)
  }

  const handleAddSubcategory = (parent: Category) => {
    setEditCategory(undefined)
    setParentCategory(parent)
    setFormOpen(true)
  }

  const handleDelete = (category: Category) => {
    Modal.confirm({
      title: 'Xac nhan xoa',
      icon: <ExclamationCircleOutlined />,
      content: `Ban co chac chan muon xoa danh muc "${category.name}"?`,
      okText: 'Xoa',
      okType: 'danger',
      cancelText: 'Huy',
      onOk: () => deleteMutation.mutate(category.id),
    })
  }

  const handleFormSubmit = async (values: { name: string; parent_id?: string | null; sort_order?: number }) => {
    if (editCategory) {
      await updateMutation.mutateAsync({ id: editCategory.id, ...values })
    } else {
      await createMutation.mutateAsync({
        name: values.name,
        parent_id: values.parent_id || parentCategory?.id,
        sort_order: values.sort_order,
      })
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditCategory(undefined)
    setParentCategory(undefined)
  }

  return (
    <div className="p-4 pb-20">
      <div className="mb-4">
        <Title level={4} className="!mb-0">Danh muc san pham</Title>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : categories.length === 0 ? (
        <Empty
          description="Chua co danh muc nao"
          className="py-8"
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditCategory(undefined)
              setParentCategory(undefined)
              setFormOpen(true)
            }}
          >
            Them danh muc
          </Button>
        </Empty>
      ) : (
        <CategoryList
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddSubcategory={handleAddSubcategory}
        />
      )}

      <FloatButton
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditCategory(undefined)
          setParentCategory(undefined)
          setFormOpen(true)
        }}
        style={{ right: 24, bottom: 80 }}
      />

      <CategoryForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        categories={flatCategories}
        initialValues={editCategory}
        parentCategory={parentCategory}
        title={editCategory ? 'Sua danh muc' : parentCategory ? `Them danh muc con cho "${parentCategory.name}"` : 'Them danh muc'}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
