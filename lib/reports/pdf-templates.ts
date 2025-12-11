import {
  exportToPDF,
  exportMultiSectionPDF,
  formatPDFCurrency,
  normalizeVietnamese,
  type PDFExportOptions,
} from './export-pdf'
import type {
  RevenueBookReport,
  CashBookReport,
  BankBookReport,
  ExpenseBookReport,
  InventoryBookReport,
  TaxBookReport,
  SalaryBookReport,
} from '@/lib/supabase/functions'

/**
 * PDF Templates for 7 Accounting Books
 *
 * Each function prepares report data in the correct format for PDF export
 * with proper column alignment and Vietnamese text handling.
 */

interface StoreInfo {
  name: string
  address?: string
  taxCode?: string
}

/**
 * 1. Revenue Book (Sổ Chi Tiết Doanh Thu Bán Hàng - Mẫu S1-HKD)
 * Exports sales revenue by 4 business categories with VAT/PIT rates
 */
export async function exportRevenueBookPDF(
  data: RevenueBookReport,
  storeInfo: StoreInfo
): Promise<void> {
  const { loadVietnameseFonts, addVietnameseFonts } = await import('./pdf-fonts')
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  await loadVietnameseFonts()

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const { entries = [], totals, period, year = new Date().getFullYear(), tax_payable } = data
  const safeTaxPayable = tax_payable || { total_vat: 0, total_pit: 0 }
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont(fontName, 'normal')
  doc.setFontSize(10)
  doc.text(`HỘ, CÁ NHÂN KINH DOANH: ${storeInfo.name}`, 14, 15)
  doc.text(`Địa chỉ: ${storeInfo.address || ''}`, 14, 21)

  doc.setFont(fontName, 'bold')
  doc.setFontSize(14)
  doc.text('SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ', pageWidth / 2, 32, { align: 'center' })

  doc.setFont(fontName, 'normal')
  doc.setFontSize(10)
  doc.text(`Năm: ${year}`, 14, 40)
  doc.text('Đơn vị tính: Ngàn đồng', pageWidth - 14, 40, { align: 'right' })

  const tableData = entries.map((entry) => [
    entry.record_date || '',
    entry.voucher_no || '',
    entry.voucher_date || '',
    entry.description,
    entry.goods_distribution > 0 ? formatPDFCurrency(entry.goods_distribution) : '-',
    entry.service_construction > 0 ? formatPDFCurrency(entry.service_construction) : '-',
    entry.manufacturing_transport > 0 ? formatPDFCurrency(entry.manufacturing_transport) : '-',
    entry.other_business > 0 ? formatPDFCurrency(entry.other_business) : '-',
    entry.note || '',
  ])

  tableData.push([
    '', '', '', 'Tổng cộng',
    totals.goods_distribution > 0 ? formatPDFCurrency(totals.goods_distribution) : '-',
    totals.service_construction > 0 ? formatPDFCurrency(totals.service_construction) : '-',
    totals.manufacturing_transport > 0 ? formatPDFCurrency(totals.manufacturing_transport) : '-',
    totals.other_business > 0 ? formatPDFCurrency(totals.other_business) : '-',
    '',
  ])

  autoTable(doc, {
    startY: 45,
    head: [
      [
        { content: 'NGÀY, THÁNG\nGHI SỔ', rowSpan: 2 },
        { content: 'CHỨNG TỪ', colSpan: 2 },
        { content: 'DIỄN GIẢI', rowSpan: 2 },
        { content: 'DOANH THU BÁN HÀNG HÓA, DỊCH VỤ CHIA THEO DANH MỤC NGÀNH NGHỀ', colSpan: 4 },
        { content: 'GHI CHÚ', rowSpan: 2 },
      ],
      [
        'SỐ HIỆU', 'NGÀY, THÁNG',
        'Phân phối HH\n(GTGT 1%,\nTNCN 0,5%)',
        'Dịch vụ, XD\n(GTGT 5%,\nTNCN 2%)',
        'SX, Vận tải\n(GTGT 3%,\nTNCN 1,5%)',
        'KD khác\n(GTGT 2%,\nTNCN 1%)',
      ],
    ],
    body: tableData,
    styles: {
      font: fontName,
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 50 },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 25 },
    },
  })

  const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 180

  doc.setFont(fontName, 'normal')
  doc.setFontSize(9)
  doc.text('Tiền thuế phải nộp:', 14, finalY + 10)
  doc.text(`- Thuế GTGT: ${formatPDFCurrency(safeTaxPayable.total_vat)}`, 14, finalY + 16)
  doc.text(`- Thuế TNCN: ${formatPDFCurrency(safeTaxPayable.total_pit)}`, 14, finalY + 22)

  doc.text('Ngày ... tháng ... năm ...', pageWidth - 50, finalY + 10, { align: 'center' })
  doc.text('Người đại diện HKD/Cá nhân KD', pageWidth - 50, finalY + 16, { align: 'center' })
  doc.text('(Ký, họ tên, đóng dấu)', pageWidth - 50, finalY + 22, { align: 'center' })

  doc.save(`so-chi-tiet-doanh-thu-${year}-${period.from}-${period.to}.pdf`)
}

