import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable, { type RowInput, type CellDef } from 'jspdf-autotable'
import { formatPDFCurrency } from './export-pdf'
import { loadVietnameseFonts, addVietnameseFonts } from './pdf-fonts'

/**
 * Sổ chi tiết vật liệu, dụng cụ, sản phẩm
 * Per-product inventory tracking matching Vietnamese accounting standard
 */

export interface InventoryDetailEntry {
  stt: number
  documentNo: string
  documentDate: string
  description: string
  inQty: number | null
  inUnitPrice: number | null
  inAmount: number | null
  outQty: number | null
  outAmount: number | null
  balanceQty: number
  balanceAmount: number
}

export interface InventoryDetailProduct {
  productId: string
  variantId?: string | null
  productName: string
  sku: string
  unit: string
  entries: InventoryDetailEntry[]
  totals: {
    totalInQty: number
    totalInAmount: number
    totalOutQty: number
    totalOutAmount: number
    closingQty: number
    closingAmount: number
  }
}

export interface InventoryDetailBookReport {
  period: { from: string; to: string }
  products: InventoryDetailProduct[]
}

interface StoreInfo {
  name: string
  address?: string
  taxCode?: string
}

const HEADERS_ROW1 = [
  'STT',
  'Chứng từ',
  '',
  'Diễn giải',
  'Nhập trong kỳ',
  '',
  '',
  'Xuất trong kỳ',
  '',
  'Tồn',
  '',
]

