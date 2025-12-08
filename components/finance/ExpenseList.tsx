'use client'

import { useState } from 'react'
import { List, Tag, Empty, Spin, Typography, Button } from 'antd'
import { AccountBookOutlined, PlusOutlined, InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api, type Expense } from '@/lib/supabase/functions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseForm } from './ExpenseForm'

const { Text } = Typography

interface ExpenseListProps {
  dateFrom?: string
  dateTo?: string
  categoryId?: string
  limit?: number
}

export function ExpenseList({ dateFrom, dateTo, categoryId, limit = 20 }: ExpenseListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', dateFrom, dateTo, categoryId, limit],
    queryFn: () => api.finance.listExpenses({
      date_from: dateFrom,
      date_to: dateTo,
      category_id: categoryId,
      limit,
    }),
  })

  const expenses = data?.expenses || []

  const getTotalAmount = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="bg-red-50 px-4 py-2 rounded-lg">
          <Text type="secondary" className="text-sm">{t('totalExpenses')}:</Text>
          <span className="ml-2 font-semibold text-red-600">{formatCurrency(getTotalAmount())}</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setFormOpen(true)}
          className="bg-red-500 hover:!bg-red-600"
        >
          {t('addExpense')}
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Empty
          image={<InboxOutlined className="text-5xl text-gray-300" />}
          description={t('noExpenses')}
        >
          <Button type="primary" onClick={() => setFormOpen(true)}>
            {t('addFirstExpense')}
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={expenses}
          renderItem={(expense: Expense) => (
            <List.Item className="!px-0 !py-3">
              <div className="w-full flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AccountBookOutlined className="text-red-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{expense.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {expense.expense_categories && (
                      <Tag color="orange" className="text-xs m-0">
                        {expense.expense_categories.name}
                      </Tag>
                    )}
                    <Tag color={expense.payment_method === 'cash' ? 'green' : 'blue'} className="text-xs m-0">
                      {expense.payment_method === 'cash' ? t('paymentMethods.cash') : t('paymentMethods.bankTransfer')}
                    </Tag>
                    <Text type="secondary" className="text-xs">
                      {formatDate(expense.expense_date)}
                    </Text>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-red-600">
                    -{formatCurrency(expense.amount)}
                  </div>
                  {expense.vat_amount > 0 && (
                    <Text type="secondary" className="text-xs">
                      VAT: {formatCurrency(expense.vat_amount)}
                    </Text>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  )
}
