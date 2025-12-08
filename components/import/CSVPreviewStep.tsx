'use client'

import { useEffect, useMemo } from 'react'
import { Table, Tag, Typography, Space, Tabs } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslations } from 'next-intl'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { getFieldsForEntity } from '@/lib/import/types'
import { validateAndParseRows } from '@/lib/import/validators'

const { Text } = Typography

export function CSVPreviewStep() {
  const tImport = useTranslations('import')
  const tCommon = useTranslations('common')
  const {
    entityType,
    rawData,
    columnMappings,
    parsedRows,
    validRowCount,
    errorRowCount,
    warningRowCount,
    setParsedRows,
  } = useCSVImportStore()

  const fields = useMemo(() => getFieldsForEntity(entityType), [entityType])

  // Validate data when entering this step
  useEffect(() => {
    if (rawData.length > 0 && columnMappings.length > 0) {
      const rows = validateAndParseRows(rawData, columnMappings, entityType)
      setParsedRows(rows)
    }
  }, [rawData, columnMappings, entityType, setParsedRows])

  const mappedFields = useMemo(() => {
    return columnMappings
      .filter((m) => m.targetField)
      .map((m) => {
        const field = fields.find((f) => f.key === m.targetField)
        return {
          key: m.targetField!,
          label: field?.labelVi || m.targetField!,
        }
      })
  }, [columnMappings, fields])

  const tableColumns: ColumnsType<typeof parsedRows[0]> = useMemo(() => {
    const cols: ColumnsType<typeof parsedRows[0]> = [
      {
        title: tImport('row'),
        dataIndex: 'rowIndex',
        key: 'rowIndex',
        width: 60,
        fixed: 'left',
      },
      {
        title: tCommon('status'),
        key: 'status',
        width: 100,
        fixed: 'left',
        render: (_, record) => {
          if (record.errors.length > 0) {
            return (
              <Tag icon={<CloseCircleOutlined />} color="error">
                {tCommon('error')}
              </Tag>
            )
          }
          if (record.warnings.length > 0) {
            return (
              <Tag icon={<WarningOutlined />} color="warning">
                {tImport('warning')}
              </Tag>
            )
          }
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              OK
            </Tag>
          )
        },
      },
    ]

    // Add columns for each mapped field
    mappedFields.forEach((mf) => {
      cols.push({
        title: mf.label,
        key: mf.key,
        width: 150,
        ellipsis: true,
        render: (_, record) => {
          const value = record.data[mf.key]
          const error = record.errors.find((e) => e.field === mf.key)
          const warning = record.warnings.find((w) => w.field === mf.key)

          return (
            <div>
              <Text
                type={error ? 'danger' : warning ? 'warning' : undefined}
                className="block truncate"
                title={String(value ?? '')}
              >
                {value !== null && value !== undefined ? String(value) : '-'}
              </Text>
              {error && (
                <Text type="danger" className="text-xs block">
                  {error.message}
                </Text>
              )}
              {warning && !error && (
                <Text type="warning" className="text-xs block">
                  {warning.message}
                </Text>
              )}
            </div>
          )
        },
      })
    })

    return cols
  }, [mappedFields, tImport, tCommon])

  const validRows = useMemo(
    () => parsedRows.filter((r) => r.isValid),
    [parsedRows]
  )
  const errorRows = useMemo(
    () => parsedRows.filter((r) => r.errors.length > 0),
    [parsedRows]
  )
  const warningRows = useMemo(
    () => parsedRows.filter((r) => r.warnings.length > 0 && r.errors.length === 0),
    [parsedRows]
  )

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          {tCommon('all')} <Tag>{parsedRows.length}</Tag>
        </span>
      ),
      children: (
        <Table
          columns={tableColumns}
          dataSource={parsedRows}
          rowKey="rowIndex"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'valid',
      label: (
        <span>
          {tImport('valid')} <Tag color="green">{validRowCount}</Tag>
        </span>
      ),
      children: (
        <Table
          columns={tableColumns}
          dataSource={validRows}
          rowKey="rowIndex"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'errors',
      label: (
        <span>
          {tCommon('error')} <Tag color="red">{errorRowCount}</Tag>
        </span>
      ),
      children: (
        <Table
          columns={tableColumns}
          dataSource={errorRows}
          rowKey="rowIndex"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'warnings',
      label: (
        <span>
          {tImport('warning')} <Tag color="orange">{warningRowCount}</Tag>
        </span>
      ),
      children: (
        <Table
          columns={tableColumns}
          dataSource={warningRows}
          rowKey="rowIndex"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ]

  return (
    <div>
      <Space className="mb-4">
        <Text>
          <CheckCircleOutlined className="text-green-500 mr-1" />
          {tImport('validRowsCount', { count: validRowCount })}
        </Text>
        {errorRowCount > 0 && (
          <Text type="danger">
            <CloseCircleOutlined className="mr-1" />
            {tImport('errorRowsWillSkip', { count: errorRowCount })}
          </Text>
        )}
        {warningRowCount > 0 && (
          <Text type="warning">
            <WarningOutlined className="mr-1" />
            {tImport('warningRowsCount', { count: warningRowCount })}
          </Text>
        )}
      </Space>

      <Tabs items={tabItems} size="small" />
    </div>
  )
}
