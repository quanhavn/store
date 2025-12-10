/**
 * ESC/POS Thermal Printer Commands
 *
 * This module provides helper functions to generate ESC/POS commands
 * for thermal printers. These commands are used for:
 * - Bluetooth thermal printers (future implementation)
 * - USB/Serial thermal printers
 * - Network thermal printers
 *
 * Common paper widths:
 * - 58mm: ~32 characters per line (monospace)
 * - 80mm: ~48 characters per line (monospace)
 */

// Paper width configurations
export const PAPER_WIDTH = {
  MM_58: 32, // characters per line for 58mm paper
  MM_80: 48, // characters per line for 80mm paper
} as const

export type PaperWidth = keyof typeof PAPER_WIDTH

// ESC/POS Command Constants
export const ESC = 0x1B // Escape
export const GS = 0x1D // Group Separator
export const LF = 0x0A // Line Feed
export const CR = 0x0D // Carriage Return
export const HT = 0x09 // Horizontal Tab

/**
 * ESC/POS Command Builders
 */
export const ESCPOS = {
  // Initialize printer
  INIT: new Uint8Array([ESC, 0x40]),

  // Text alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),

  // Text formatting
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2D, 0x00]),
  DOUBLE_HEIGHT_ON: new Uint8Array([ESC, 0x21, 0x10]),
  DOUBLE_WIDTH_ON: new Uint8Array([ESC, 0x21, 0x20]),
  DOUBLE_SIZE_ON: new Uint8Array([ESC, 0x21, 0x30]),
  NORMAL_SIZE: new Uint8Array([ESC, 0x21, 0x00]),

  // Line spacing
  LINE_SPACING_DEFAULT: new Uint8Array([ESC, 0x32]),
  LINE_SPACING_SET: (n: number) => new Uint8Array([ESC, 0x33, n]),

  // Paper control
  LINE_FEED: new Uint8Array([LF]),
  FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, n]),
  FEED_PAPER: (n: number) => new Uint8Array([ESC, 0x4A, n]),

  // Cut paper
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]),
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  CUT_FEED_FULL: new Uint8Array([GS, 0x56, 0x41, 0x03]),
  CUT_FEED_PARTIAL: new Uint8Array([GS, 0x56, 0x42, 0x03]),

  // Cash drawer
  OPEN_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]),

  // Beep
  BEEP: new Uint8Array([ESC, 0x42, 0x02, 0x02]),

  // Character set for Vietnamese
  CODE_PAGE_UTF8: new Uint8Array([ESC, 0x74, 0x02]),

  // Print mode
  PRINT_AND_FEED: new Uint8Array([ESC, 0x4A, 0x40]),
}

/**
 * Text formatting utilities for thermal printer
 */
export function padRight(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  return text + ' '.repeat(width - text.length)
}

export function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  return ' '.repeat(width - text.length) + text
}

export function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  const padding = Math.floor((width - text.length) / 2)
  const paddingRight = width - text.length - padding
  return ' '.repeat(padding) + text + ' '.repeat(paddingRight)
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'd'
}

export function createLine(char: string, width: number): string {
  return char.repeat(width)
}

export function createDottedLine(width: number): string {
  return '-'.repeat(width)
}

export function createDoubleLine(width: number): string {
  return '='.repeat(width)
}

/**
 * Format a line with left and right aligned text
 */
export function formatRow(
  left: string,
  right: string,
  width: number,
  separator: string = ' '
): string {
  const maxLeftWidth = width - right.length - separator.length
  const leftText = left.length > maxLeftWidth ? left.slice(0, maxLeftWidth) : left
  const paddingWidth = width - leftText.length - right.length
  return leftText + separator.repeat(Math.max(1, paddingWidth)) + right
}

/**
 * Format item line for receipt (name, qty, price)
 */
export function formatItemLine(
  name: string,
  qty: number,
  price: number,
  total: number,
  width: number
): string[] {
  const lines: string[] = []
  const priceStr = formatCurrency(total)
  const qtyStr = `${qty}x${formatCurrency(price)}`

  // First line: product name
  if (name.length > width) {
    // Wrap long product names
    let remaining = name
    while (remaining.length > 0) {
      lines.push(padRight(remaining.slice(0, width), width))
      remaining = remaining.slice(width)
    }
  } else {
    lines.push(padRight(name, width))
  }

  // Second line: qty x price = total (right aligned)
  const detailLine = `  ${qtyStr} = ${priceStr}`
  lines.push(padLeft(detailLine, width))

  return lines
}

/**
 * Build receipt data structure
 */
export interface ReceiptData {
  store: {
    name: string
    address?: string
    phone?: string
    taxCode?: string
  }
  invoice: {
    invoiceNo: string
    dateTime: Date
    cashier?: string
  }
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
    vatRate: number
    discount?: number
  }>
  summary: {
    subtotal: number
    vatBreakdown: Array<{ rate: number; amount: number }>
    discount?: number
    total: number
  }
  payment: {
    method: string
    amount: number
    change?: number
  }
  customer?: {
    name?: string
    phone?: string
    taxCode?: string
  }
  note?: string
  qrCode?: string
}

/**
 * Generate receipt text content for thermal printer
 */
