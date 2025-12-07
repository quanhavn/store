import * as XLSX from 'xlsx'

export interface ExcelExportOptions {
  filename: string
  sheetName: string
  title: string
  storeName: string
  period: string
  headers: string[]
  data: (string | number | null | undefined)[][]
  totals?: (string | number | null | undefined)[]
  columnWidths?: number[]
}

/**
 * Export data to Excel file with Vietnamese formatting
 * Supports UTF-8 for Vietnamese text
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const {
    filename,
    sheetName,
    title,
    storeName,
    period,
    headers,
    data,
    totals,
    columnWidths,
  } = options

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()

  // Build rows array with metadata
  const rows: (string | number | null | undefined)[][] = []

  // Row 1: Store name
  rows.push([storeName])

  // Row 2: Report title
  rows.push([title])

  // Row 3: Period
  rows.push([`Ky: ${period}`])

  // Row 4: Export date
  const exportDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  rows.push([`Ngay xuat: ${exportDate}`])

  // Row 5: Empty row for spacing
  rows.push([])

  // Row 6: Headers
  rows.push(headers)

  // Data rows
  data.forEach(row => {
    rows.push(row)
  })

  // Totals row if provided
  if (totals && totals.length > 0) {
    rows.push([]) // Empty row before totals
    rows.push(totals)
  }

  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Calculate column widths
  const colWidths = calculateColumnWidths(headers, data, totals, columnWidths)
  worksheet['!cols'] = colWidths.map(w => ({ wch: w }))

  // Merge cells for title rows (store name, report title, period, export date)
  const lastCol = headers.length - 1
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // Store name
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }, // Period
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } }, // Export date
  ]

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate Excel file and trigger download
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    bookSST: false,
  })

  // Create blob and download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Calculate optimal column widths based on content
 */
function calculateColumnWidths(
  headers: string[],
  data: (string | number | null | undefined)[][],
  totals?: (string | number | null | undefined)[],
  customWidths?: number[]
): number[] {
  const widths: number[] = []

  for (let i = 0; i < headers.length; i++) {
    // Start with header width
    let maxWidth = getStringWidth(headers[i])

    // Check all data rows
    data.forEach(row => {
      if (row[i] !== undefined && row[i] !== null) {
        const cellWidth = getStringWidth(String(row[i]))
        maxWidth = Math.max(maxWidth, cellWidth)
      }
    })

    // Check totals row
    if (totals && totals[i] !== undefined && totals[i] !== null) {
      const cellWidth = getStringWidth(String(totals[i]))
      maxWidth = Math.max(maxWidth, cellWidth)
    }

    // Use custom width if provided, otherwise use calculated width
    if (customWidths && customWidths[i]) {
      widths.push(customWidths[i])
    } else {
      // Add some padding and cap the width
      widths.push(Math.min(Math.max(maxWidth + 2, 8), 50))
    }
  }

  return widths
}

/**
 * Get approximate display width of a string
 * Vietnamese characters are counted as slightly wider
 */
function getStringWidth(str: string): number {
  if (!str) return 0

  let width = 0
  for (const char of str) {
    // Vietnamese characters and special chars take more space
    if (char.charCodeAt(0) > 127) {
      width += 1.5
    } else {
      width += 1
    }
  }

  return Math.ceil(width)
}

/**
 * Format number as Vietnamese currency string for Excel display
 */
export function formatCurrencyForExcel(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return ''
  return new Intl.NumberFormat('vi-VN').format(amount)
}

/**
 * Format date for Excel display (DD/MM/YYYY)
 */
export function formatDateForExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
