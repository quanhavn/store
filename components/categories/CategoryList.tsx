'use client'

import { Card, Button, Space, Typography } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { Category } from '@/lib/supabase/functions'

const { Text } = Typography

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onAddSubcategory: (parent: Category) => void
  level?: number
}

export function CategoryList({ categories, onEdit, onDelete, onAddSubcategory, level = 0 }: CategoryListProps) {
  if (categories.length === 0) {
    return null
  }

  return (
    <div className={level > 0 ? 'ml-4 border-l-2 border-gray-200 pl-4' : ''}>
      {categories.map((category) => (
        <div key={category.id} className="mb-2">
          <Card size="small" className="hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {category.children && category.children.length > 0 ? (
                  <FolderOpenOutlined className="text-blue-500" />
                ) : (
                  <FolderOutlined className="text-gray-400" />
                )}
                <Text strong={level === 0}>{category.name}</Text>
                {category.children && category.children.length > 0 && (
                  <Text type="secondary" className="text-xs">
                    ({category.children.length} danh muc con)
                  </Text>
                )}
              </div>
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => onAddSubcategory(category)}
                  title="Them danh muc con"
                />
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(category)}
                  title="Sua"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(category)}
                  title="Xoa"
                />
              </Space>
            </div>
          </Card>

          {/* Render children recursively */}
          {category.children && category.children.length > 0 && (
            <CategoryList
              categories={category.children}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubcategory={onAddSubcategory}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}
