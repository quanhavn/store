'use client'

import { useState } from 'react'
import { Upload, Alert, Typography, Space } from 'antd'
import { InboxOutlined, FileExcelOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { parseCSVFile } from '@/lib/import/csv-parser'
import { autoMapColumns } from '@/lib/import/column-mapper'
import { getEntityLabel } from '@/lib/import/types'

const { Dragger } = Upload
const { Text, Paragraph } = Typography

export function CSVUploadStep() {
  const {
    entityType,
    setRawData,
    setCSVColumns,
    setColumnMappings,
    getSavedMappingForEntity,
  } = useCSVImportStore()

  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload: UploadProps['onChange'] = async (info) => {
    const { file, fileList: newFileList } = info

    // Keep only the latest file
    setFileList(newFileList.slice(-1))

    if (file.status === 'removed') {
      setRawData([])
      setCSVColumns([])
      setColumnMappings([])
      setError(null)
      return
    }

    const originFile = file.originFileObj || file
    if (!originFile) return

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const fileType = (originFile as File).type || ''
    const fileName = (originFile as File).name || ''
    const isValidType =
      validTypes.includes(fileType) ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')

    if (!isValidType) {
      setError('Chỉ hỗ trợ file CSV hoặc Excel (.csv, .xlsx, .xls)')
      return
    }

    // Parse file
    setParsing(true)
    setError(null)

    try {
      const result = await parseCSVFile(originFile as File)

      if (!result.success) {
        setError(result.error || 'Lỗi đọc file')
        setParsing(false)
        return
      }

      if (result.data.length < 2) {
        setError('File phải có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu')
        setParsing(false)
        return
      }

      // Set raw data and columns
      setRawData(result.data)
      setCSVColumns(result.columns)

      // Auto-map columns
      const savedMapping = getSavedMappingForEntity(entityType)
      const mappings = autoMapColumns(result.columns, entityType, savedMapping)
      setColumnMappings(mappings)

      setParsing(false)
    } catch (err) {
      console.error('File parse error:', err)
      setError('Lỗi đọc file. Vui lòng kiểm tra định dạng.')
      setParsing(false)
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: () => false, // Prevent auto upload
    onChange: handleUpload,
    accept: '.csv,.xlsx,.xls',
  }

  return (
    <div>
      <Paragraph className="text-gray-600 mb-4">
        Tải file CSV hoặc Excel chứa dữ liệu {getEntityLabel(entityType).toLowerCase()}.
        Dòng đầu tiên phải là tiêu đề cột.
      </Paragraph>

      <Dragger {...uploadProps} disabled={parsing}>
        <p className="ant-upload-drag-icon">
          {parsing ? (
            <FileExcelOutlined style={{ color: '#1890ff' }} spin />
          ) : (
            <InboxOutlined />
          )}
        </p>
        <p className="ant-upload-text">
          {parsing ? 'Đang xử lý file...' : 'Kéo thả file vào đây hoặc click để chọn'}
        </p>
        <p className="ant-upload-hint">
          Hỗ trợ file .csv, .xlsx, .xls
        </p>
      </Dragger>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          className="mt-4"
          closable
          onClose={() => setError(null)}
        />
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <Text strong className="block mb-2">
          Gợi ý định dạng file:
        </Text>
        <Space direction="vertical" size="small">
          <Text className="text-gray-600">
            • Dòng đầu tiên là tiêu đề cột (ví dụ: Tên, Số điện thoại, Địa chỉ...)
          </Text>
          <Text className="text-gray-600">
            • Hệ thống sẽ tự động nhận diện và ghép cột
          </Text>
          <Text className="text-gray-600">
            • Bạn có thể điều chỉnh ghép cột ở bước tiếp theo
          </Text>
        </Space>
      </div>
    </div>
  )
}