/**
 * 2. Cash Book (Sổ Quỹ Tiền Mặt - Mẫu S6-HKD)
 * Exports cash inflow/outflow with running balance following Vietnam Tax 2026 format
 */
export async function exportCashBookPDF(
  data: CashBookReport,
  storeInfo: StoreInfo
): Promise<void> {
  const { entries, totals, period, opening_balance } = data

  const { loadVietnameseFonts, addVietnameseFonts } = await import('./pdf-fonts')
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  await loadVietnameseFonts()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 14
  let yPos = 15

  doc.setFontSize(11)
  doc.setFont(fontName, 'bold')
  doc.text(`HỘ, CÁ NHÂN KINH DOANH: ${storeInfo.name}`, marginLeft, yPos)
  yPos += 5

  if (storeInfo.address) {
    doc.setFontSize(10)
    doc.setFont(fontName, 'normal')
    doc.text(`Địa chỉ: ${storeInfo.address}`, marginLeft, yPos)
    yPos += 5
  }

  yPos += 8
  doc.setFontSize(14)
  doc.setFont(fontName, 'bold')
  doc.text('SỔ QUỸ TIỀN MẶT', pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  doc.text('Loại quỹ: Tiền mặt', pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(9)
  doc.text(`Kỳ: ${period.from} - ${period.to}`, marginLeft, yPos)
  doc.text('ĐVT: Đồng', pageWidth - marginLeft, yPos, { align: 'right' })
  yPos += 6

  const formatAmount = (amount: number) => {
    if (amount === 0) return '-'
    return amount.toLocaleString('vi-VN')
  }

  const formatShortDate = (dateStr: string | undefined) => {
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

  const tableBody: (string | number)[][] = []

  tableBody.push(['', '', '', '- Số dư đầu kỳ', '', '', formatAmount(opening_balance || 0), ''])
  tableBody.push(['', '', '', '- Số phát sinh trong kỳ', '', '', '', ''])

  entries.forEach(entry => {
    const voucherNo = entry.voucher_no_in || entry.voucher_no_out || ''
    tableBody.push([
      formatShortDate(entry.record_date),
      voucherNo,
      formatShortDate(entry.voucher_date),
      entry.description,
      entry.debit > 0 ? formatAmount(entry.debit) : '-',
      entry.credit > 0 ? formatAmount(entry.credit) : '-',
      formatAmount(entry.balance),
      entry.note || '',
    ])
  })

  tableBody.push(['', '', '', '- Cộng số phát sinh trong kỳ', formatAmount(totals.total_debit), formatAmount(totals.total_credit), '', ''])
  tableBody.push(['', '', '', '- Số dư cuối kỳ', '', '', formatAmount(totals.closing_balance), ''])

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: 'GHI SỔ', rowSpan: 2 },
        { content: 'CHỨNG TỪ', colSpan: 2 },
        { content: 'DIỄN GIẢI', rowSpan: 2 },
        { content: 'SỐ TIỀN', colSpan: 3 },
        { content: 'GHI CHÚ', rowSpan: 2 },
      ],
      [
        { content: 'SỐ HIỆU' },
        { content: 'NGÀY, THÁNG' },
        { content: 'THU' },
        { content: 'CHI' },
        { content: 'TỒN' },
      ],
      ['A', 'B', 'C', 'D', '1', '2', '3', 'E'],
    ],
    body: tableBody,
    styles: {
      font: fontName,
      fontSize: 8,
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
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 16 },
    },
    theme: 'grid',
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

  doc.setFontSize(9)
  doc.setFont(fontName, 'normal')
  doc.text('- Sổ này có ... trang, đánh số từ trang 01 đến trang ...', marginLeft, finalY)
  doc.text('- Ngày mở sổ: ...', marginLeft, finalY + 5)

  doc.setFont(fontName, 'bold')
  doc.text('Người lập biểu', marginLeft + 20, finalY + 20, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên)', marginLeft + 20, finalY + 26, { align: 'center' })

  doc.text('Ngày ... tháng ... năm ...', pageWidth - 50, finalY + 15, { align: 'center' })
  doc.setFont(fontName, 'bold')
  doc.text('Người đại diện HKD/Cá nhân KD', pageWidth - 50, finalY + 20, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên, đóng dấu)', pageWidth - 50, finalY + 26, { align: 'center' })

  doc.save(`so-quy-tien-mat-${period.from}-${period.to}.pdf`)
}

