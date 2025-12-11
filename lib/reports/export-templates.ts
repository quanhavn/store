import {
  exportToExcel,
  formatCurrencyForExcel,
  formatDateForExcel,
  formatShortDateForExcel,
} from './export-excel'
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
 * Export Revenue Book (Sổ Chi Tiết Doanh Thu Bán Hàng - Mẫu S1-HKD) to Excel
 * Following Vietnamese Tax 2026 format with 4 revenue categories
 */
export function exportRevenueBook(
  data: RevenueBookReport,
  storeName: string,
  period: string
): void {
  const XLSX = require('xlsx')

  const year = data.year || new Date().getFullYear()
  const entries = data.entries || []
  const totals = data.totals || { goods_distribution: 0, service_construction: 0, manufacturing_transport: 0, other_business: 0, total_revenue: 0 }
  const tax_payable = data.tax_payable || { total_vat: 0, total_pit: 0 }

  const workbook = XLSX.utils.book_new()
  const rows: (string | number | null | undefined)[][] = []

  rows.push([`HỘ, CÁ NHÂN KINH DOANH: ${storeName}`])
  rows.push([`Địa chỉ: `])
  rows.push([])
  rows.push(['SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ'])
  rows.push([`Tên địa điểm kinh doanh: `])
  rows.push([`Năm: ${year}`])
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Đơn vị tính: Ngàn đồng'])

  const headerRow1Start = rows.length
  rows.push([
    'NGÀY, THÁNG\nGHI SỔ',
    'CHỨNG TỪ', '',
    'DIỄN GIẢI',
    'DOANH THU BÁN HÀNG HÓA, DỊCH VỤ CHIA THEO DANH MỤC NGÀNH NGHỀ', '', '', '', '', '', '', '', '', '', '',
    'GHI CHÚ'
  ])
  rows.push([
    '',
    'SỐ HIỆU', 'NGÀY, THÁNG',
    '',
    'PHÂN PHỐI, CUNG CẤP HÀNG HÓA\n(GTGT: 1%, TNCN: 0,5%)', '', '',
    'DỊCH VỤ, XÂY DỰNG KHÔNG BAO THẦU NVL\n(GTGT: 5%; TNCN: 2%)', '', '',
    'SẢN XUẤT, VẬN TẢI, DỊCH VỤ GẮN VỚI HH,\nXD CÓ BAO THẦU NVL\n(GTGT: 3%, TNCN: 1,5%)', '', '',
    'HOẠT ĐỘNG KINH DOANH KHÁC\n(GTGT: 2%; TNCN: 1%)', '',
    ''
  ])
  rows.push(['A', 'B', 'C', 'D', '1', '2', '...', '4', '5', '...', '7', '8', '...', '10', '...', '12'])

  entries.forEach(entry => {
    rows.push([
      entry.record_date ? formatDateForExcel(entry.record_date) : '',
      entry.voucher_no || '',
      entry.voucher_date ? formatDateForExcel(entry.voucher_date) : '',
      entry.description,
      entry.goods_distribution > 0 ? entry.goods_distribution : '',
      '', '',
      entry.service_construction > 0 ? entry.service_construction : '',
      '', '',
      entry.manufacturing_transport > 0 ? entry.manufacturing_transport : '',
      '', '',
      entry.other_business > 0 ? entry.other_business : '',
      '',
      entry.note || '',
    ])
  })

  rows.push([])
  rows.push([
    '', '', '',
    'Tổng cộng',
    totals.goods_distribution > 0 ? totals.goods_distribution : '',
    '', '',
    totals.service_construction > 0 ? totals.service_construction : '',
    '', '',
    totals.manufacturing_transport > 0 ? totals.manufacturing_transport : '',
    '', '',
    totals.other_business > 0 ? totals.other_business : '',
    '', ''
  ])

  rows.push([`- Sổ này có ... trang, đánh số từ trang 01 đến trang ...`])
  rows.push([`- Ngày mở sổ: ..`])

  rows.push([])
  rows.push([
    '', '', 'Tiền thuế phải nộp', '', '', '', '', '', '', '',
    '', `           Ngày … tháng … năm …`
  ])
  rows.push([
    '', '', `- Thuế GTGT: ${formatCurrencyForExcel(tax_payable.total_vat)}`, '', '', '', '', '', '', '',
    '', 'Người đại diện HKD/Cá nhân KD'
  ])
  rows.push([
    '', '', `- Thuế TNCN: ${formatCurrencyForExcel(tax_payable.total_pit)}`, '', '', '', '', '', '', '',
    '', '(Ký, họ tên, đóng dấu)'
  ])

  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 15 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 15 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 15 } },
    { s: { r: headerRow1Start, c: 0 }, e: { r: headerRow1Start + 1, c: 0 } },
    { s: { r: headerRow1Start, c: 1 }, e: { r: headerRow1Start, c: 2 } },
    { s: { r: headerRow1Start, c: 3 }, e: { r: headerRow1Start + 1, c: 3 } },
    { s: { r: headerRow1Start, c: 4 }, e: { r: headerRow1Start, c: 14 } },
    { s: { r: headerRow1Start + 1, c: 4 }, e: { r: headerRow1Start + 1, c: 6 } },
    { s: { r: headerRow1Start + 1, c: 7 }, e: { r: headerRow1Start + 1, c: 9 } },
    { s: { r: headerRow1Start + 1, c: 10 }, e: { r: headerRow1Start + 1, c: 12 } },
    { s: { r: headerRow1Start + 1, c: 13 }, e: { r: headerRow1Start + 1, c: 14 } },
    { s: { r: headerRow1Start, c: 15 }, e: { r: headerRow1Start + 1, c: 15 } },
  ]

  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 8 },
    { wch: 6 },
    { wch: 12 },
    { wch: 8 },
    { wch: 6 },
    { wch: 12 },
    { wch: 8 },
    { wch: 6 },
    { wch: 12 },
    { wch: 6 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu số S1-HKD')

  const filename = `So_Chi_Tiet_Doanh_Thu_${year}_${period.replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/**
 * Export Cash Book (Sổ Quỹ Tiền Mặt - Mẫu S6-HKD) to Excel
 * Following Vietnamese Tax 2026 format with 3-row header structure
 */
export function exportCashBook(
  data: CashBookReport,
  storeName: string,
  period: string
): void {
  const XLSX = require('xlsx')

  const workbook = XLSX.utils.book_new()
  const rows: (string | number | null | undefined)[][] = []

  rows.push([`HỘ, CÁ NHÂN KINH DOANH: ${storeName}`])
  rows.push([`Địa chỉ: `])
  rows.push([])
  rows.push([])
  rows.push(['SỔ QUỸ TIỀN MẶT'])
  rows.push(['Loại quỹ: Tiền mặt'])
  rows.push(['', '', '', '', '', '', '', '', 'ĐVT: Đồng'])
  rows.push([])

  const headerRow1Start = rows.length
  rows.push([
    'GHI SỔ',
    'CHỨNG TỪ', '',
    'DIỄN GIẢI',
    'SỐ TIỀN', '', '',
    'GHI CHÚ'
  ])
  rows.push([
    '', 'SỐ HIỆU', 'NGÀY, THÁNG', '', 'THU', 'CHI', 'TỒN', ''
  ])
  rows.push(['A', 'B', 'C', 'D', '1', '2', '3', 'E'])

  rows.push(['', '', '', '- Số dư đầu kỳ', '', '', formatCurrencyForExcel(data.opening_balance || 0), ''])
  rows.push(['', '', '', '- Số phát sinh trong kỳ', '', '', '', ''])

  data.entries.forEach(entry => {
    const voucherNo = entry.voucher_no_in || entry.voucher_no_out || ''
    rows.push([
      entry.record_date ? formatShortDateForExcel(entry.record_date) : '',
      voucherNo,
      entry.voucher_date ? formatShortDateForExcel(entry.voucher_date) : '',
      entry.description,
      entry.debit > 0 ? formatCurrencyForExcel(entry.debit) : '',
      entry.credit > 0 ? formatCurrencyForExcel(entry.credit) : '',
      formatCurrencyForExcel(entry.balance),
      entry.note || '',
    ])
  })

  rows.push(['', '', '', '- Cộng số phát sinh trong kỳ', formatCurrencyForExcel(data.totals.total_debit), formatCurrencyForExcel(data.totals.total_credit), '', ''])
  rows.push(['', '', '', '- Số dư cuối kỳ', '', '', formatCurrencyForExcel(data.totals.closing_balance), ''])

  rows.push([])
  rows.push(['- Sổ này có ... trang, đánh số từ trang 01 đến trang ...'])
  rows.push(['- Ngày mở sổ: ...'])
  rows.push([])
  rows.push([])

  const signatureRow = rows.length
  rows.push(['Người lập biểu', '', '', '', '', 'Ngày ... tháng ... năm ...'])
  rows.push(['(Ký, họ tên)', '', '', '', '', 'Người đại diện HKD/Cá nhân KD'])
  rows.push(['', '', '', '', '', '(Ký, họ tên, đóng dấu)'])

  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
    { s: { r: headerRow1Start, c: 0 }, e: { r: headerRow1Start + 1, c: 0 } },
    { s: { r: headerRow1Start, c: 1 }, e: { r: headerRow1Start, c: 2 } },
    { s: { r: headerRow1Start, c: 3 }, e: { r: headerRow1Start + 1, c: 3 } },
    { s: { r: headerRow1Start, c: 4 }, e: { r: headerRow1Start, c: 6 } },
    { s: { r: headerRow1Start, c: 7 }, e: { r: headerRow1Start + 1, c: 7 } },
    { s: { r: signatureRow, c: 0 }, e: { r: signatureRow, c: 2 } },
    { s: { r: signatureRow, c: 5 }, e: { r: signatureRow, c: 7 } },
    { s: { r: signatureRow + 1, c: 0 }, e: { r: signatureRow + 1, c: 2 } },
    { s: { r: signatureRow + 1, c: 5 }, e: { r: signatureRow + 1, c: 7 } },
    { s: { r: signatureRow + 2, c: 5 }, e: { r: signatureRow + 2, c: 7 } },
  ]

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu số S6-HKD')

  const filename = `So_Quy_Tien_Mat_${period.replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/**
 * Export Bank Book (Sổ Tiền Gửi Ngân Hàng - Mẫu S7-HKD) to Excel
 * Each bank account has its own book with 3-row header structure
 */
export function exportBankBook(
  data: BankBookReport,
  storeName: string,
  period: string
): void {
  const XLSX = require('xlsx')
  
  const bankName = data.bank_account?.bank_name || ''
  const accountNumber = data.bank_account?.account_number || ''

  const workbook = XLSX.utils.book_new()
  const rows: (string | number | null | undefined)[][] = []

  rows.push([`HỘ, CÁ NHÂN KINH DOANH: ${storeName}`])
  rows.push([`Địa chỉ: `])
  rows.push([])
  rows.push([])
  rows.push(['SỔ TIỀN GỬI NGÂN HÀNG'])
  rows.push([`Nơi mở tài khoản giao dịch: ${bankName}`])
  rows.push([`Số hiệu tài khoản tại nơi gửi: ${accountNumber}`])
  rows.push(['', '', '', '', '', '', '', 'ĐVT: Đồng'])
  rows.push([])

  const headerRow1Start = rows.length
  rows.push([
    'GHI SỔ',
    'CHỨNG TỪ', '',
    'DIỄN GIẢI',
    'SỐ TIỀN', '', '',
    'GHI CHÚ'
  ])
  rows.push([
    '', 'SỐ HIỆU', 'NGÀY, THÁNG', '', 'THU\n(GỬI VÀO)', 'CHI\n(RÚT RA)', 'CÒN LẠI', ''
  ])
  rows.push(['A', 'B', 'C', 'D', '1', '2', '3', 'F'])

  rows.push(['', '', '', '- Số dư đầu kỳ', '', '', formatCurrencyForExcel(data.opening_balance), ''])
  rows.push(['', '', '', '- Số phát sinh trong kỳ', '', '', '', ''])

  data.entries.forEach(entry => {
    rows.push([
      entry.record_date ? formatShortDateForExcel(entry.record_date) : '',
      entry.voucher_no || '',
      entry.voucher_date ? formatShortDateForExcel(entry.voucher_date) : '',
      entry.description,
      entry.debit > 0 ? formatCurrencyForExcel(entry.debit) : '',
      entry.credit > 0 ? formatCurrencyForExcel(entry.credit) : '',
      formatCurrencyForExcel(entry.balance),
      entry.note || '',
    ])
  })

  rows.push(['', '', '', '- Cộng số phát sinh trong kỳ', formatCurrencyForExcel(data.totals.total_debit), formatCurrencyForExcel(data.totals.total_credit), '', ''])
  rows.push(['', '', '', '- Số dư cuối kỳ', '', '', formatCurrencyForExcel(data.totals.closing_balance), ''])

  rows.push([])
  rows.push(['- Sổ này có ... trang, đánh số từ trang 01 đến trang ...'])
  rows.push(['- Ngày mở sổ: ...'])
  rows.push([])
  rows.push([])

  const signatureRow = rows.length
  rows.push(['Người lập biểu', '', '', '', '', 'Ngày ... tháng ... năm ...'])
  rows.push(['(Ký, họ tên)', '', '', '', '', 'Người đại diện HKD/Cá nhân KD'])
  rows.push(['', '', '', '', '', '(Ký, họ tên, đóng dấu)'])

  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } },
    { s: { r: headerRow1Start, c: 0 }, e: { r: headerRow1Start + 1, c: 0 } },
    { s: { r: headerRow1Start, c: 1 }, e: { r: headerRow1Start, c: 2 } },
    { s: { r: headerRow1Start, c: 3 }, e: { r: headerRow1Start + 1, c: 3 } },
    { s: { r: headerRow1Start, c: 4 }, e: { r: headerRow1Start, c: 6 } },
    { s: { r: headerRow1Start, c: 7 }, e: { r: headerRow1Start + 1, c: 7 } },
    { s: { r: signatureRow, c: 0 }, e: { r: signatureRow, c: 2 } },
    { s: { r: signatureRow, c: 5 }, e: { r: signatureRow, c: 7 } },
    { s: { r: signatureRow + 1, c: 0 }, e: { r: signatureRow + 1, c: 2 } },
    { s: { r: signatureRow + 1, c: 5 }, e: { r: signatureRow + 1, c: 7 } },
    { s: { r: signatureRow + 2, c: 5 }, e: { r: signatureRow + 2, c: 7 } },
  ]

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu số S7-HKD')

  const filename = `So_Tien_Gui_NH_${accountNumber}_${period.replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/**
 * Export Expense Book (So Chi Phi) to Excel
 */
export function exportExpenseBook(
  data: ExpenseBookReport,
  storeName: string,
  period: string
): void {
  const headers = [
    'STT',
    'Ngày',
    'Loai chi phi',
    'Dien giai',
    'So tien',
    'VAT',
    'Hinh thuc TT',
    'So HD',
    'Nha cung cap',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    formatDateForExcel(entry.date),
    entry.category,
    entry.description,
    formatCurrencyForExcel(entry.amount),
    formatCurrencyForExcel(entry.vat_amount),
    translatePaymentMethod(entry.payment_method),
    entry.invoice_no || '',
    entry.supplier_name || '',
  ])

  const totals = [
    'TONG CONG',
    '',
    '',
    `${data.totals.expense_count} khoan chi`,
    formatCurrencyForExcel(data.totals.total_amount),
    formatCurrencyForExcel(data.totals.total_vat),
    '',
    '',
    '',
  ]

  exportToExcel({
    filename: `So_Chi_Phi_${period.replace(/\//g, '-')}`,
    sheetName: 'So Chi Phi',
    title: 'SO CHI PHI',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 12, 18, 30, 15, 12, 15, 15, 25],
  })
}