const HEADERS_ROW2 = [
  '',
  'Số hiệu',
  'Ngày tháng',
  '',
  'SL',
  'Đơn giá',
  'Thành tiền',
  'SL',
  'Thành tiền',
  'SL',
  'Thành tiền',
]

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return ''
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatDate(dateStr: string): string {
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

export function exportInventoryDetailBookExcel(
  data: InventoryDetailBookReport,
  storeInfo: StoreInfo
): void {
  const workbook = XLSX.utils.book_new()
  const period = `${data.period.from} - ${data.period.to}`

  data.products.forEach((product, productIndex) => {
    const rows: (string | number | null)[][] = []

    rows.push([storeInfo.name])
    rows.push(['SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ, SẢN PHẨM'])
    rows.push([`Tên sản phẩm: ${product.productName}`])
    rows.push([`Mã SP: ${product.sku}  |  ĐVT: ${product.unit}`])
    rows.push([`Kỳ: ${period}`])
    rows.push([])

    rows.push(HEADERS_ROW1)
    rows.push(HEADERS_ROW2)

    const dataStartRow = rows.length + 1

    product.entries.forEach((entry) => {
      rows.push([
        entry.stt,
        entry.documentNo,
        formatDate(entry.documentDate),
        entry.description,
        entry.inQty,
        entry.inUnitPrice,
        entry.inAmount,
        entry.outQty,
        entry.outAmount,
        entry.balanceQty,
        entry.balanceAmount,
      ])
    })

    const dataEndRow = rows.length

    rows.push([])
    rows.push([
      '',
      '',
      '',
      'Cộng nhập trong kỳ',
      product.totals.totalInQty,
      '',
      product.totals.totalInAmount,
      '',
      '',
      '',
      '',
    ])
    rows.push([
      '',
      '',
      '',
      'Cộng xuất trong kỳ',
      '',
      '',
      '',
      product.totals.totalOutQty,
      product.totals.totalOutAmount,
      '',
      '',
    ])
    rows.push([
      '',
      '',
      '',
      'Tồn cuối kỳ',
      '',
      '',
      '',
      '',
      '',
      product.totals.closingQty,
      product.totals.closingAmount,
    ])

    const worksheet = XLSX.utils.aoa_to_sheet(rows)

    worksheet['!cols'] = [
      { wch: 5 },   // STT
      { wch: 12 },  // Số hiệu
      { wch: 12 },  // Ngày tháng
      { wch: 25 },  // Diễn giải
      { wch: 8 },   // Nhập SL
      { wch: 12 },  // Nhập Đơn giá
      { wch: 14 },  // Nhập Tiền
      { wch: 8 },   // Xuất SL
      { wch: 14 },  // Xuất Tiền
      { wch: 8 },   // Tồn SL
      { wch: 14 },  // Tồn Tiền
    ]

    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
      { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } },  // STT
      { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },  // Chứng từ
      { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } },  // Diễn giải
      { s: { r: 6, c: 4 }, e: { r: 6, c: 6 } },  // Nhập trong kỳ
      { s: { r: 6, c: 7 }, e: { r: 6, c: 8 } },  // Xuất trong kỳ (2 columns now)
      { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } }, // Tồn
    ]

    const sheetName = product.sku.substring(0, 31).replace(/[\\/*?[\]:]/g, '')
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || `SP${productIndex + 1}`)
    })

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    bookSST: false,
  })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filename = `So_Chi_Tiet_Ton_Kho_${data.period.from}_${data.period.to}`.replace(/\//g, '-')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportInventoryDetailBookPDF(
  data: InventoryDetailBookReport,
  storeInfo: StoreInfo
): Promise<void> {
  await loadVietnameseFonts()

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 10
  const marginRight = 10
  const period = `${data.period.from} - ${data.period.to}`

  data.products.forEach((product, productIndex) => {
    if (productIndex > 0) {
      doc.addPage()
    }

    let yPos = 12

    doc.setFontSize(12)
    doc.setFont(fontName, 'bold')
    doc.text(storeInfo.name, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    if (storeInfo.address) {
      doc.setFontSize(9)
      doc.setFont(fontName, 'normal')
      doc.text(storeInfo.address, pageWidth / 2, yPos, { align: 'center' })
      yPos += 4
    }

    if (storeInfo.taxCode) {
      doc.setFontSize(9)
      doc.text(`MST: ${storeInfo.taxCode}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 4
    }

    yPos += 3

    doc.setFontSize(14)
    doc.setFont(fontName, 'bold')
    doc.text('SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ, SẢN PHẨM, HÀNG HÓA', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    doc.setFontSize(10)
    doc.setFont(fontName, 'normal')
    doc.text(`Tên vật liệu, dụng cụ, sản phẩm, hàng hóa: ${product.productName}`, marginLeft, yPos)
    yPos += 4
    doc.text(`Mã SP: ${product.sku}  |  ĐVT: ${product.unit}`, marginLeft, yPos)
    yPos += 4
    doc.text(`Kỳ: ${period}`, marginLeft, yPos)
    yPos += 6

    const headers: CellDef[][] = [
      [
        { content: 'STT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'CHỨNG TỪ', colSpan: 2, styles: { halign: 'center' } },
        { content: 'DIỄN GIẢI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NHẬP', colSpan: 3, styles: { halign: 'center' } },
        { content: 'XUẤT', colSpan: 2, styles: { halign: 'center' } },
        { content: 'TỒN', colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        { content: 'SỐ HIỆU', styles: { halign: 'center' } },
        { content: 'NGÀY, THÁNG', styles: { halign: 'center' } },
        { content: 'SỐ LƯỢNG', styles: { halign: 'center' } },
        { content: 'ĐƠN GIÁ', styles: { halign: 'center' } },
        { content: 'THÀNH TIỀN', styles: { halign: 'center' } },
        { content: 'SỐ LƯỢNG', styles: { halign: 'center' } },
        { content: 'THÀNH TIỀN', styles: { halign: 'center' } },
        { content: 'SỐ LƯỢNG', styles: { halign: 'center' } },
        { content: 'THÀNH TIỀN', styles: { halign: 'center' } },
      ],
    ]

    const tableBody: RowInput[] = product.entries.map((entry) => [
      { content: entry.stt, styles: { halign: 'center' } },
      { content: entry.documentNo, styles: { halign: 'left' } },
      { content: formatDate(entry.documentDate), styles: { halign: 'center' } },
      { content: entry.description, styles: { halign: 'left' } },
      { content: entry.inQty ?? '', styles: { halign: 'right' } },
      { content: formatCurrency(entry.inUnitPrice), styles: { halign: 'right' } },
      { content: formatCurrency(entry.inAmount), styles: { halign: 'right' } },
      { content: entry.outQty ?? '', styles: { halign: 'right' } },
      { content: formatCurrency(entry.outAmount), styles: { halign: 'right' } },
      { content: entry.balanceQty, styles: { halign: 'right' } },
      { content: formatCurrency(entry.balanceAmount), styles: { halign: 'right' } },
    ])

    tableBody.push([
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: 'Cộng phát sinh trong kỳ', styles: { fontStyle: 'bold', halign: 'left' } },
      { content: product.totals.totalInQty, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '', styles: {} },
      { content: formatCurrency(product.totals.totalInAmount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
    ])

    tableBody.push([
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: 'Cộng xuất trong kỳ', styles: { fontStyle: 'bold', halign: 'left' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: product.totals.totalOutQty, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(product.totals.totalOutAmount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
    ])

    tableBody.push([
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: 'Số dư cuối kỳ', styles: { fontStyle: 'bold', halign: 'left' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: product.totals.closingQty, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(product.totals.closingAmount), styles: { fontStyle: 'bold', halign: 'right' } },
    ])

    autoTable(doc, {
      startY: yPos,
      head: headers,
      body: tableBody,
      theme: 'grid',
      styles: {
        font: fontName,
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [180, 180, 180],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [62, 207, 142],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 8 },   // STT
        1: { cellWidth: 22 },  // Số hiệu
        2: { cellWidth: 22 },  // Ngày
        3: { cellWidth: 45 },  // Diễn giải
        4: { cellWidth: 16 },  // Nhập SỐ LƯỢNG
        5: { cellWidth: 22 },  // Nhập Đơn giá
        6: { cellWidth: 24 },  // Nhập Thành tiền
        7: { cellWidth: 16 },  // Xuất SL
        8: { cellWidth: 24 },  // Xuất Thành tiền
        9: { cellWidth: 16 },  // Tồn SL
        10: { cellWidth: 24 }, // Tồn Thành tiền
      },
      margin: { left: marginLeft, right: marginRight },
      didDrawPage: () => {
        const pageNumber = doc.getCurrentPageInfo().pageNumber
        const totalPages = doc.getNumberOfPages()

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Trang ${pageNumber}/${totalPages}`,
          pageWidth - marginRight,
          pageHeight - 8,
          { align: 'right' }
        )

        const exportDate = new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        doc.text(
          `Ngày xuat: ${exportDate}`,
          marginLeft,
          pageHeight - 8
        )
      },
    })
  })

  const filename = `So_Chi_Tiet_Ton_Kho_${data.period.from}_${data.period.to}`.replace(/\//g, '-')
  doc.save(`${filename}.pdf`)
}
