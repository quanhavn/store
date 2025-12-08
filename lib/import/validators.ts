import type {
  ImportEntityType,
  ColumnMapping,
  ParsedRow,
  ValidationError,
  FieldDefinition,
} from './types'
import { getFieldsForEntity } from './types'
import { parseNumber, parseDate } from './csv-parser'

/**
 * Validate and parse CSV rows based on entity type
 */
export function validateAndParseRows(
  rawData: string[][],
  mappings: ColumnMapping[],
  entityType: ImportEntityType,
  existingData?: {
    phones?: Set<string>
    idCards?: Set<string>
    skus?: Set<string>
    barcodes?: Set<string>
    categoryNames?: Set<string>
  }
): ParsedRow[] {
  const fields = getFieldsForEntity(entityType)
  const fieldMap = new Map(fields.map((f) => [f.key, f]))

  // Skip header row
  const dataRows = rawData.slice(1)

  // Track seen values for duplicate detection within the file
  const seenPhones = new Set<string>()
  const seenIdCards = new Set<string>()
  const seenSkus = new Set<string>()
  const seenBarcodes = new Set<string>()

  return dataRows.map((row, index) => {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const data: Record<string, string | number | null> = {}

    // Map values based on column mappings
    for (const mapping of mappings) {
      if (!mapping.targetField) continue

      const rawValue = row[mapping.csvIndex] ?? ''
      const field = fieldMap.get(mapping.targetField)

      if (!field) continue

      const { value, error, warning } = validateAndParseValue(
        rawValue,
        field,
        index + 2, // +2 because: +1 for 0-index, +1 for header row
        entityType,
        {
          seenPhones,
          seenIdCards,
          seenSkus,
          seenBarcodes,
          existingData,
        }
      )

      data[mapping.targetField] = value

      if (error) errors.push(error)
      if (warning) warnings.push(warning)
    }

    // Check required fields
    for (const field of fields) {
      if (field.required && (data[field.key] === null || data[field.key] === undefined || data[field.key] === '')) {
        errors.push({
          row: index + 2,
          field: field.key,
          value: null,
          message: `${field.labelVi} là bắt buộc`,
          type: 'error',
        })
      }
    }

    return {
      rowIndex: index + 2,
      data,
      errors,
      warnings,
      isValid: errors.length === 0,
    }
  })
}

interface ValidationContext {
  seenPhones: Set<string>
  seenIdCards: Set<string>
  seenSkus: Set<string>
  seenBarcodes: Set<string>
  existingData?: {
    phones?: Set<string>
    idCards?: Set<string>
    skus?: Set<string>
    barcodes?: Set<string>
    categoryNames?: Set<string>
  }
}

