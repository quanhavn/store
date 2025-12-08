// CSV Import Types and Interfaces

export type ImportEntityType = 'category' | 'customer' | 'product' | 'employee'

export interface CSVColumn {
  index: number
  header: string
  sampleValues: string[]
}

export interface FieldDefinition {
  key: string
  label: string
  labelVi: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'enum' | 'phone' | 'email'
  enumValues?: string[]
  pattern?: RegExp
  patternMessage?: string
}

export interface ColumnMapping {
  csvColumn: string
  csvIndex: number
  targetField: string | null // null means skip
  confidence: number // 0-100
  isAutoMapped: boolean
}

export interface ValidationError {
  row: number
  field: string
  value: string | number | null
  message: string
  type: 'error' | 'warning'
}

export interface ParsedRow {
  rowIndex: number
  data: Record<string, string | number | null>
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
}

export interface ImportResult {
  success: boolean
  totalRows: number
  importedCount: number
  skippedCount: number
  errors: Array<{
    row: number
    message: string
  }>
}

export interface ImportProgress {
  current: number
  total: number
  status: 'idle' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error'
  message?: string
}

// Field definitions for each entity type
export const CATEGORY_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Name', labelVi: 'Tên danh mục', required: true, type: 'string' },
  { key: 'parent_name', label: 'Parent Category', labelVi: 'Danh mục cha', required: false, type: 'string' },
  { key: 'sort_order', label: 'Sort Order', labelVi: 'Thứ tự', required: false, type: 'number' },
]

export const CUSTOMER_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Name', labelVi: 'Tên khách hàng', required: true, type: 'string' },
  {
    key: 'phone',
    label: 'Phone',
    labelVi: 'Số điện thoại',
    required: true,
    type: 'phone',
    pattern: /^0\d{9}$/,
    patternMessage: 'Số điện thoại phải có 10 số, bắt đầu bằng 0'
  },
  { key: 'address', label: 'Address', labelVi: 'Địa chỉ', required: false, type: 'string' },
  {
    key: 'tax_code',
    label: 'Tax Code',
    labelVi: 'Mã số thuế',
    required: false,
    type: 'string',
    pattern: /^\d{10}(\d{3})?$/,
    patternMessage: 'Mã số thuế phải có 10 hoặc 13 số'
  },
  { key: 'notes', label: 'Notes', labelVi: 'Ghi chú', required: false, type: 'string' },
]

export const PRODUCT_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Name', labelVi: 'Tên sản phẩm', required: true, type: 'string' },
  { key: 'sku', label: 'SKU', labelVi: 'Mã sản phẩm', required: false, type: 'string' },
  { key: 'barcode', label: 'Barcode', labelVi: 'Mã vạch', required: false, type: 'string' },
  { key: 'category_name', label: 'Category', labelVi: 'Danh mục', required: false, type: 'string' },
  { key: 'cost_price', label: 'Cost Price', labelVi: 'Giá nhập', required: true, type: 'number' },
  { key: 'sell_price', label: 'Sell Price', labelVi: 'Giá bán', required: true, type: 'number' },
  { key: 'vat_rate', label: 'VAT Rate (%)', labelVi: 'Thuế VAT (%)', required: false, type: 'number' },
  { key: 'quantity', label: 'Quantity', labelVi: 'Số lượng', required: false, type: 'number' },
  { key: 'min_stock', label: 'Min Stock', labelVi: 'Tồn tối thiểu', required: false, type: 'number' },
  { key: 'unit', label: 'Unit', labelVi: 'Đơn vị', required: false, type: 'string' },
]

export const EMPLOYEE_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Name', labelVi: 'Họ tên', required: true, type: 'string' },
  {
    key: 'phone',
    label: 'Phone',
    labelVi: 'Số điện thoại',
    required: true,
    type: 'phone',
    pattern: /^0\d{9}$/,
    patternMessage: 'Số điện thoại phải có 10 số, bắt đầu bằng 0'
  },
  {
    key: 'id_card',
    label: 'ID Card',
    labelVi: 'CMND/CCCD',
    required: true,
    type: 'string',
    pattern: /^\d{9}(\d{3})?$/,
    patternMessage: 'CMND/CCCD phải có 9 hoặc 12 số'
  },
  { key: 'date_of_birth', label: 'Date of Birth', labelVi: 'Ngày sinh', required: false, type: 'date' },
  { key: 'address', label: 'Address', labelVi: 'Địa chỉ', required: false, type: 'string' },
  { key: 'position', label: 'Position', labelVi: 'Chức vụ', required: true, type: 'string' },
  { key: 'department', label: 'Department', labelVi: 'Phòng ban', required: false, type: 'string' },
  { key: 'hire_date', label: 'Hire Date', labelVi: 'Ngày vào làm', required: true, type: 'date' },
  {
    key: 'contract_type',
    label: 'Contract Type',
    labelVi: 'Loại hợp đồng',
    required: true,
    type: 'enum',
    enumValues: ['full_time', 'part_time', 'contract']
  },
  { key: 'base_salary', label: 'Base Salary', labelVi: 'Lương cơ bản', required: true, type: 'number' },
  { key: 'allowances', label: 'Allowances', labelVi: 'Phụ cấp', required: false, type: 'number' },
  { key: 'dependents', label: 'Dependents', labelVi: 'Số người phụ thuộc', required: false, type: 'number' },
  { key: 'bank_account', label: 'Bank Account', labelVi: 'Số tài khoản', required: false, type: 'string' },
  { key: 'bank_name', label: 'Bank Name', labelVi: 'Tên ngân hàng', required: false, type: 'string' },
  { key: 'social_insurance_no', label: 'Social Insurance', labelVi: 'Số BHXH', required: false, type: 'string' },
]

export function getFieldsForEntity(entityType: ImportEntityType): FieldDefinition[] {
  switch (entityType) {
    case 'category':
      return CATEGORY_FIELDS
    case 'customer':
      return CUSTOMER_FIELDS
    case 'product':
      return PRODUCT_FIELDS
    case 'employee':
      return EMPLOYEE_FIELDS
  }
}

export function getEntityLabel(entityType: ImportEntityType): string {
  switch (entityType) {
    case 'category':
      return 'Danh mục'
    case 'customer':
      return 'Khách hàng'
    case 'product':
      return 'Sản phẩm'
    case 'employee':
      return 'Nhân viên'
  }
}
