/**
 * Vietnamese validation utilities for phone numbers and tax codes
 */

/**
 * Valid Vietnamese phone number prefixes
 * - 03x: Viettel
 * - 05x: Vietnamobile
 * - 07x: Mobifone
 * - 08x: Vinaphone
 * - 09x: Various carriers
 */
const VALID_PHONE_PREFIXES = ['03', '05', '07', '08', '09']

/**
 * Regex for validating Vietnamese tax code (MST)
 * - 10 digits: Legacy individual tax code
 * - 12 digits: CCCD-based individual tax code (per Circular 86/2024/TT-BTC)
 * - 13 digits: Business with branch code (10 + 3)
 */
export const TAX_CODE_REGEX = /^\d{10}(\d{2,3})?$/

/**
 * Valid tax code lengths
 */
export const VALID_TAX_CODE_LENGTHS = [10, 12, 13] as const

/**
 * Validates a Vietnamese phone number
 * Must be 10 digits starting with 03, 05, 07, 08, or 09
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone) return false
  const cleanPhone = phone.replace(/\D/g, '')
  return (
    cleanPhone.length === 10 &&
    VALID_PHONE_PREFIXES.some((prefix) => cleanPhone.startsWith(prefix))
  )
}

/**
 * Formats a Vietnamese phone number for display
 * Format: 0xxx xxx xxx
 */
export function formatVietnamesePhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length !== 10) return phone
  return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7)}`
}

/**
 * Converts Vietnamese phone to international format
 * 0912345678 -> +84912345678
 */
export function toInternationalPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return `+84${cleanPhone.slice(1)}`
  }
  return phone
}

/**
 * Validates Vietnamese tax code (Mã số thuế - MST)
 * - Individual: 10 digits (legacy) or 12 digits (CCCD-based, per Circular 86/2024/TT-BTC)
 * - Business: 13 digits (10 digits + 3-digit branch code)
 */
export function isValidTaxCode(taxCode: string | null | undefined): boolean {
  if (!taxCode) return true // Optional field
  const cleanCode = taxCode.replace(/[^0-9]/g, '')
  return (VALID_TAX_CODE_LENGTHS as readonly number[]).includes(cleanCode.length)
}

/**
 * Formats tax code for display
 * Individual: 0123456789
 * Business: 0123456789-001
 */
export function formatTaxCode(taxCode: string): string {
  const cleanCode = taxCode.replace(/[^0-9]/g, '')
  if (cleanCode.length === 13) {
    return `${cleanCode.slice(0, 10)}-${cleanCode.slice(10)}`
  }
  return cleanCode
}

/**
 * Determines tax code type
 * - 10 digits: Legacy individual tax code
 * - 12 digits: CCCD-based individual tax code (per Circular 86/2024/TT-BTC)
 * - 13 digits: Business with branch code
 */
export function getTaxCodeType(taxCode: string): 'individual' | 'business' | null {
  if (!taxCode) return null
  const cleanCode = taxCode.replace(/[^0-9]/g, '')
  if (cleanCode.length === 10 || cleanCode.length === 12) return 'individual'
  if (cleanCode.length === 13) return 'business'
  return null
}

/**
 * Revenue tier thresholds in VND
 */
export const REVENUE_TIERS = {
  under_200m: { min: 0, max: 200_000_000, label: 'Dưới 200 triệu/năm' },
  '200m_1b': { min: 200_000_000, max: 1_000_000_000, label: '200 triệu - 1 tỷ/năm' },
  '1b_3b': { min: 1_000_000_000, max: 3_000_000_000, label: '1 - 3 tỷ/năm' },
  over_3b: { min: 3_000_000_000, max: Infinity, label: 'Trên 3 tỷ/năm' },
} as const

export type RevenueTier = keyof typeof REVENUE_TIERS

/**
 * Determines if e-invoice is mandatory based on revenue tier
 * According to Vietnam Tax 2026 regulations
 */
export function isEInvoiceMandatory(tier: RevenueTier): boolean {
  return tier === '1b_3b' || tier === 'over_3b'
}