/**
 * Export Inventory Book (So Ton Kho) to Excel
 */
export function exportInventoryBook(
  data: InventoryBookReport,
  storeName: string,
  period: string
): void {
  const headers = [
    'STT',
    'Ngày',
    'San pham',
    'Ma SP',
    'Loai',
    'So luong',
    'Ton truoc',
    'Ton sau',
    'Ly do',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    formatDateForExcel(entry.date),
    entry.product_name,
    entry.sku,
    translateMovementType(entry.movement_type),
    entry.quantity,
    entry.before_quantity,
    entry.after_quantity,
    entry.reason || '',
  ])

  const totals = [
    'TONG CONG',
    '',
    '',
    '',
    `${data.summary.total_movements} bien dong`,
    '',
    `Nhap: ${data.summary.total_in}`,
    `Xuat: ${data.summary.total_out}`,
    '',
  ]

  exportToExcel({
    filename: `So_Ton_Kho_${period.replace(/\//g, '-')}`,
    sheetName: 'So Ton Kho',
    title: 'SO XUAT NHAP TON KHO',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 12, 30, 12, 10, 10, 10, 10, 25],
  })
}

/**
 * Export Tax Book (So Nghia Vu Thue) to Excel
 */
export function exportTaxBook(
  data: TaxBookReport,
  storeName: string,
  year: number
): void {
  const headers = [
    'Quy',
    'Tu ngay',
    'Den ngay',
    'Doanh thu',
    'VAT thu',
    'VAT duoc khau tru',
    'VAT phai nop',
    'TNCN phai nop',
    'Tong thue',
    'Trang thai',
  ]

  const rows = data.quarters.map(quarter => [
    `Quy ${quarter.quarter}`,
    formatDateForExcel(quarter.period_start),
    formatDateForExcel(quarter.period_end),
    formatCurrencyForExcel(quarter.total_revenue),
    formatCurrencyForExcel(quarter.vat_collected),
    formatCurrencyForExcel(quarter.vat_deductible),
    formatCurrencyForExcel(quarter.vat_payable),
    formatCurrencyForExcel(quarter.pit_payable),
    formatCurrencyForExcel(quarter.total_tax),
    translateTaxStatus(quarter.status),
  ])

  const totals = [
    `NAM ${year}`,
    '',
    '',
    formatCurrencyForExcel(data.summary.total_revenue),
    '',
    '',
    formatCurrencyForExcel(data.summary.total_vat),
    formatCurrencyForExcel(data.summary.total_pit),
    formatCurrencyForExcel(data.summary.total_tax),
    '',
  ]

  exportToExcel({
    filename: `So_Nghia_Vu_Thue_${year}`,
    sheetName: 'So Nghia Vu Thue',
    title: 'SO THEO DOI NGHIA VU THUE',
    storeName,
    period: `Nam ${year}`,
    headers,
    data: rows,
    totals,
    columnWidths: [8, 12, 12, 15, 15, 18, 15, 15, 15, 12],
  })
}