/**
 * 3. Bank Book (Sổ Tiền Gửi Ngân Hàng - Mẫu S7-HKD)
 * Exports bank deposit book per account following Vietnam Tax 2026 format
 * With 3-row header structure matching the official template
 */
export async function exportBankBookPDF(
  data: BankBookReport,
  storeInfo: StoreInfo
): Promise<void> {
  const { entries, totals, period, bank_account, opening_balance } = data

  const bankName = bank_account?.bank_name || ''
  const accountNumber = bank_account?.account_number || ''

  const { loadVietnameseFonts, addVietnameseFonts } = await import('./pdf-fonts')
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  await loadVietnameseFonts()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 14
  let yPos = 15

  doc.setFontSize(11)
  doc.setFont(fontName, 'bold')
  doc.text(`HỘ, CÁ NHÂN KINH DOANH: ${storeInfo.name}`, marginLeft, yPos)
  yPos += 5

  if (storeInfo.address) {
    doc.setFontSize(10)
    doc.setFont(fontName, 'normal')
    doc.text(`Địa chỉ: ${storeInfo.address}`, marginLeft, yPos)
    yPos += 5
  }

  yPos += 8
  doc.setFontSize(14)
  doc.setFont(fontName, 'bold')
  doc.text('SỔ TIỀN GỬI NGÂN HÀNG', pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  doc.text(`Nơi mở tài khoản giao dịch: ${bankName}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  doc.text(`Số hiệu tài khoản tại nơi gửi: ${accountNumber}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 6
  
  doc.setFontSize(9)
  doc.text(`Kỳ: ${period.from} - ${period.to}`, marginLeft, yPos)
  doc.text('ĐVT: Đồng', pageWidth - marginLeft, yPos, { align: 'right' })
  yPos += 6

  const formatAmount = (amount: number) => {
    if (amount === 0) return '-'
    return amount.toLocaleString('vi-VN')
  }

  const formatShortDate = (dateStr: string | undefined) => {
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

  const tableBody: (string | number)[][] = []

  tableBody.push(['', '', '', '- Số dư đầu kỳ', '', '', formatAmount(opening_balance), ''])
  tableBody.push(['', '', '', '- Số phát sinh trong kỳ', '', '', '', ''])

  entries.forEach(entry => {
    tableBody.push([
      formatShortDate(entry.record_date),
      entry.voucher_no || '',
      formatShortDate(entry.voucher_date),
      entry.description || '',
      entry.debit > 0 ? formatAmount(entry.debit) : '-',
      entry.credit > 0 ? formatAmount(entry.credit) : '-',
      formatAmount(entry.balance),
      entry.note || '',
    ])
  })

  tableBody.push(['', '', '', '- Cộng số phát sinh trong kỳ', formatAmount(totals.total_debit), formatAmount(totals.total_credit), '', ''])
  tableBody.push(['', '', '', '- Số dư cuối kỳ', '', '', formatAmount(totals.closing_balance), ''])

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: 'GHI SỔ', rowSpan: 2 },
        { content: 'CHỨNG TỪ', colSpan: 2 },
        { content: 'DIỄN GIẢI', rowSpan: 2 },
        { content: 'SỐ TIỀN', colSpan: 3 },
        { content: 'GHI CHÚ', rowSpan: 2 },
      ],
      [
        { content: 'SỐ HIỆU' },
        { content: 'NGÀY, THÁNG' },
        { content: 'THU\n(GỬI VÀO)' },
        { content: 'CHI\n(RÚT RA)' },
        { content: 'CÒN LẠI' },
      ],
      ['A', 'B', 'C', 'D', '1', '2', '3', 'F'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 8,
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
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 16 },
    },
    margin: { left: marginLeft, right: marginLeft },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

  doc.setFontSize(9)
  doc.setFont(fontName, 'normal')
  doc.text('- Sổ này có ... trang, đánh số từ trang 01 đến trang ...', marginLeft, finalY)
  doc.text('- Ngày mở sổ: ...', marginLeft, finalY + 5)

  doc.setFont(fontName, 'bold')
  doc.text('Người lập biểu', marginLeft + 20, finalY + 20, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên)', marginLeft + 20, finalY + 26, { align: 'center' })

  doc.text('Ngày ... tháng ... năm ...', pageWidth - 50, finalY + 15, { align: 'center' })
  doc.setFont(fontName, 'bold')
  doc.text('Người đại diện HKD/Cá nhân KD', pageWidth - 50, finalY + 20, { align: 'center' })
  doc.setFont(fontName, 'normal')
  doc.text('(Ký, họ tên, đóng dấu)', pageWidth - 50, finalY + 26, { align: 'center' })

  doc.save(`so-tien-gui-ngan-hang-${accountNumber}-${period.from}-${period.to}.pdf`)
}

