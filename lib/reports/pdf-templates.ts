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
 * 1. Revenue Book (So Doanh Thu)
 * Exports sales/revenue report with invoice details
 */
export function exportRevenueBookPDF(
  data: RevenueBookReport,
  storeInfo: StoreInfo
): void {
  const { entries, totals, period } = data

  const headers = [
    'STT',
    'Ngày',
    'So HD',
    'Khach hang',
    'Gia truoc thue',
    'VAT',
    'Tong tien',
    'Thanh toan',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.date,
    entry.invoice_no,
    entry.customer_name || 'Khach le',
    entry.subtotal,
    entry.vat_amount,
    entry.total,
    entry.payment_method,
  ])

  const totalsRow = [
    '',
    '',
    '',
    'TONG CONG',
    totals.total_subtotal,
    totals.total_vat,
    totals.total_revenue,
    `${totals.sale_count} HD`,
  ]

  exportToPDF({
    filename: `so-doanh-thu-${period.from}-${period.to}`,
    title: 'SO DOANH THU',
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: `${period.from} - ${period.to}`,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'landscape',
    columnAligns: ['center', 'center', 'left', 'left', 'right', 'right', 'right', 'center'],
  })
}

/**
 * 2. Cash Book (So Tien Mat)
 * Exports cash inflow/outflow with running balance
 */
export function exportCashBookPDF(
  data: CashBookReport,
  storeInfo: StoreInfo
): void {
  const { entries, totals, period } = data

  const headers = [
    'STT',
    'Ngày',
    'Dien giai',
    'Thu (No)',
    'Chi (Co)',
    'Ton',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.date,
    entry.description,
    entry.debit,
    entry.credit,
    entry.balance,
  ])

  const totalsRow = [
    '',
    '',
    'TONG CONG',
    totals.total_debit,
    totals.total_credit,
    totals.closing_balance,
  ]

  exportToPDF({
    filename: `so-tien-mat-${period.from}-${period.to}`,
    title: 'SO TIEN MAT',
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: `${period.from} - ${period.to}`,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'portrait',
    columnAligns: ['center', 'center', 'left', 'right', 'right', 'right'],
  })
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
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 14
  let yPos = 15

  doc.setFontSize(12)
  doc.setFont(fontName, 'bold')
  doc.text(storeInfo.name, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  if (storeInfo.address) {
    doc.setFontSize(10)
    doc.setFont(fontName, 'normal')
    doc.text(storeInfo.address, pageWidth / 2, yPos, { align: 'center' })
    yPos += 4
  }

  yPos += 5
  doc.setFontSize(14)
  doc.setFont(fontName, 'bold')
  doc.text('SỔ TIỀN GỬI NGÂN HÀNG', pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  doc.text(`Nơi mở tài khoản giao dịch: ${bankName}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  doc.text(`Số hiệu tài khoản tại nơi gửi: ${accountNumber}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  
  doc.setFontSize(9)
  doc.text(`Kỳ: ${period.from} - ${period.to}`, pageWidth - marginLeft, yPos, { align: 'right' })
  doc.text('ĐVT: Đồng', pageWidth - marginLeft, yPos + 4, { align: 'right' })
  yPos += 8

  const openingRow = ['', '', '', '- Số dư đầu kỳ', '', '', formatPDFCurrency(opening_balance), '']

  const tableData = entries.map((entry) => [
    entry.record_date || '',
    entry.voucher_no || '',
    entry.voucher_date || '',
    entry.description || '',
    entry.debit > 0 ? formatPDFCurrency(entry.debit) : '',
    entry.credit > 0 ? formatPDFCurrency(entry.credit) : '',
    formatPDFCurrency(entry.balance),
    entry.note || '',
  ])

  const summaryRow = ['', '', '', '- Cộng số phát sinh trong kỳ', formatPDFCurrency(totals.total_debit), formatPDFCurrency(totals.total_credit), '', '']
  const closingRow = ['', '', '', '- Số dư cuối kỳ', 'x', 'x', formatPDFCurrency(totals.closing_balance), 'x']

  const allData = [openingRow, ...tableData, summaryRow, closingRow]

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        { content: 'GHI SỔ', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'CHỨNG TỪ', colSpan: 2, styles: { halign: 'center' } },
        { content: 'DIỄN GIẢI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'SỐ TIỀN', colSpan: 3, styles: { halign: 'center' } },
        { content: 'CHÚ', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: 'SỐ HIỆU', styles: { halign: 'center' } },
        { content: 'NGÀY, THÁNG', styles: { halign: 'center' } },
        { content: 'THU\n(GỬI VÀO)', styles: { halign: 'center' } },
        { content: 'CHI\n(RÚT RA)', styles: { halign: 'center' } },
        { content: 'CÒN LẠI', styles: { halign: 'center' } },
      ],
      [
        { content: 'A', styles: { halign: 'center' } },
        { content: 'B', styles: { halign: 'center' } },
        { content: 'C', styles: { halign: 'center' } },
        { content: 'D', styles: { halign: 'center' } },
        { content: '1', styles: { halign: 'center' } },
        { content: '2', styles: { halign: 'center' } },
        { content: '3', styles: { halign: 'center' } },
        { content: 'F', styles: { halign: 'center' } },
      ],
    ],
    body: allData,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 22 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'left', cellWidth: 'auto' },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 28 },
      7: { halign: 'left', cellWidth: 22 },
    },
    margin: { left: marginLeft, right: marginLeft },
    didDrawPage: () => {
      doc.setFontSize(8)
      doc.setFont(fontName, 'normal')
      doc.text('Mẫu số S7-HKD', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
    },
  })

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 50
  
  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  doc.text('Người lập biểu', marginLeft + 30, finalY + 15, { align: 'center' })
  doc.setFontSize(8)
  doc.text('(Ký, họ tên)', marginLeft + 30, finalY + 20, { align: 'center' })

  doc.setFontSize(10)
  doc.text('Ngày ... tháng ... năm ...', pageWidth - marginLeft - 50, finalY + 10, { align: 'center' })
  doc.text('Người đại diện HKD/Cá nhân KD', pageWidth - marginLeft - 50, finalY + 15, { align: 'center' })
  doc.setFontSize(8)
  doc.text('(Ký, họ tên, đóng dấu)', pageWidth - marginLeft - 50, finalY + 20, { align: 'center' })

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