/**
 * Export Salary Book (So Luong) to Excel
 */
export function exportSalaryBook(
  data: SalaryBookReport,
  storeName: string,
  period: string
): void {
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
    'Thuc nhan',
    'Trang thai',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    entry.name,
    entry.position,
    entry.working_days,
    formatCurrencyForExcel(entry.base_salary),
    formatCurrencyForExcel(entry.allowances),
    formatCurrencyForExcel(entry.gross_salary),
    formatCurrencyForExcel(entry.social_insurance),
    formatCurrencyForExcel(entry.health_insurance),
    formatCurrencyForExcel(entry.unemployment_insurance),
    formatCurrencyForExcel(entry.pit),
    formatCurrencyForExcel(entry.net_salary),
    translateSalaryStatus(entry.status),
  ])

  const totals = [
    'TONG CONG',
    `${data.totals.employee_count} nhan vien`,
    '',
    '',
    formatCurrencyForExcel(data.totals.total_base_salary),
    formatCurrencyForExcel(data.totals.total_allowances),
    formatCurrencyForExcel(data.totals.total_gross),
    '',
    '',
    formatCurrencyForExcel(data.totals.total_insurance),
    formatCurrencyForExcel(data.totals.total_pit),
    formatCurrencyForExcel(data.totals.total_net),
    '',
  ]

  exportToExcel({
    filename: `So_Luong_${period.replace(/\//g, '-')}`,
    sheetName: 'So Luong',
    title: 'BANG LUONG NHAN VIEN',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 20, 15, 10, 14, 12, 14, 12, 12, 12, 12, 14, 12],
  })
}

// Helper functions for translation

function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyen khoan',
    momo: 'MoMo',
    zalopay: 'ZaloPay',
    vnpay: 'VNPay',
  }
  return translations[method] || method
}

function translateMovementType(type: string): string {
  const translations: Record<string, string> = {
    in: 'Nhap',
    out: 'Xuat',
    adjustment: 'Dieu chinh',
    sale: 'Ban hang',
    purchase: 'Nhap hang',
    return: 'Tra hang',
  }
  return translations[type] || type
}

function translateTaxStatus(status: string): string {
  const translations: Record<string, string> = {
    not_started: 'Chua bat dau',
    in_progress: 'Dang xu ly',
    completed: 'Hoan thanh',
    pending: 'Cho xu ly',
  }
  return translations[status] || status
}

function translateSalaryStatus(status: string): string {
  const translations: Record<string, string> = {
    calculated: 'Da tinh',
    approved: 'Da duyet',
    paid: 'Da tra',
  }
  return translations[status] || status
}