/**
 * 4. Expense Book (So Chi Phi)
 * Exports expenses by category
 */
export function exportExpenseBookPDF(
  data: ExpenseBookReport,
  storeInfo: StoreInfo
): void {
  const { entries, byCategory, totals, period } = data

  // Main expense entries
  const headers = [
    'STT',
    'Ngày',
    'Loai',
    'Dien giai',
    'So tien',
    'VAT',
    'Thanh toan',
    'So HD',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.date,
    entry.category,
    entry.description,
    entry.amount,
    entry.vat_amount,
    entry.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyen khoan',
    entry.invoice_no || '-',
  ])

  const totalsRow = [
    '',
    '',
    '',
    'TONG CONG',
    totals.total_amount,
    totals.total_vat,
    `${totals.expense_count} muc`,
    '',
  ]

  // Export with multi-section if there's category breakdown
  if (byCategory && byCategory.length > 0) {
    const categoryHeaders = ['Loai chi phi', 'So tien']
    const categoryData = byCategory.map((cat) => [cat.category, cat.amount])
    const categoryTotals = ['TONG', totals.total_amount]

    exportMultiSectionPDF({
      filename: `so-chi-phi-${period.from}-${period.to}`,
      title: 'SO CHI PHI',
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
      storeTaxCode: storeInfo.taxCode,
      period: `${period.from} - ${period.to}`,
      orientation: 'landscape',
      sections: [
        {
          title: 'Chi tiet chi phi',
          headers,
          data: tableData,
          totals: totalsRow,
          columnAligns: ['center', 'center', 'left', 'left', 'right', 'right', 'center', 'left'],
        },
        {
          title: 'Tong hop theo loai',
          headers: categoryHeaders,
          data: categoryData,
          totals: categoryTotals,
          columnAligns: ['left', 'right'],
        },
      ],
    })
  } else {
    exportToPDF({
      filename: `so-chi-phi-${period.from}-${period.to}`,
      title: 'SO CHI PHI',
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
      storeTaxCode: storeInfo.taxCode,
      period: `${period.from} - ${period.to}`,
      headers,
      data: tableData,
      totals: totalsRow,
      orientation: 'landscape',
      columnAligns: ['center', 'center', 'left', 'left', 'right', 'right', 'center', 'left'],
    })
  }
}

/**
 * 5. Inventory Book (So Ton Kho)
 * Exports inventory movements with before/after quantities
 */
export function exportInventoryBookPDF(
  data: InventoryBookReport,
  storeInfo: StoreInfo
): void {
  const { entries, summary, period } = data

  const headers = [
    'STT',
    'Ngày',
    'San pham',
    'Ma SP',
    'Loai',
    'SL',
    'Ton truoc',
    'Ton sau',
    'Ly do',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.date,
    entry.product_name,
    entry.sku,
    entry.movement_type === 'in' ? 'Nhap' : entry.movement_type === 'out' ? 'Xuat' : 'Dieu chinh',
    entry.quantity,
    entry.before_quantity,
    entry.after_quantity,
    entry.reason || '-',
  ])

  const totalsRow = [
    '',
    '',
    '',
    '',
    'TONG CONG',
    `${summary.total_movements} dong`,
    `Nhap: ${summary.total_in}`,
    `Xuat: ${summary.total_out}`,
    '',
  ]

  exportToPDF({
    filename: `so-ton-kho-${period.from}-${period.to}`,
    title: 'SO TON KHO',
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: `${period.from} - ${period.to}`,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'landscape',
    columnAligns: ['center', 'center', 'left', 'left', 'center', 'right', 'right', 'right', 'left'],
  })
}

