import jsPDF from 'jspdf'
import autoTable, { type RowInput, type CellDef } from 'jspdf-autotable'

/**
 * PDF Export Utility for Accounting Reports
 *
 * Note on Vietnamese Font Support:
 * - Built-in fonts (Helvetica) support basic Latin characters
 * - For full Vietnamese diacritical support, embed a Unicode font like:
 *   - Roboto
 *   - Open Sans
 *   - Times New Roman (with Vietnamese support)
 * - Font embedding requires converting TTF to base64 and using doc.addFileToVFS()
 *
 * Current implementation normalizes Vietnamese text where possible for basic support.
 */

export interface PDFExportOptions {
  filename: string
  title: string
  storeName: string
  storeAddress?: string
  storeTaxCode?: string
  period: string
  headers: string[]
  data: (string | number)[][]
  totals?: (string | number)[]
  orientation?: 'portrait' | 'landscape'
  columnAligns?: ('left' | 'center' | 'right')[]
  columnWidths?: number[]
}

/**
 * Normalize Vietnamese text for basic font support
 * This converts accented characters to their base form when full Unicode fonts are not available
 */
export function normalizeVietnamese(text: string): string {
  const map: Record<string, string> = {
    'a': 'a', 'A': 'A',
    // Vietnamese lowercase with diacritics
    '\u00e0': 'a', '\u00e1': 'a', '\u1ea3': 'a', '\u00e3': 'a', '\u1ea1': 'a',
    '\u0103': 'a', '\u1eb1': 'a', '\u1eaf': 'a', '\u1eb3': 'a', '\u1eb5': 'a', '\u1eb7': 'a',
    '\u00e2': 'a', '\u1ea7': 'a', '\u1ea5': 'a', '\u1ea9': 'a', '\u1eab': 'a', '\u1ead': 'a',
    '\u00e8': 'e', '\u00e9': 'e', '\u1ebb': 'e', '\u1ebd': 'e', '\u1eb9': 'e',
    '\u00ea': 'e', '\u1ec1': 'e', '\u1ebf': 'e', '\u1ec3': 'e', '\u1ec5': 'e', '\u1ec7': 'e',
    '\u00ec': 'i', '\u00ed': 'i', '\u1ec9': 'i', '\u0129': 'i', '\u1ecb': 'i',
    '\u00f2': 'o', '\u00f3': 'o', '\u1ecf': 'o', '\u00f5': 'o', '\u1ecd': 'o',
    '\u00f4': 'o', '\u1ed3': 'o', '\u1ed1': 'o', '\u1ed5': 'o', '\u1ed7': 'o', '\u1ed9': 'o',
    '\u01a1': 'o', '\u1edd': 'o', '\u1edb': 'o', '\u1edf': 'o', '\u1ee1': 'o', '\u1ee3': 'o',
    '\u00f9': 'u', '\u00fa': 'u', '\u1ee7': 'u', '\u0169': 'u', '\u1ee5': 'u',
    '\u01b0': 'u', '\u1eeb': 'u', '\u1ee9': 'u', '\u1eed': 'u', '\u1eef': 'u', '\u1ef1': 'u',
    '\u1ef3': 'y', '\u00fd': 'y', '\u1ef7': 'y', '\u1ef9': 'y', '\u1ef5': 'y',
    '\u0111': 'd',
    // Vietnamese uppercase with diacritics
    '\u00c0': 'A', '\u00c1': 'A', '\u1ea2': 'A', '\u00c3': 'A', '\u1ea0': 'A',
    '\u0102': 'A', '\u1eb0': 'A', '\u1eae': 'A', '\u1eb2': 'A', '\u1eb4': 'A', '\u1eb6': 'A',
    '\u00c2': 'A', '\u1ea6': 'A', '\u1ea4': 'A', '\u1ea8': 'A', '\u1eaa': 'A', '\u1eac': 'A',
    '\u00c8': 'E', '\u00c9': 'E', '\u1eba': 'E', '\u1ebc': 'E', '\u1eb8': 'E',
    '\u00ca': 'E', '\u1ec0': 'E', '\u1ebe': 'E', '\u1ec2': 'E', '\u1ec4': 'E', '\u1ec6': 'E',
    '\u00cc': 'I', '\u00cd': 'I', '\u1ec8': 'I', '\u0128': 'I', '\u1eca': 'I',
    '\u00d2': 'O', '\u00d3': 'O', '\u1ece': 'O', '\u00d5': 'O', '\u1ecc': 'O',
    '\u00d4': 'O', '\u1ed2': 'O', '\u1ed0': 'O', '\u1ed4': 'O', '\u1ed6': 'O', '\u1ed8': 'O',
    '\u01a0': 'O', '\u1edc': 'O', '\u1eda': 'O', '\u1ede': 'O', '\u1ee0': 'O', '\u1ee2': 'O',
    '\u00d9': 'U', '\u00da': 'U', '\u1ee6': 'U', '\u0168': 'U', '\u1ee4': 'U',
    '\u01af': 'U', '\u1eea': 'U', '\u1ee8': 'U', '\u1eec': 'U', '\u1eee': 'U', '\u1ef0': 'U',
    '\u1ef2': 'Y', '\u00dd': 'Y', '\u1ef6': 'Y', '\u1ef8': 'Y', '\u1ef4': 'Y',
    '\u0110': 'D',
  }

  return text.split('').map(char => map[char] || char).join('')
}

