/**
 * Expense Book Export (Sổ Chi Phí Sản Xuất, Kinh Doanh - Mẫu số S3-HKD)
 * Following Vietnamese Tax 2026 format with expense categories breakdown
 */

interface ProcessedEntry {
  stt: number
  record_date: string
  voucher_no: string
  voucher_date: string
  description: string
  total_amount: number
  labor: number
  electricity: number
  water: number
  telecom: number
  rent: number
  admin: number
  other: number
}

interface ProcessedExpenseData {
  entries: ProcessedEntry[]
  totals: Record<string, number>
  period: { from: string; to: string }
}

interface StoreInfo {
  name: string
  address?: string
  taxCode?: string
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}`
  } catch {
    return dateStr
  }
}

function formatAmount(amount: number): string {
  if (amount === 0) return '-'
  return amount.toLocaleString('vi-VN')
}

/**
 * Export Expense Book to Excel (Mẫu số S3-HKD)
 */
export function exportExpenseBookExcel(
  data: ProcessedExpenseData,
  storeInfo: StoreInfo,
  year: number
): void {
  const XLSX = require('xlsx')

  const workbook = XLSX.utils.book_new()
  const rows: (string | number | null | undefined)[][] = []

  rows.push([`HỘ, CÁ NHÂN KINH DOANH: ${storeInfo.name}`])
  rows.push([`Địa chỉ: ${storeInfo.address || ''}`])
  rows.push([])
  rows.push(['SỔ CHI PHÍ SẢN XUẤT, KINH DOANH'])
  rows.push([`Tên địa điểm kinh doanh: ${storeInfo.address || ''}`])
  rows.push([`Năm ${year}`])
  rows.push([])

  const headerRow1Start = rows.length
  rows.push([
    'NGÀY, THÁNG\nGHI SỔ',
    'CHỨNG TỪ', '',
    'DIỄN GIẢI',
    'TẬP HỢP CHI PHÍ THEO CÁC YẾU TỐ SẢN XUẤT, KINH DOANH', '', '', '', '', '', '', '',
  ])
  rows.push([
    '',
    'SỐ HIỆU', 'NGÀY THÁNG',
    '',
    'TỔNG SỐ TIỀN',
    'CHIA RA', '', '', '', '', '', '',
  ])
  rows.push([
    '', '', '', '',
    '',
    'CHI PHÍ NHÂN CÔNG',
    'CHI PHÍ ĐIỆN',
    'CHI PHÍ NƯỚC',
    'CHI PHÍ VIỄN THÔNG',
    'CHI PHÍ THUÊ KHO BÃI, MẶT BẰNG KINH DOANH',
    'CHI PHÍ QUẢN LÝ',
    'CHI PHÍ KHÁC',
  ])
  rows.push(['A', 'B', 'C', 'D', '1', '2', '3', '4', '5', '6', '7', '8'])

  rows.push(['', '', '', 'Số phát sinh trong kỳ', '', '', '', '', '', '', '', ''])

  data.entries.forEach(entry => {
    rows.push([
      formatShortDate(entry.record_date),
      entry.voucher_no || '',
      formatShortDate(entry.voucher_date),
      entry.description,
      entry.total_amount > 0 ? entry.total_amount : '',
      entry.labor > 0 ? entry.labor : '',
      entry.electricity > 0 ? entry.electricity : '',
      entry.water > 0 ? entry.water : '',
      entry.telecom > 0 ? entry.telecom : '',
      entry.rent > 0 ? entry.rent : '',
      entry.admin > 0 ? entry.admin : '',
      entry.other > 0 ? entry.other : '',
    ])
  })

  rows.push([
    '', '', '',
    'Tổng cộng',
    data.totals.total_amount > 0 ? data.totals.total_amount : '',
    data.totals.labor > 0 ? data.totals.labor : '',
    data.totals.electricity > 0 ? data.totals.electricity : '',
    data.totals.water > 0 ? data.totals.water : '',
    data.totals.telecom > 0 ? data.totals.telecom : '',
    data.totals.rent > 0 ? data.totals.rent : '',
    data.totals.admin > 0 ? data.totals.admin : '',
    data.totals.other > 0 ? data.totals.other : '',
  ])

  rows.push([])
  rows.push(['- Sổ này có ... trang, đánh số từ trang 01 đến trang ...'])
  rows.push(['- Ngày mở sổ: ...'])
  rows.push([])
  rows.push([])

  const signatureRow = rows.length
  rows.push(['Người lập biểu', '', '', '', '', '', '', '', '', 'Ngày ... tháng ... năm ...'])
  rows.push(['(Ký, họ tên)', '', '', '', '', '', '', '', '', 'Người đại diện HKD/Cá nhân KD'])
  rows.push(['', '', '', '', '', '', '', '', '', '(Ký, họ tên, đóng dấu)'])

  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },
    { s: { r: headerRow1Start, c: 0 }, e: { r: headerRow1Start + 2, c: 0 } },
    { s: { r: headerRow1Start, c: 1 }, e: { r: headerRow1Start, c: 2 } },
    { s: { r: headerRow1Start, c: 3 }, e: { r: headerRow1Start + 2, c: 3 } },
    { s: { r: headerRow1Start, c: 4 }, e: { r: headerRow1Start, c: 11 } },
    { s: { r: headerRow1Start + 1, c: 4 }, e: { r: headerRow1Start + 2, c: 4 } },
    { s: { r: headerRow1Start + 1, c: 5 }, e: { r: headerRow1Start + 1, c: 11 } },
    { s: { r: signatureRow, c: 0 }, e: { r: signatureRow, c: 3 } },
    { s: { r: signatureRow, c: 9 }, e: { r: signatureRow, c: 11 } },
    { s: { r: signatureRow + 1, c: 0 }, e: { r: signatureRow + 1, c: 3 } },
    { s: { r: signatureRow + 1, c: 9 }, e: { r: signatureRow + 1, c: 11 } },
    { s: { r: signatureRow + 2, c: 9 }, e: { r: signatureRow + 2, c: 11 } },
  ]

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu số S3-HKD')

  const filename = `So_Chi_Phi_San_Xuat_${year}_${data.period.from}_${data.period.to}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/**
 * Export Expense Book to PDF (Mẫu số S3-HKD) with Vietnamese fonts
 */