export function generateReceiptText(
  data: ReceiptData,
  paperWidth: PaperWidth = 'MM_58'
): string {
  const width = PAPER_WIDTH[paperWidth]
  const lines: string[] = []

  // Store header
  lines.push(padCenter(data.store.name.toUpperCase(), width))
  if (data.store.address) {
    lines.push(padCenter(data.store.address, width))
  }
  if (data.store.phone) {
    lines.push(padCenter(`DT: ${data.store.phone}`, width))
  }
  if (data.store.taxCode) {
    lines.push(padCenter(`MST: ${data.store.taxCode}`, width))
  }

  lines.push(createDoubleLine(width))
  lines.push(padCenter('HOA DON BAN HANG', width))
  lines.push(createDoubleLine(width))

  // Invoice info
  lines.push(`So HD: ${data.invoice.invoiceNo}`)
  lines.push(`Ngày: ${data.invoice.dateTime.toLocaleDateString('vi-VN')} ${data.invoice.dateTime.toLocaleTimeString('vi-VN')}`)
  if (data.invoice.cashier) {
    lines.push(`Thu ngan: ${data.invoice.cashier}`)
  }

  // Customer info
  if (data.customer?.name) {
    lines.push(`KH: ${data.customer.name}`)
  }
  if (data.customer?.phone) {
    lines.push(`SDT: ${data.customer.phone}`)
  }
  if (data.customer?.taxCode) {
    lines.push(`MST KH: ${data.customer.taxCode}`)
  }

  lines.push(createDottedLine(width))

  // Items header
  lines.push(padRight('San pham', width))
  lines.push(createDottedLine(width))

  // Items
  data.items.forEach((item) => {
    const itemLines = formatItemLine(
      item.name,
      item.quantity,
      item.unitPrice,
      item.total,
      width
    )
    lines.push(...itemLines)
    if (item.discount && item.discount > 0) {
      lines.push(padLeft(`Giam: -${formatCurrency(item.discount)}`, width))
    }
  })

  lines.push(createDottedLine(width))

  // Summary
  lines.push(formatRow('Tam tinh:', formatCurrency(data.summary.subtotal), width))

  // VAT breakdown
  data.summary.vatBreakdown.forEach((vat) => {
    if (vat.amount > 0) {
      lines.push(formatRow(`VAT ${vat.rate}%:`, formatCurrency(vat.amount), width))
    }
  })

  // Discount
  if (data.summary.discount && data.summary.discount > 0) {
    lines.push(formatRow('Giam gia:', `-${formatCurrency(data.summary.discount)}`, width))
  }

  lines.push(createDoubleLine(width))
  lines.push(formatRow('TONG CONG:', formatCurrency(data.summary.total), width))
  lines.push(createDoubleLine(width))

  // Payment
  const paymentMethodLabels: Record<string, string> = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyen khoan',
    momo: 'MoMo',
    zalopay: 'ZaloPay',
    vnpay: 'VNPay',
  }
  lines.push(formatRow('Thanh toan:', paymentMethodLabels[data.payment.method] || data.payment.method, width))
  lines.push(formatRow('Tien nhan:', formatCurrency(data.payment.amount), width))

  if (data.payment.change && data.payment.change > 0) {
    lines.push(formatRow('Tien thua:', formatCurrency(data.payment.change), width))
  }

  lines.push(createDottedLine(width))

  // Note
  if (data.note) {
    lines.push(`Ghi chu: ${data.note}`)
    lines.push(createDottedLine(width))
  }

  // Footer
  lines.push('')
  lines.push(padCenter('Cam on quy khach!', width))
  lines.push(padCenter('Hen gap lai', width))
  lines.push('')

  // QR code placeholder
  if (data.qrCode) {
    lines.push(padCenter('[QR Code]', width))
    lines.push(padCenter('Tra cuu hoa don dien tu', width))
    lines.push(padCenter(data.qrCode, width))
  }

  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

/**
 * Encode text to Uint8Array for ESC/POS printer
 */
export function encodeText(text: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(text)
}

/**
 * Combine multiple Uint8Array commands
 */
export function combineCommands(...commands: Uint8Array[]): Uint8Array {
  const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  commands.forEach((cmd) => {
    result.set(cmd, offset)
    offset += cmd.length
  })

  return result
}

/**
 * Build complete print job with ESC/POS commands
 */
export function buildPrintJob(
  data: ReceiptData,
  paperWidth: PaperWidth = 'MM_58'
): Uint8Array {
  const receiptText = generateReceiptText(data, paperWidth)

  return combineCommands(
    ESCPOS.INIT,
    ESCPOS.CODE_PAGE_UTF8,
    ESCPOS.ALIGN_CENTER,
    ESCPOS.BOLD_ON,
    encodeText(data.store.name.toUpperCase() + '\n'),
    ESCPOS.BOLD_OFF,
    ESCPOS.NORMAL_SIZE,
    encodeText(receiptText),
    ESCPOS.FEED_LINES(3),
    ESCPOS.CUT_FEED_PARTIAL,
    ESCPOS.OPEN_DRAWER
  )
}

/**
 * Bluetooth Printer Connection Interface (Stub for future implementation)
 */
export interface BluetoothPrinter {
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  isConnected: () => boolean
  print: (data: Uint8Array) => Promise<boolean>
  getStatus: () => Promise<PrinterStatus>
}

export interface PrinterStatus {
  connected: boolean
  paperOk: boolean
  coverClosed: boolean
  error?: string
}

/**
 * Stub implementation for Bluetooth printer connection
 * This will be implemented when Web Bluetooth API is integrated
 */
export class BluetoothPrinterStub implements BluetoothPrinter {
  private connected = false

  async connect(): Promise<boolean> {
    // Stub: Will implement Web Bluetooth API connection
    console.log('Bluetooth printer connection not yet implemented')
    return false
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async print(data: Uint8Array): Promise<boolean> {
    // Stub: Will implement actual printing via Web Bluetooth
    console.log('Print job size:', data.length, 'bytes')
    return false
  }

  async getStatus(): Promise<PrinterStatus> {
    return {
      connected: this.connected,
      paperOk: true,
      coverClosed: true,
    }
  }
}

/**
 * Create a Bluetooth printer instance
 */
export function createBluetoothPrinter(): BluetoothPrinter {
  return new BluetoothPrinterStub()
}