/**
 * 6. Tax Book (So Nghia Vu Thue)
 * Exports quarterly tax obligations (VAT + PIT)
 */
export function exportTaxBookPDF(
  data: TaxBookReport,
  storeInfo: StoreInfo
): void {
  const { year, quarters, summary } = data

  const headers = [
    'Quy',
    'Ky',
    'Doanh thu',
    'VAT thu',
    'VAT khau tru',
    'VAT phai nop',
    'TNCN phai nop',
    'Tong thue',
    'Trang thai',
  ]

  const tableData = quarters.map((q) => [
    `Q${q.quarter}`,
    `${q.period_start} - ${q.period_end}`,
    q.total_revenue,
    q.vat_collected,
    q.vat_deductible,
    q.vat_payable,
    q.pit_payable,
    q.total_tax,
    q.status === 'completed' ? 'Da nop' :
      q.status === 'pending' ? 'Cho nop' :
        q.status === 'in_progress' ? 'Dang xu ly' : 'Chua bat dau',
  ])

  const totalsRow = [
    '',
    'TONG NAM',
    summary.total_revenue,
    summary.total_vat,
    '-',
    '-',
    summary.total_pit,
    summary.total_tax,
    '',
  ]

  exportToPDF({
    filename: `so-nghia-vu-thue-${year}`,
    title: `SO NGHIA VU THUE NAM ${year}`,
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: `Nam ${year}`,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'landscape',
    columnAligns: ['center', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'center'],
  })
}

/**
 * 7. Salary Book (So Luong)
 * Exports monthly payroll with deductions
 */
export function exportSalaryBookPDF(
  data: SalaryBookReport,
  storeInfo: StoreInfo
): void {
  const { period, entries, totals } = data

  const headers = [
    'STT',
    'Ho ten',
    'Chuc vu',
    'Ngày cong',
    'Luong co ban',
    'Phu cap',
    'Tong luong',
    'BHXH',
    'BHYT',
    'BHTN',
    'TNCN',
    'Thuc linh',
    'Trang thai',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.name,
    entry.position,
    entry.working_days,
    entry.base_salary,
    entry.allowances,
    entry.gross_salary,
    entry.social_insurance,
    entry.health_insurance,
    entry.unemployment_insurance,
    entry.pit,
    entry.net_salary,
    entry.status === 'paid' ? 'Da tra' :
      entry.status === 'approved' ? 'Da duyet' : 'Cho duyet',
  ])

  const totalsRow = [
    '',
    'TONG CONG',
    `${totals.employee_count} NV`,
    '',
    totals.total_base_salary,
    totals.total_allowances,
    totals.total_gross,
    totals.total_insurance,
    '-',
    '-',
    totals.total_pit,
    totals.total_net,
    '',
  ]

  exportToPDF({
    filename: `so-luong-${period.replace('/', '-')}`,
    title: 'SO LUONG NHAN VIEN',
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: period,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'landscape',
    columnAligns: [
      'center', 'left', 'left', 'center',
      'right', 'right', 'right',
      'right', 'right', 'right', 'right',
      'right', 'center',
    ],
  })
}

/**
 * Generic export function that handles all report types
 */
export function exportReportPDF(
  reportType: string,
  data: unknown,
  storeInfo: StoreInfo
): void {
  switch (reportType) {
    case 'revenue':
      exportRevenueBookPDF(data as RevenueBookReport, storeInfo)
      break
    case 'cash':
      exportCashBookPDF(data as CashBookReport, storeInfo)
      break
    case 'bank':
      exportBankBookPDF(data as BankBookReport, storeInfo)
      break
    case 'expense':
      exportExpenseBookPDF(data as ExpenseBookReport, storeInfo)
      break
    case 'inventory':
      exportInventoryBookPDF(data as InventoryBookReport, storeInfo)
      break
    case 'tax':
      exportTaxBookPDF(data as TaxBookReport, storeInfo)
      break
    case 'salary':
      exportSalaryBookPDF(data as SalaryBookReport, storeInfo)
      break
    default:
      console.warn(`Unknown report type: ${reportType}`)
  }
}