export async function exportExpenseBookPDFNew(
  data: ProcessedExpenseData,
  storeInfo: StoreInfo,
  year: number
): Promise<void> {
  const { loadVietnameseFonts, addVietnameseFonts } = await import('./pdf-fonts')
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  await loadVietnameseFonts()

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 10
  let yPos = 12

  doc.setFontSize(9)
  doc.setFont(fontName, 'normal')
  doc.text('Mẫu số S3-HKD', pageWidth - marginLeft, yPos, { align: 'right' })

  yPos += 6
  doc.setFontSize(10)
  doc.setFont(fontName, 'bold')
  doc.text(`HỘ, CÁ NHÂN KINH DOANH: ${storeInfo.name}`, marginLeft, yPos)
  yPos += 5

  doc.setFont(fontName, 'normal')
  doc.text(`Địa chỉ: ${storeInfo.address || ''}`, marginLeft, yPos)
  yPos += 8

  doc.setFontSize(14)
  doc.setFont(fontName, 'bold')
  doc.text('SỔ CHI PHÍ SẢN XUẤT, KINH DOANH', pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  doc.text(`Tên địa điểm kinh doanh: ${storeInfo.address || ''}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  doc.text(`Năm: ${year}`, marginLeft, yPos)
  doc.text('ĐVT: Đồng', pageWidth - marginLeft, yPos, { align: 'right' })
  yPos += 6

  const tableBody: (string | number)[][] = []

  tableBody.push(['', '', '', 'Số phát sinh trong kỳ', '', '', '', '', '', '', '', ''])

  data.entries.forEach(entry => {
    tableBody.push([
      formatShortDate(entry.record_date),
      entry.voucher_no || '',
      formatShortDate(entry.voucher_date),
      entry.description,
      formatAmount(entry.total_amount),
      formatAmount(entry.labor),
      formatAmount(entry.electricity),
      formatAmount(entry.water),
      formatAmount(entry.telecom),
      formatAmount(entry.rent),
      formatAmount(entry.admin),
      formatAmount(entry.other),
    ])
  })

  tableBody.push([
    '', '', '',
    'Tổng cộng',
    formatAmount(data.totals.total_amount || 0),
    formatAmount(data.totals.labor || 0),
    formatAmount(data.totals.electricity || 0),
    formatAmount(data.totals.water || 0),
    formatAmount(data.totals.telecom || 0),
    formatAmount(data.totals.rent || 0),
    formatAmount(data.totals.admin || 0),
    formatAmount(data.totals.other || 0),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: 'NGÀY, THÁNG\nGHI SỔ', rowSpan: 3 },
        { content: 'CHỨNG TỪ', colSpan: 2 },
        { content: 'DIỄN GIẢI', rowSpan: 3 },
        { content: 'TẬP HỢP CHI PHÍ THEO CÁC YẾU TỐ SẢN XUẤT, KINH DOANH', colSpan: 8 },
      ],
      [
        { content: 'SỐ HIỆU' },
        { content: 'NGÀY THÁNG' },
        { content: 'TỔNG SỐ TIỀN', rowSpan: 2 },
        { content: 'CHIA RA', colSpan: 7 },
      ],
      [
        { content: '' },
        { content: '' },
        { content: 'NHÂN\nCÔNG' },
        { content: 'ĐIỆN' },
        { content: 'NƯỚC' },
        { content: 'VIỄN\nTHÔNG' },
        { content: 'THUÊ\nMẶT BẰNG' },
        { content: 'QUẢN\nLÝ' },
        { content: 'KHÁC' },
      ],
      ['A', 'B', 'C', 'D', '1', '2', '3', '4', '5', '6', '7', '8'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 7,
      cellPadding: 1.5,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 50 },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 22, halign: 'right' },
      11: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: marginLeft, right: marginLeft },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  doc.setFontSize(9)
  doc.setFont(fontName, 'normal')
  doc.text('- Sổ này có ... trang, đánh số từ trang 01 đến trang ...', marginLeft, finalY)
  doc.text('- Ngày mở sổ: ...', marginLeft, finalY + 5)

  doc.setFont(fontName, 'bold')
  doc.text('Người lập biểu', marginLeft + 30, finalY + 18, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên)', marginLeft + 30, finalY + 24, { align: 'center' })

  doc.text('Ngày ... tháng ... năm ...', pageWidth - 50, finalY + 12, { align: 'center' })
  doc.setFont(fontName, 'bold')
  doc.text('Người đại diện HKD/Cá nhân KD', pageWidth - 50, finalY + 18, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên, đóng dấu)', pageWidth - 50, finalY + 24, { align: 'center' })

  doc.save(`so-chi-phi-san-xuat-${year}-${data.period.from}-${data.period.to}.pdf`)
}
