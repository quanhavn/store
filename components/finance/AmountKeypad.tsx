'use client'

import { Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { formatCurrency } from '@/lib/utils'

interface AmountKeypadProps {
  value: number
  onChange: (value: number) => void
  maxValue?: number
}

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000]

export function AmountKeypad({ value, onChange, maxValue }: AmountKeypadProps) {
  const handleDigit = (digit: string) => {
    const newValue = parseInt(`${value}${digit}`, 10)
    if (maxValue && newValue > maxValue) return
    onChange(newValue)
  }

  const handleDelete = () => {
    const strValue = value.toString()
    if (strValue.length <= 1) {
      onChange(0)
    } else {
      onChange(parseInt(strValue.slice(0, -1), 10))
    }
  }

  const handleClear = () => {
    onChange(0)
  }

  const handleQuickAmount = (amount: number) => {
    if (maxValue && amount > maxValue) {
      onChange(maxValue)
    } else {
      onChange(amount)
    }
  }

  return (
    <div>
      {/* Display */}
      <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
        <div className="text-3xl font-bold text-gray-800">
          {formatCurrency(value)}
        </div>
        {maxValue && (
          <div className="text-sm text-gray-500 mt-1">
            Toi da: {formatCurrency(maxValue)}
          </div>
        )}
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            onClick={() => handleQuickAmount(amount)}
            className="h-10 text-xs"
            disabled={maxValue !== undefined && amount > maxValue}
          >
            {(amount / 1000).toLocaleString('vi-VN')}k
          </Button>
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="h-14 text-xl font-medium"
          >
            {digit}
          </Button>
        ))}
        <Button
          onClick={handleClear}
          className="h-14 text-sm"
        >
          Xoa
        </Button>
        <Button
          onClick={() => handleDigit('0')}
          className="h-14 text-xl font-medium"
        >
          0
        </Button>
        <Button
          onClick={handleDelete}
          className="h-14"
          icon={<DeleteOutlined />}
        />
      </div>

      {/* 000 button for quick thousands */}
      <Button
        onClick={() => handleDigit('000')}
        className="w-full h-12 mt-2 text-lg"
      >
        000
      </Button>
    </div>
  )
}
