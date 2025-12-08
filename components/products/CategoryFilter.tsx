'use client'

import { Tag, Space } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'

interface Category {
  id: string
  name: string
}

interface CategoryFilterProps {
  categories: Category[]
  selectedId?: string
  onChange: (categoryId: string | undefined) => void
}

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  const tCommon = useTranslations('common')

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <Space size={[8, 8]} wrap={false}>
        <Tag
          color={!selectedId ? 'blue' : undefined}
          className="cursor-pointer px-3 py-1 text-sm"
          onClick={() => onChange(undefined)}
          icon={!selectedId ? <CheckCircleOutlined /> : undefined}
        >
          {tCommon('all')}
        </Tag>
        {categories.map((cat) => (
          <Tag
            key={cat.id}
            color={selectedId === cat.id ? 'blue' : undefined}
            className="cursor-pointer px-3 py-1 text-sm whitespace-nowrap"
            onClick={() => onChange(cat.id)}
            icon={selectedId === cat.id ? <CheckCircleOutlined /> : undefined}
          >
            {cat.name}
          </Tag>
        ))}
      </Space>
    </div>
  )
}
