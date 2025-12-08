'use client'

import { useState } from 'react'
import { Upload, Alert, Typography, Space } from 'antd'
import { InboxOutlined, FileExcelOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { useTranslations } from 'next-intl'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { parseCSVFile } from '@/lib/import/csv-parser'
import { autoMapColumns } from '@/lib/import/column-mapper'
import { getEntityLabel } from '@/lib/import/types'

const { Dragger } = Upload
const { Text, Paragraph } = Typography

export function CSVUploadStep() {
  const tImport = useTranslations('import')
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
      setError(tImport('onlyCsvExcelSupported'))
      return
    }

    // Parse file
    setParsing(true)
    setError(null)

    try {
      const result = await parseCSVFile(originFile as File)

      if (!result.success) {
        setError(result.error || tImport('fileReadError'))
        setParsing(false)
        return
      }

      if (result.data.length < 2) {
        setError(tImport('fileMinRows'))
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
      setError(tImport('fileReadErrorCheckFormat'))
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
        {tImport('uploadDescription', { entity: getEntityLabel(entityType).toLowerCase() })}
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
          {parsing ? tImport('processingFile') : tImport('dragDropOrClick')}
        </p>
        <p className="ant-upload-hint">
          {tImport('supportedFormats')}
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
          {tImport('formatTips')}:
        </Text>
        <Space direction="vertical" size="small">
          <Text className="text-gray-600">
            {tImport('formatTip1')}
          </Text>
          <Text className="text-gray-600">
            {tImport('formatTip2')}
          </Text>
          <Text className="text-gray-600">
            {tImport('formatTip3')}
          </Text>
        </Space>
      </div>
    </div>
  )
}
