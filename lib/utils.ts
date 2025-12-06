import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyShort(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  return phone
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.slice(2)
  } else if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3)
  }
  return cleaned
}

export function validateVietnamesePhone(phone: string): boolean {
  const cleaned = normalizePhone(phone)
  return /^0(3|5|7|8|9)\d{8}$/.test(cleaned)
}

export function validateTaxCode(taxCode: string): boolean {
  const cleaned = taxCode.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 13
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateInvoiceNo(prefix: string = 'HD'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${year}${month}${random}`
}

export function calculateVAT(amount: number, vatRate: number = 8): { 
  subtotal: number
  vatAmount: number
  total: number
} {
  const subtotal = Math.round(amount / (1 + vatRate / 100))
  const vatAmount = amount - subtotal
  return { subtotal, vatAmount, total: amount }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
