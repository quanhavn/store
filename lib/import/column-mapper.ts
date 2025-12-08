import type {
  ImportEntityType,
  CSVColumn,
  ColumnMapping,
  FieldDefinition,
} from './types'
import { getFieldsForEntity } from './types'

// Mapping aliases for Vietnamese and common variations
const FIELD_ALIASES: Record<string, string[]> = {
  // Common fields
  name: ['tên', 'ten', 'họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'full name', 'fullname', 'tên khách hàng', 'tên kh', 'tên sản phẩm', 'tên sp', 'tên nhân viên', 'tên nv', 'tên danh mục'],
  phone: ['số điện thoại', 'so dien thoai', 'sđt', 'sdt', 'điện thoại', 'dien thoai', 'tel', 'telephone', 'mobile', 'phone number'],
  address: ['địa chỉ', 'dia chi', 'đc'],
  notes: ['ghi chú', 'ghi chu', 'note', 'mô tả', 'mo ta', 'description'],

  // Customer specific
  tax_code: ['mã số thuế', 'ma so thue', 'mst', 'tax id', 'tax code', 'taxcode'],

  // Category specific
  parent_name: ['danh mục cha', 'danh muc cha', 'parent', 'parent category', 'cha'],
  sort_order: ['thứ tự', 'thu tu', 'sắp xếp', 'sap xep', 'order', 'sort'],

  // Product specific
  sku: ['mã', 'ma', 'mã sp', 'ma sp', 'mã sản phẩm', 'ma san pham', 'product code', 'code'],
  barcode: ['mã vạch', 'ma vach', 'bar code'],
  category_name: ['danh mục', 'danh muc', 'category', 'loại', 'loai', 'nhóm', 'nhom', 'group'],
  cost_price: ['giá nhập', 'gia nhap', 'giá vốn', 'gia von', 'cost', 'giá gốc', 'gia goc', 'purchase price'],
  sell_price: ['giá bán', 'gia ban', 'price', 'selling price', 'retail price', 'giá'],
  vat_rate: ['vat', 'thuế', 'thue', 'thuế vat', 'tax rate', 'vat %', 'vat rate'],
  quantity: ['số lượng', 'so luong', 'sl', 'qty', 'tồn kho', 'ton kho', 'stock'],
  min_stock: ['tồn tối thiểu', 'ton toi thieu', 'min', 'minimum', 'cảnh báo', 'canh bao'],
  unit: ['đơn vị', 'don vi', 'đvt', 'dvt', 'đơn vị tính'],

  // Employee specific
  id_card: ['cmnd', 'cccd', 'căn cước', 'can cuoc', 'chứng minh', 'chung minh', 'id', 'id card', 'identity'],
  date_of_birth: ['ngày sinh', 'ngay sinh', 'sinh nhật', 'sinh nhat', 'birthday', 'dob', 'birth date'],
  position: ['chức vụ', 'chuc vu', 'vị trí', 'vi tri', 'job title', 'title', 'role'],
  department: ['phòng ban', 'phong ban', 'bộ phận', 'bo phan', 'dept'],
  hire_date: ['ngày vào làm', 'ngay vao lam', 'ngày bắt đầu', 'ngay bat dau', 'start date', 'join date', 'ngày nhận việc'],
  contract_type: ['loại hợp đồng', 'loai hop dong', 'hợp đồng', 'hop dong', 'contract', 'employment type'],
  base_salary: ['lương cơ bản', 'luong co ban', 'lương', 'luong', 'salary', 'base pay', 'lương chính'],
  allowances: ['phụ cấp', 'phu cap', 'trợ cấp', 'tro cap', 'allowance'],
  dependents: ['người phụ thuộc', 'nguoi phu thuoc', 'phụ thuộc', 'phu thuoc', 'số người phụ thuộc'],
  bank_account: ['số tài khoản', 'so tai khoan', 'stk', 'tài khoản', 'tai khoan', 'account', 'bank account'],
  bank_name: ['ngân hàng', 'ngan hang', 'tên ngân hàng', 'ten ngan hang', 'bank'],
  social_insurance_no: ['bhxh', 'bảo hiểm', 'bao hiem', 'số bhxh', 'so bhxh', 'social insurance'],
}

/**
 * Normalize string for comparison (lowercase, remove diacritics)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
}

/**
 * Calculate similarity score between two strings (0-100)
 * Uses Levenshtein distance
 */
function similarityScore(str1: string, str2: string): number {
  const s1 = normalizeString(str1)
  const s2 = normalizeString(str2)

  if (s1 === s2) return 100

  // Check for exact match with aliases
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 0

  // Calculate Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[s1.length][s2.length]
  return Math.round((1 - distance / maxLen) * 100)
}

/**
 * Find the best matching field for a CSV column header
 */
function findBestMatch(
  header: string,
  fields: FieldDefinition[],
  savedMapping?: Record<string, string> | null
): { field: string | null; confidence: number } {
  const normalizedHeader = normalizeString(header)

  // Check saved mapping first
  if (savedMapping && savedMapping[header.toLowerCase()]) {
    const savedField = savedMapping[header.toLowerCase()]
    if (fields.find((f) => f.key === savedField)) {
      return { field: savedField, confidence: 100 }
    }
  }

  let bestMatch: { field: string | null; confidence: number } = { field: null, confidence: 0 }

  for (const field of fields) {
    // Check exact match with field key
    if (normalizedHeader === normalizeString(field.key)) {
      return { field: field.key, confidence: 100 }
    }

    // Check exact match with field label
    if (normalizedHeader === normalizeString(field.label)) {
      return { field: field.key, confidence: 100 }
    }

    // Check exact match with Vietnamese label
    if (normalizedHeader === normalizeString(field.labelVi)) {
      return { field: field.key, confidence: 100 }
    }

    // Check aliases
    const aliases = FIELD_ALIASES[field.key] || []
    for (const alias of aliases) {
      if (normalizedHeader === normalizeString(alias)) {
        return { field: field.key, confidence: 95 }
      }
    }

    // Calculate similarity scores
    const keyScore = similarityScore(header, field.key)
    const labelScore = similarityScore(header, field.label)
    const labelViScore = similarityScore(header, field.labelVi)

    // Check similarity with aliases
    let aliasScore = 0
    for (const alias of aliases) {
      aliasScore = Math.max(aliasScore, similarityScore(header, alias))
    }

    const maxScore = Math.max(keyScore, labelScore, labelViScore, aliasScore)

    if (maxScore > bestMatch.confidence && maxScore >= 60) {
      bestMatch = { field: field.key, confidence: maxScore }
    }
  }

  return bestMatch
}

/**
 * Auto-map CSV columns to entity fields
 */
export function autoMapColumns(
  columns: CSVColumn[],
  entityType: ImportEntityType,
  savedMapping?: Record<string, string> | null
): ColumnMapping[] {
  const fields = getFieldsForEntity(entityType)
  const usedFields = new Set<string>()

  const mappings: ColumnMapping[] = columns.map((col) => {
    const { field, confidence } = findBestMatch(col.header, fields, savedMapping)

    // Don't map to same field twice
    if (field && usedFields.has(field)) {
      return {
        csvColumn: col.header,
        csvIndex: col.index,
        targetField: null,
        confidence: 0,
        isAutoMapped: false,
      }
    }

    if (field) {
      usedFields.add(field)
    }

    return {
      csvColumn: col.header,
      csvIndex: col.index,
      targetField: field,
      confidence,
      isAutoMapped: confidence > 0,
    }
  })

  return mappings
}

/**
 * Check if all required fields are mapped
 */
export function validateMappings(
  mappings: ColumnMapping[],
  entityType: ImportEntityType
): { valid: boolean; missingFields: string[] } {
  const fields = getFieldsForEntity(entityType)
  const requiredFields = fields.filter((f) => f.required)
  const mappedFields = new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField))

  const missingFields: string[] = []
  for (const field of requiredFields) {
    if (!mappedFields.has(field.key)) {
      missingFields.push(field.labelVi)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}