/**
 * Format currency value for PDF display
 */
export function formatPDFCurrency(value: number): string {
  if (value === 0) return '-'
  return new Intl.NumberFormat('vi-VN').format(value)
}

/**
 * Export data to PDF with professional formatting
 */
export function exportToPDF(options: PDFExportOptions): void {
  const {
    filename,
    title,
    storeName,
    storeAddress,
    storeTaxCode,
    period,
    headers,
    data,
    totals,
    orientation = 'portrait',
    columnAligns,
    columnWidths,
  } = options

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 14
  const marginRight = 14
  const marginTop = 15
  const contentWidth = pageWidth - marginLeft - marginRight

  // Track vertical position
  let yPos = marginTop

  // === HEADER SECTION ===
  // Store name (centered, bold)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(normalizeVietnamese(storeName), pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  // Store address (centered, normal)
  if (storeAddress) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(normalizeVietnamese(storeAddress), pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  // Tax code (centered)
  if (storeTaxCode) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`MST: ${storeTaxCode}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  yPos += 5

  // === REPORT TITLE ===
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(normalizeVietnamese(title), pageWidth / 2, yPos, { align: 'center' })
  yPos += 7

  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ky: ${period}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // === DATA TABLE ===
  // Prepare table headers with normalized text
  const tableHeaders = headers.map(h => normalizeVietnamese(h))

  // Prepare table body with normalized text and formatted numbers
  const tableBody: RowInput[] = data.map(row =>
    row.map((cell, colIndex) => {
      const align = columnAligns?.[colIndex] || 'left'
      const content = typeof cell === 'number'
        ? formatPDFCurrency(cell)
        : normalizeVietnamese(String(cell))

      return {
        content,
        styles: { halign: align },
      } as CellDef
    })
  )

  // Add totals row if provided
  if (totals && totals.length > 0) {
    const totalsRow: CellDef[] = totals.map((cell, colIndex) => {
      const align = columnAligns?.[colIndex] || 'left'
      const content = typeof cell === 'number'
        ? formatPDFCurrency(cell)
        : normalizeVietnamese(String(cell))

      return {
        content,
        styles: {
          halign: align,
          fontStyle: 'bold',
          fillColor: [240, 240, 240],
        },
      }
    })
    tableBody.push(totalsRow)
  }

  // Calculate column widths
  const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {}

  if (columnWidths) {
    columnWidths.forEach((width, index) => {
      columnStyles[index] = {
        cellWidth: width,
        halign: columnAligns?.[index] || 'left',
      }
    })
  } else if (columnAligns) {
    columnAligns.forEach((align, index) => {
      columnStyles[index] = { halign: align }
    })
  }

  // Generate table
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [62, 207, 142], // #3ecf8e - green background
      textColor: [255, 255, 255], // white text
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto',
    didDrawPage: (data) => {
      // Footer on each page
      const pageNumber = doc.getCurrentPageInfo().pageNumber
      const totalPages = doc.getNumberOfPages()

      // Page number (right side)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Trang ${pageNumber}/${totalPages}`,
        pageWidth - marginRight,
        pageHeight - 10,
        { align: 'right' }
      )

      // Export date (left side)
      const exportDate = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      doc.text(
        `Ngay xuat: ${exportDate}`,
        marginLeft,
        pageHeight - 10
      )
    },
  })

  // Save the PDF
  doc.save(`${filename}.pdf`)
}

