// Excel export utilities
export { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from './export-excel'
export type { ExcelExportOptions } from './export-excel'

// Report-specific export templates (Excel)
export {
  exportRevenueBook,
  exportCashBook,
  exportBankBook,
  exportExpenseBook,
  exportInventoryBook,
  exportTaxBook,
  exportSalaryBook,
} from './export-templates'

// PDF export utilities
export {
  exportToPDF,
  exportMultiSectionPDF,
  normalizeVietnamese,
  formatPDFCurrency,
} from './export-pdf'
export type { PDFExportOptions, PDFMultiSectionOptions } from './export-pdf'

// Report-specific PDF export templates
export {
  exportRevenueBookPDF,
  exportCashBookPDF,
  exportBankBookPDF,
  exportExpenseBookPDF,
  exportInventoryBookPDF,
  exportTaxBookPDF,
  exportSalaryBookPDF,
  exportReportPDF,
} from './pdf-templates'

// Per-product inventory detail book (Vietnamese accounting standard)
export {
  exportInventoryDetailBookExcel,
  exportInventoryDetailBookPDF,
} from './inventory-book-detail'
export type {
  InventoryDetailEntry,
  InventoryDetailProduct,
  InventoryDetailBookReport,
} from './inventory-book-detail'

// Vietnamese font utilities for PDF
export { loadVietnameseFonts, addVietnameseFonts, areFontsLoaded } from './pdf-fonts'
