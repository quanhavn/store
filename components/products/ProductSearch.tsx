'use client'

import { Input } from 'antd'
import { SearchOutlined, ScanOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'

interface ProductSearchProps {
  onSearch: (value: string) => void
  onScan?: () => void
  placeholder?: string
  debounceMs?: number
}

export function ProductSearch({
  onSearch,
  onScan,
  placeholder = 'Tìm sản phẩm, mã vạch...',
  debounceMs = 300,
}: ProductSearchProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, onSearch, debounceMs])

  return (
    <Input
      size="large"
      placeholder={placeholder}
      prefix={<SearchOutlined className="text-gray-400" />}
      suffix={
        onScan && (
          <ScanOutlined
            className="text-gray-400 cursor-pointer hover:text-blue-500"
            onClick={onScan}
          />
        )
      }
      value={value}
      onChange={(e) => setValue(e.target.value)}
      allowClear
      className="rounded-lg"
    />
  )
}
