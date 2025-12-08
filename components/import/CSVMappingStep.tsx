'use client'

import { useMemo } from 'react'
import { Table, Select, Tag, Typography, Alert, Checkbox } from 'antd'
import { CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslations } from 'next-intl'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { getFieldsForEntity } from '@/lib/import/types'
import { validateMappings } from '@/lib/import/column-mapper'

const { Text } = Typography

interface MappingRow {
  key: number
  csvHeader: string
  csvIndex: number
  sampleValues: string[]
  targetField: string | null
  confidence: number
  isAutoMapped: boolean
}

export function CSVMappingStep() {
  const tImport = useTranslations('import')
  const {
    entityType,
    csvColumns,
    columnMappings,
    updateColumnMapping,
    saveMappingForEntity,
  } = useCSVImportStore()

  const fields = useMemo(() => getFieldsForEntity(entityType), [entityType])

  const fieldOptions = useMemo(() => {
    return [
      { value: '', label: tImport('skipThisColumn') },
      ...fields.map((f) => ({
        value: f.key,
        label: `${f.labelVi}${f.required ? ' *' : ''}`,
      })),
    ]
  }, [fields, tImport])

  const tableData: MappingRow[] = useMemo(() => {
    return csvColumns.map((col) => {
      const mapping = columnMappings.find((m) => m.csvIndex === col.index)
      return {
        key: col.index,
        csvHeader: col.header,
        csvIndex: col.index,
        sampleValues: col.sampleValues,
        targetField: mapping?.targetField ?? null,
        confidence: mapping?.confidence ?? 0,
        isAutoMapped: mapping?.isAutoMapped ?? false,
      }
    })
  }, [csvColumns, columnMappings])

  const validationResult = useMemo(() => {
    return validateMappings(columnMappings, entityType)
  }, [columnMappings, entityType])

  const mappedFieldKeys = useMemo(() => {
    return new Set(columnMappings.filter((m) => m.targetField).map((m) => m.targetField))
  }, [columnMappings])

  const handleFieldChange = (csvIndex: number, targetField: string) => {
    updateColumnMapping(csvIndex, targetField || null)
  }

  const handleSaveMapping = (checked: boolean) => {
    if (checked) {
      saveMappingForEntity(entityType, columnMappings)
    }
  }

  const columns: ColumnsType<MappingRow> = [
    {
      title: tImport('csvColumn'),
      dataIndex: 'csvHeader',
      key: 'csvHeader',
      width: 150,
      render: (header: string, record: MappingRow) => (
        <div>
          <Text strong>{header}</Text>
          {record.isAutoMapped && record.confidence >= 80 && (
            <CheckCircleOutlined className="ml-2 text-green-500" />
          )}
          {record.isAutoMapped && record.confidence < 80 && record.confidence >= 60 && (
            <QuestionCircleOutlined className="ml-2 text-orange-500" />
          )}
        </div>
      ),
    },
    {
      title: tImport('sampleData'),
      dataIndex: 'sampleValues',
      key: 'sampleValues',
      width: 200,
      render: (samples: string[]) => (
        <div className="text-gray-500 text-sm">
          {samples.length > 0 ? (
            samples.slice(0, 2).map((s, i) => (
              <div key={i} className="truncate max-w-[180px]" title={s}>
                {s || <em className="text-gray-400">{tImport('empty')}</em>}
              </div>
            ))
          ) : (
            <em className="text-gray-400">{tImport('noData')}</em>
          )}
        </div>
      ),
    },
    {
      title: tImport('mapToField'),
      dataIndex: 'targetField',
      key: 'targetField',
      width: 200,
      render: (targetField: string | null, record: MappingRow) => {
        const currentField = fields.find((f) => f.key === targetField)
        return (
          <Select
            value={targetField || ''}
            onChange={(value) => handleFieldChange(record.csvIndex, value)}
            options={fieldOptions.map((opt) => ({
              ...opt,
              disabled:
                opt.value !== '' &&
                opt.value !== targetField &&
                mappedFieldKeys.has(opt.value),
            }))}
            style={{ width: '100%' }}
            placeholder={tImport('selectField')}
          />
        )
      },
    },
    {
      title: tImport('statusLabel'),
      key: 'status',
      width: 120,
      render: (_, record: MappingRow) => {
        if (!record.targetField) {
          return <Tag color="default">{tImport('skipped')}</Tag>
        }
        if (record.confidence >= 80) {
          return <Tag color="green">{tImport('auto')}</Tag>
        }
        if (record.confidence >= 60) {
          return <Tag color="orange">{tImport('suggested')}</Tag>
        }
        return <Tag color="blue">{tImport('manual')}</Tag>
      },
    },
  ]

  return (
    <div>
      {!validationResult.valid && (
        <Alert
          type="warning"
          message={tImport('missingRequiredFields')}
          description={
            <span>
              {tImport('pleaseMapFields')}: {validationResult.missingFields.join(', ')}
            </span>
          }
          showIcon
          className="mb-4"
        />
      )}

      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
      />

      <div className="mt-4 flex items-center justify-between">
        <Checkbox onChange={(e) => handleSaveMapping(e.target.checked)}>
          {tImport('saveMappingForLater')}
        </Checkbox>

        <div className="text-gray-500 text-sm">
          <Tag color="green">{tImport('auto')}</Tag> = {tImport('autoDesc')}
          <Tag color="orange" className="ml-2">{tImport('suggested')}</Tag> = {tImport('suggestedDesc')}
        </div>
      </div>
    </div>
  )
}
