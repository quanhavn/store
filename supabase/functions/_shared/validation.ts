/**
 * Input Validation Utilities for Edge Functions
 *
 * This module provides validation functions to ensure data integrity
 * and prevent injection attacks.
 *
 * Security Guidelines:
 * 1. Always validate input before processing
 * 2. Use strict type checking
 * 3. Sanitize strings to prevent injection
 * 4. Validate numeric ranges
 * 5. Check enum values against allowed lists
 */

// ============================================================================
// Type Validators
// ============================================================================

/**
 * Checks if a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Checks if a value is a valid number (not NaN or Infinity).
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * Checks if a value is a positive number.
 */
export function isPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value > 0
}

/**
 * Checks if a value is a non-negative number.
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isValidNumber(value) && value >= 0
}

/**
 * Checks if a value is a valid integer.
 */
export function isInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value)
}

/**
 * Checks if a value is a valid UUID.
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Checks if a value is a valid date string (ISO format or YYYY-MM-DD).
 */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Checks if a value is in an allowed list of values.
 */
export function isInAllowedList<T>(
  value: unknown,
  allowedValues: readonly T[]
): value is T {
  return allowedValues.includes(value as T)
}

// ============================================================================
// Format Validators
// ============================================================================

/**
 * Validates Vietnam phone number format.
 * Format: 0xxxxxxxxx (10 digits starting with 0)
 */
export function isValidVietnamesePhone(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^0\d{9}$/.test(value)
}

/**
 * Validates Vietnam ID card (CCCD/CMND).
 * CCCD: 12 digits, CMND: 9 digits
 */
export function isValidVietnameseIdCard(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^\d{9}$|^\d{12}$/.test(value)
}

/**
 * Validates Vietnam tax code.
 * Format: 10 or 13 digits
 */
export function isValidTaxCode(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^\d{10}$|^\d{13}$/.test(value)
}

/**
 * Validates email format.
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // Basic email regex - not exhaustive but catches most issues
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Validates barcode format (EAN-13, EAN-8, or custom).
 */
export function isValidBarcode(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // Allow 8-20 alphanumeric characters
  return /^[A-Za-z0-9]{8,20}$/.test(value)
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitizes a string by removing potentially dangerous characters.
 * Use for search queries and display strings.
 */
export function sanitizeString(value: string, maxLength = 500): string {
  return value
    .slice(0, maxLength) // Limit length
    .replace(/[<>'"&]/g, '') // Remove HTML-sensitive characters
    .trim()
}

/**
 * Sanitizes a search query to prevent SQL injection patterns.
 */
export function sanitizeSearchQuery(value: string): string {
  return value
    .slice(0, 100) // Limit search query length
    .replace(/[%_]/g, '') // Remove SQL wildcards (handled by Supabase)
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .trim()
}

/**
 * Sanitizes a filename to prevent path traversal.
 */
export function sanitizeFilename(value: string): string {
  return value
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .slice(0, 255) // Limit filename length
}

// ============================================================================
// Schema Validation
// ============================================================================

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validates an object against a schema.
 */
export function validateSchema(
  obj: Record<string, unknown>,
  schema: Record<
    string,
    {
      required?: boolean
      type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
      validator?: (value: unknown) => boolean
      message?: string
      min?: number
      max?: number
      minLength?: number
      maxLength?: number
      allowedValues?: readonly unknown[]
    }
  >
): ValidationResult {
  const errors: ValidationError[] = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field]

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rules.message || `${field} is required`,
      })
      continue
    }

    // Skip further validation if optional and empty
    if (value === undefined || value === null) continue

    // Check type
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== rules.type) {
        errors.push({
          field,
          message: rules.message || `${field} must be a ${rules.type}`,
        })
        continue
      }
    }

    // Check allowed values
    if (rules.allowedValues && !isInAllowedList(value, rules.allowedValues)) {
      errors.push({
        field,
        message:
          rules.message ||
          `${field} must be one of: ${rules.allowedValues.join(', ')}`,
      })
      continue
    }

    // Check min/max for numbers
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          message: rules.message || `${field} must be at least ${rules.min}`,
        })
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          message: rules.message || `${field} must be at most ${rules.max}`,
        })
      }
    }

    // Check minLength/maxLength for strings
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          field,
          message:
            rules.message ||
            `${field} must be at least ${rules.minLength} characters`,
        })
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          field,
          message:
            rules.message ||
            `${field} must be at most ${rules.maxLength} characters`,
        })
      }
    }

    // Check custom validator
    if (rules.validator && !rules.validator(value)) {
      errors.push({
        field,
        message: rules.message || `${field} is invalid`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const productSchema = {
  name: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 255,
    message: 'Product name is required (1-255 characters)',
  },
  sell_price: {
    required: true,
    type: 'number' as const,
    min: 0,
    message: 'Sell price must be a non-negative number',
  },
  cost_price: {
    type: 'number' as const,
    min: 0,
    message: 'Cost price must be a non-negative number',
  },
  quantity: {
    type: 'number' as const,
    min: 0,
    validator: isInteger,
    message: 'Quantity must be a non-negative integer',
  },
  vat_rate: {
    type: 'number' as const,
    allowedValues: [0, 5, 8, 10] as const,
    message: 'VAT rate must be 0, 5, 8, or 10',
  },
}

export const employeeSchema = {
  name: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 255,
    message: 'Employee name is required',
  },
  phone: {
    required: true,
    type: 'string' as const,
    validator: isValidVietnamesePhone,
    message: 'Phone must be in format 0xxxxxxxxx',
  },
  id_card: {
    required: true,
    type: 'string' as const,
    validator: isValidVietnameseIdCard,
    message: 'ID card must be 9 digits (CMND) or 12 digits (CCCD)',
  },
  position: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
  },
  base_salary: {
    required: true,
    type: 'number' as const,
    min: 0,
    message: 'Base salary must be a non-negative number',
  },
  contract_type: {
    type: 'string' as const,
    allowedValues: ['full_time', 'part_time', 'contract'] as const,
    message: 'Contract type must be full_time, part_time, or contract',
  },
}

export const expenseSchema = {
  amount: {
    required: true,
    type: 'number' as const,
    min: 1,
    message: 'Amount must be a positive number',
  },
  description: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 500,
    message: 'Description is required (max 500 characters)',
  },
  payment_method: {
    required: true,
    type: 'string' as const,
    allowedValues: ['cash', 'bank_transfer'] as const,
    message: 'Payment method must be cash or bank_transfer',
  },
  supplier_tax_code: {
    type: 'string' as const,
    validator: (v: unknown) => !v || isValidTaxCode(v),
    message: 'Supplier tax code must be 10 or 13 digits',
  },
}

export const saleItemSchema = {
  product_id: {
    required: true,
    type: 'string' as const,
    validator: isValidUUID,
    message: 'Product ID must be a valid UUID',
  },
  quantity: {
    required: true,
    type: 'number' as const,
    min: 1,
    validator: isInteger,
    message: 'Quantity must be a positive integer',
  },
  unit_price: {
    required: true,
    type: 'number' as const,
    min: 0,
    message: 'Unit price must be a non-negative number',
  },
}

export const paymentSchema = {
  method: {
    required: true,
    type: 'string' as const,
    allowedValues: ['cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay'] as const,
    message: 'Invalid payment method',
  },
  amount: {
    required: true,
    type: 'number' as const,
    min: 1,
    message: 'Payment amount must be positive',
  },
}
