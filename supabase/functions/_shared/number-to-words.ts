/**
 * Vietnamese Number to Words Converter
 *
 * Converts numeric amounts to Vietnamese words for e-invoice compliance.
 * Handles VND format (integers only, no decimals).
 */

const DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
]

const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

/**
 * Converts a number (0-999) to Vietnamese words.
 *
 * @param num - Number between 0 and 999
 * @param hasLeadingGroup - Whether there's a non-zero group before this one
 * @returns Vietnamese words for the number
 */
function readThreeDigits(num: number, hasLeadingGroup: boolean): string {
  if (num === 0) return ''

  const hundreds = Math.floor(num / 100)
  const tens = Math.floor((num % 100) / 10)
  const ones = num % 10

  const parts: string[] = []

  if (hundreds > 0) {
    parts.push(`${DIGITS[hundreds]} trăm`)
  } else if (hasLeadingGroup && (tens > 0 || ones > 0)) {
    parts.push('không trăm')
  }

  if (tens === 0 && ones > 0 && (hundreds > 0 || hasLeadingGroup)) {
    parts.push('lẻ')
    parts.push(DIGITS[ones])
  } else if (tens === 1) {
    parts.push('mười')
    if (ones === 1) {
      parts.push('một')
    } else if (ones === 5) {
      parts.push('lăm')
    } else if (ones > 0) {
      parts.push(DIGITS[ones])
    }
  } else if (tens > 1) {
    parts.push(`${DIGITS[tens]} mươi`)
    if (ones === 1) {
      parts.push('mốt')
    } else if (ones === 4) {
      parts.push('tư')
    } else if (ones === 5) {
      parts.push('lăm')
    } else if (ones > 0) {
      parts.push(DIGITS[ones])
    }
  }

  return parts.join(' ')
}

/**
 * Converts a number to Vietnamese words with VND currency suffix.
 *
 * @param amount - The amount in VND (integer)
 * @returns Vietnamese words representation
 *
 * @example
 * numberToVietnameseWords(0) // "Không đồng"
 * numberToVietnameseWords(1234567) // "Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng"
 * numberToVietnameseWords(-5000) // "Âm năm nghìn đồng"
 */
export function numberToVietnameseWords(amount: number): string {
  if (!Number.isInteger(amount)) {
    amount = Math.round(amount)
  }

  if (amount === 0) {
    return 'Không đồng'
  }

  const isNegative = amount < 0
  amount = Math.abs(amount)

  if (amount > 999_999_999_999_999) {
    throw new Error('Number too large to convert')
  }

  const groups: number[] = []
  let remaining = amount

  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const parts: string[] = []

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupValue = groups[i]

    if (groupValue === 0) {
      continue
    }

    const hasLeadingGroup = i < groups.length - 1 && groups.slice(i + 1).some((g) => g > 0)
    const groupWords = readThreeDigits(groupValue, hasLeadingGroup)

    if (groupWords) {
      const unit = UNITS[i]
      if (unit) {
        parts.push(`${groupWords} ${unit}`)
      } else {
        parts.push(groupWords)
      }
    }
  }

  let result = parts.join(' ')

  result = result.charAt(0).toUpperCase() + result.slice(1)

  if (isNegative) {
    result = `Âm ${result.charAt(0).toLowerCase()}${result.slice(1)}`
  }

  return `${result} đồng`
}

/**
 * Formats a number to VND display format with words.
 * Useful for invoice display.
 *
 * @param amount - The amount in VND
 * @returns Object with numeric format and words
 */
export function formatVndWithWords(amount: number): {
  numeric: string
  words: string
} {
  const numeric = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

  return {
    numeric,
    words: numberToVietnameseWords(amount),
  }
}