/**
 * Export data to PDF with custom formatting for multi-section reports
 */
export interface PDFMultiSectionOptions {
  filename: string
  title: string
  storeName: string
  storeAddress?: string
  storeTaxCode?: string
  period: string
  sections: Array<{
    title?: string
    headers: string[]
    data: (string | number)[][]
    totals?: (string | number)[]
    columnAligns?: ('left' | 'center' | 'right')[]
  }>
  orientation?: 'portrait' | 'landscape'
}

export function exportMultiSectionPDF(options: PDFMultiSectionOptions): void {
  const {
    filename,
    title,
    storeName,
    storeAddress,
    storeTaxCode,
    period,
    sections,
    orientation = 'portrait',
  } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 14
  const marginRight = 14
  const marginTop = 15

  let yPos = marginTop

  // === HEADER SECTION ===
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(normalizeVietnamese(storeName), pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  if (storeAddress) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(normalizeVietnamese(storeAddress), pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  if (storeTaxCode) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`MST: ${storeTaxCode}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  yPos += 5

  // === REPORT TITLE ===
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(normalizeVietnamese(title), pageWidth / 2, yPos, { align: 'center' })
  yPos += 7

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ky: ${period}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // === SECTIONS ===
  sections.forEach((section, sectionIndex) => {
    // Add section title if provided
    if (section.title) {
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = marginTop
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(normalizeVietnamese(section.title), marginLeft, yPos)
      yPos += 6
    }

    const tableHeaders = section.headers.map(h => normalizeVietnamese(h))

    const tableBody: RowInput[] = section.data.map(row =>
      row.map((cell, colIndex) => {
        const align = section.columnAligns?.[colIndex] || 'left'
        const content = typeof cell === 'number'
          ? formatPDFCurrency(cell)
          : normalizeVietnamese(String(cell))

        return {
          content,
          styles: { halign: align },
        } as CellDef
      })
    )

    if (section.totals && section.totals.length > 0) {
      const totalsRow: CellDef[] = section.totals.map((cell, colIndex) => {
        const align = section.columnAligns?.[colIndex] || 'left'
        const content = typeof cell === 'number'
          ? formatPDFCurrency(cell)
          : normalizeVietnamese(String(cell))

        return {
          content,
          styles: {
            halign: align,
            fontStyle: 'bold',
            fillColor: [240, 240, 240],
          },
        }
      })
      tableBody.push(totalsRow)
    }

    const columnStyles: Record<number, { halign?: 'left' | 'center' | 'right' }> = {}
    if (section.columnAligns) {
      section.columnAligns.forEach((align, index) => {
        columnStyles[index] = { halign: align }
      })
    }

    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [62, 207, 142],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles,
      margin: { left: marginLeft, right: marginRight },
      didDrawPage: (data) => {
        const pageNumber = doc.getCurrentPageInfo().pageNumber
        const totalPages = doc.getNumberOfPages()

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Trang ${pageNumber}/${totalPages}`,
          pageWidth - marginRight,
          pageHeight - 10,
          { align: 'right' }
        )

        const exportDate = new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        doc.text(
          `Ngay xuat: ${exportDate}`,
          marginLeft,
          pageHeight - 10
        )
      },
    })

    // Get final Y position after table
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  })

  doc.save(`${filename}.pdf`)
}
