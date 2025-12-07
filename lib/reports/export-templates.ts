import {
  exportToExcel,
  formatCurrencyForExcel,
  formatDateForExcel,
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
 * Export Revenue Book (So Doanh Thu) to Excel
 */
export function exportRevenueBook(
  data: RevenueBookReport,
  storeName: string,
  period: string
): void {
  const headers = [
    'STT',
    'Ngay',
    'So HD',
    'Khach hang',
    'DT chua VAT',
    'VAT',
    'Tong',
    'Hinh thuc TT',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    formatDateForExcel(entry.date),
    entry.invoice_no,
    entry.customer_name || '',
    formatCurrencyForExcel(entry.subtotal),
    formatCurrencyForExcel(entry.vat_amount),
    formatCurrencyForExcel(entry.total),
    translatePaymentMethod(entry.payment_method),
  ])

  const totals = [
    'TONG CONG',
    '',
    '',
    `${data.totals.sale_count} hoa don`,
    formatCurrencyForExcel(data.totals.total_subtotal),
    formatCurrencyForExcel(data.totals.total_vat),
    formatCurrencyForExcel(data.totals.total_revenue),
    '',
  ]

  exportToExcel({
    filename: `So_Doanh_Thu_${period.replace(/\//g, '-')}`,
    sheetName: 'So Doanh Thu',
    title: 'SO DOANH THU BAN HANG',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 12, 15, 25, 15, 12, 15, 15],
  })
}

/**
 * Export Cash Book (So Tien Mat) to Excel
 */
export function exportCashBook(
  data: CashBookReport,
  storeName: string,
  period: string
): void {
  const headers = [
    'STT',
    'Ngay',
    'Dien giai',
    'Thu',
    'Chi',
    'Ton quy',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    formatDateForExcel(entry.date),
    entry.description,
    entry.debit > 0 ? formatCurrencyForExcel(entry.debit) : '',
    entry.credit > 0 ? formatCurrencyForExcel(entry.credit) : '',
    formatCurrencyForExcel(entry.balance),
  ])

  const totals = [
    'TONG CONG',
    '',
    '',
    formatCurrencyForExcel(data.totals.total_debit),
    formatCurrencyForExcel(data.totals.total_credit),
    formatCurrencyForExcel(data.totals.closing_balance),
  ]

  exportToExcel({
    filename: `So_Tien_Mat_${period.replace(/\//g, '-')}`,
    sheetName: 'So Tien Mat',
    title: 'SO TIEN MAT',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 12, 35, 15, 15, 15],
  })
}

/**
 * Export Bank Book (So Tien Gui Ngan Hang) to Excel
 */
export function exportBankBook(
  data: BankBookReport,
  storeName: string,
  period: string
): void {
  const headers = [
    'STT',
    'Ngay',
    'Ngan hang',
    'So TK',
    'Dien giai',
    'Thu',
    'Chi',
    'So tham chieu',
  ]

  const rows = data.entries.map(entry => [
    entry.stt,
    formatDateForExcel(entry.date),
    entry.bank_name,
    entry.account_number,
    entry.description,
    entry.debit > 0 ? formatCurrencyForExcel(entry.debit) : '',
    entry.credit > 0 ? formatCurrencyForExcel(entry.credit) : '',
    entry.bank_ref || '',
  ])

  const totals = [
    'TONG CONG',
    '',
    '',
    '',
    '',
    formatCurrencyForExcel(data.totals.total_debit),
    formatCurrencyForExcel(data.totals.total_credit),
    '',
  ]

  exportToExcel({
    filename: `So_Tien_Gui_NH_${period.replace(/\//g, '-')}`,
    sheetName: 'So Tien Gui NH',
    title: 'SO TIEN GUI NGAN HANG',
    storeName,
    period,
    headers,
    data: rows,
    totals,
    columnWidths: [6, 12, 20, 18, 30, 15, 15, 18],
  })
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
    'Ngay',
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
    'Ngay',
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
    'Ngay cong',
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
    cash: 'Tien mat',
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