function validateAndParseValue(
  rawValue: string,
  field: FieldDefinition,
  rowIndex: number,
  entityType: ImportEntityType,
  context: ValidationContext
): { value: string | number | null; error?: ValidationError; warning?: ValidationError } {
  const trimmed = rawValue.trim()

  // Empty value handling
  if (trimmed === '') {
    return { value: null }
  }

  let value: string | number | null = trimmed
  let error: ValidationError | undefined
  let warning: ValidationError | undefined

  switch (field.type) {
    case 'string':
      value = trimmed
      break

    case 'number':
      value = parseNumber(trimmed)
      if (value === null && trimmed !== '') {
        error = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `${field.labelVi}: "${trimmed}" không phải số hợp lệ`,
          type: 'error',
        }
      }
      break

    case 'date':
      value = parseDate(trimmed)
      if (value === null && trimmed !== '') {
        error = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `${field.labelVi}: "${trimmed}" không phải ngày hợp lệ (DD/MM/YYYY)`,
          type: 'error',
        }
      }
      break

    case 'phone':
      value = trimmed.replace(/\D/g, '') // Remove non-digits
      if (field.pattern && !field.pattern.test(value)) {
        error = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: field.patternMessage || `${field.labelVi} không hợp lệ`,
          type: 'error',
        }
      } else {
        // Check duplicates
        if (context.seenPhones.has(value)) {
          warning = {
            row: rowIndex,
            field: field.key,
            value: trimmed,
            message: `Số điện thoại "${value}" trùng trong file`,
            type: 'warning',
          }
        } else if (context.existingData?.phones?.has(value)) {
          warning = {
            row: rowIndex,
            field: field.key,
            value: trimmed,
            message: `Số điện thoại "${value}" đã tồn tại trong hệ thống`,
            type: 'warning',
          }
        }
        context.seenPhones.add(value)
      }
      break

    case 'enum':
      if (field.enumValues) {
        // Try to match enum value (case-insensitive)
        const normalizedValue = trimmed.toLowerCase()
        const matchedEnum = field.enumValues.find(
          (e) => e.toLowerCase() === normalizedValue
        )
        if (matchedEnum) {
          value = matchedEnum
        } else {
          // Try Vietnamese mapping for contract types
          const contractTypeMap: Record<string, string> = {
            'toàn thời gian': 'full_time',
            'toan thoi gian': 'full_time',
            'full time': 'full_time',
            'bán thời gian': 'part_time',
            'ban thoi gian': 'part_time',
            'part time': 'part_time',
            'hợp đồng': 'contract',
            'hop dong': 'contract',
            'thử việc': 'contract',
            'thu viec': 'contract',
          }
          const mapped = contractTypeMap[normalizedValue]
          if (mapped && field.enumValues.includes(mapped)) {
            value = mapped
          } else {
            error = {
              row: rowIndex,
              field: field.key,
              value: trimmed,
              message: `${field.labelVi}: "${trimmed}" không hợp lệ. Chọn: ${field.enumValues.join(', ')}`,
              type: 'error',
            }
          }
        }
      }
      break

    default:
      value = trimmed
  }

  // Additional field-specific validations
  if (!error) {
    if (field.key === 'id_card' && typeof value === 'string') {
      // Validate ID card format
      const digits = value.replace(/\D/g, '')
      if (field.pattern && !field.pattern.test(digits)) {
        error = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: field.patternMessage || 'CMND/CCCD không hợp lệ',
          type: 'error',
        }
      } else {
        value = digits
        // Check duplicates
        if (context.seenIdCards.has(digits)) {
          warning = {
            row: rowIndex,
            field: field.key,
            value: trimmed,
            message: `CMND/CCCD "${digits}" trùng trong file`,
            type: 'warning',
          }
        } else if (context.existingData?.idCards?.has(digits)) {
          warning = {
            row: rowIndex,
            field: field.key,
            value: trimmed,
            message: `CMND/CCCD "${digits}" đã tồn tại trong hệ thống`,
            type: 'warning',
          }
        }
        context.seenIdCards.add(digits)
      }
    }

    if (field.key === 'tax_code' && typeof value === 'string' && value !== '') {
      if (field.pattern && !field.pattern.test(value)) {
        error = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: field.patternMessage || 'Mã số thuế không hợp lệ',
          type: 'error',
        }
      }
    }

    if (field.key === 'sku' && typeof value === 'string' && value !== '') {
      if (context.seenSkus.has(value)) {
        warning = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `Mã SKU "${value}" trùng trong file`,
          type: 'warning',
        }
      } else if (context.existingData?.skus?.has(value)) {
        warning = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `Mã SKU "${value}" đã tồn tại trong hệ thống`,
          type: 'warning',
        }
      }
      context.seenSkus.add(value)
    }

    if (field.key === 'barcode' && typeof value === 'string' && value !== '') {
      if (context.seenBarcodes.has(value)) {
        warning = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `Mã vạch "${value}" trùng trong file`,
          type: 'warning',
        }
      } else if (context.existingData?.barcodes?.has(value)) {
        warning = {
          row: rowIndex,
          field: field.key,
          value: trimmed,
          message: `Mã vạch "${value}" đã tồn tại trong hệ thống`,
          type: 'warning',
        }
      }
      context.seenBarcodes.add(value)
    }
  }

  return { value, error, warning }
}

/**
 * Convert parsed rows to entity-specific data for API submission
 */
export function convertToEntityData<T>(
  parsedRows: ParsedRow[],
  entityType: ImportEntityType
): T[] {
  return parsedRows
    .filter((row) => row.isValid)
    .map((row) => row.data as unknown as T)
}
