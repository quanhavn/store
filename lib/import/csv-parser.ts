import * as XLSX from 'xlsx'
import type { CSVColumn } from './types'

export interface ParseResult {
  success: boolean
  data: string[][]
  columns: CSVColumn[]
  error?: string
}

/**
 * Parse CSV/Excel file to 2D array
 * Uses XLSX library which supports both CSV and Excel formats
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          resolve({ success: false, data: [], columns: [], error: 'Không thể đọc file' })
          return
        }

        // Parse using XLSX with UTF-8 codepage for proper Vietnamese encoding
        const workbook = XLSX.read(data, {
          type: 'array',
          codepage: 65001, // UTF-8
          raw: false,
        })

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          resolve({ success: false, data: [], columns: [], error: 'File không có dữ liệu' })
          return
        }

        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to 2D array
        const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          defval: '',
          raw: false, // Convert all values to strings
        })

        if (rawData.length === 0) {
          resolve({ success: false, data: [], columns: [], error: 'File không có dữ liệu' })
          return
        }

        // First row is headers
        const headers = rawData[0] as string[]
        const dataRows = rawData.slice(1).filter((row) => {
          // Filter out empty rows
          return row.some((cell) => cell && String(cell).trim() !== '')
        })

        if (headers.length === 0) {
          resolve({ success: false, data: [], columns: [], error: 'File không có tiêu đề cột' })
          return
        }

        // Build column metadata with sample values
        const columns: CSVColumn[] = headers.map((header, index) => {
          const sampleValues: string[] = []
          for (let i = 0; i < Math.min(3, dataRows.length); i++) {
            const value = dataRows[i]?.[index]
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              sampleValues.push(String(value).trim())
            }
          }
          return {
            index,
            header: String(header).trim(),
            sampleValues,
          }
        })

        // Convert to string array
        const stringData: string[][] = [
          headers.map((h) => String(h).trim()),
          ...dataRows.map((row) =>
            headers.map((_, idx) => {
              const val = row[idx]
              return val !== undefined && val !== null ? String(val).trim() : ''
            })
          ),
        ]

        resolve({
          success: true,
          data: stringData,
          columns,
        })
      } catch (error) {
        console.error('CSV parse error:', error)
        resolve({
          success: false,
          data: [],
          columns: [],
          error: 'Lỗi đọc file. Vui lòng kiểm tra định dạng file.',
        })
      }
    }

    reader.onerror = () => {
      resolve({ success: false, data: [], columns: [], error: 'Lỗi đọc file' })
    }

    // Read as ArrayBuffer for XLSX
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse a value to number, handling Vietnamese number format
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  // Remove thousands separators (both . and ,)
  // Vietnamese uses . for thousands and , for decimals
  let normalized = String(value).trim()

  // Check if it uses Vietnamese format (. for thousands)
  if (normalized.includes('.') && normalized.includes(',')) {
    // Has both, assume . is thousands and , is decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes('.')) {
    // Only has ., could be thousands or decimal
    // If multiple dots or dot not in decimal position, treat as thousands
    const parts = normalized.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = normalized.replace(/\./g, '')
    }
  } else if (normalized.includes(',')) {
    // Only has comma, treat as decimal separator
    normalized = normalized.replace(',', '.')
  }

  // Remove any remaining non-numeric characters except . and -
  normalized = normalized.replace(/[^\d.-]/g, '')

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

/**
 * Parse a date string to ISO format
 * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
 */
export function parseDate(value: string | null | undefined): string | null {
  if (!value || String(value).trim() === '') {
    return null
  }

  const str = String(value).trim()

  // Try parsing different formats
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY (Vietnamese format)
    { regex: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, dayIdx: 1, monthIdx: 2, yearIdx: 3 },
    // YYYY-MM-DD or YYYY/MM/DD (ISO format)
    { regex: /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/, dayIdx: 3, monthIdx: 2, yearIdx: 1 },
    // MM/DD/YYYY (US format)
    { regex: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, dayIdx: 2, monthIdx: 1, yearIdx: 3 },
  ]

  for (const pattern of patterns) {
    const match = str.match(pattern.regex)
    if (match) {
      const day = parseInt(match[pattern.dayIdx], 10)
      const month = parseInt(match[pattern.monthIdx], 10)
      const year = parseInt(match[pattern.yearIdx], 10)

      // Validate date
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        // Return ISO format
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  // Try native Date parsing as fallback
  try {
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // ignore
  }

  return null
}
