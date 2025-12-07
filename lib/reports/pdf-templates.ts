import {
  exportToPDF,
  exportMultiSectionPDF,
  formatPDFCurrency,
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
    'Ngay',
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
    'Ngay',
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
 * 3. Bank Book (So Tien Gui Ngan Hang)
 * Exports bank transactions across all accounts
 */
export function exportBankBookPDF(
  data: BankBookReport,
  storeInfo: StoreInfo
): void {
  const { entries, totals, period } = data

  const headers = [
    'STT',
    'Ngay',
    'Ngan hang',
    'So TK',
    'Dien giai',
    'Thu (No)',
    'Chi (Co)',
    'Ma GD',
  ]

  const tableData = entries.map((entry) => [
    entry.stt,
    entry.date,
    entry.bank_name,
    entry.account_number,
    entry.description,
    entry.debit,
    entry.credit,
    entry.bank_ref || '-',
  ])

  const totalsRow = [
    '',
    '',
    '',
    '',
    'TONG CONG',
    totals.total_debit,
    totals.total_credit,
    '',
  ]

  exportToPDF({
    filename: `so-tien-gui-ngan-hang-${period.from}-${period.to}`,
    title: 'SO TIEN GUI NGAN HANG',
    storeName: storeInfo.name,
    storeAddress: storeInfo.address,
    storeTaxCode: storeInfo.taxCode,
    period: `${period.from} - ${period.to}`,
    headers,
    data: tableData,
    totals: totalsRow,
    orientation: 'landscape',
    columnAligns: ['center', 'center', 'left', 'left', 'left', 'right', 'right', 'left'],
  })
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
    'Ngay',
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
    entry.payment_method === 'cash' ? 'Tien mat' : 'Chuyen khoan',
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
    'Ngay',
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
    'Ngay cong',
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
