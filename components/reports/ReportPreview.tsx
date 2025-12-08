'use client'

import { useState } from 'react'
import { Drawer, Table, Typography, Spin, Empty, Button, Space, Card, message } from 'antd'
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, LoadingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/supabase/functions'
import type {
  RevenueBookReport,
  CashBookReport,
  BankBookReport,
  ExpenseBookReport,
  InventoryBookReport,
  TaxBookReport,
  SalaryBookReport,
} from '@/lib/supabase/functions'
import { formatCurrency } from '@/lib/utils'
import {
  exportRevenueBook,
  exportCashBook,
  exportBankBook,
  exportExpenseBook,
  exportInventoryBook,
  exportTaxBook,
  exportSalaryBook,
} from '@/lib/reports/export-templates'
import {
  exportRevenueBookPDF,
  exportCashBookPDF,
  exportBankBookPDF,
  exportExpenseBookPDF,
  exportInventoryBookPDF,
  exportTaxBookPDF,
  exportSalaryBookPDF,
} from '@/lib/reports/pdf-templates'
import { trackReportExported } from '@/lib/analytics'
import { useTranslations } from 'next-intl'

const { Title, Text } = Typography

interface ReportPreviewProps {
  open: boolean
  onClose: () => void
  reportType: string
  dateFrom: string
  dateTo: string
}

export function ReportPreview({ open, onClose, reportType, dateFrom, dateTo }: ReportPreviewProps) {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tFinance = useTranslations('finance')
  const tHr = useTranslations('hr')
  const tInventory = useTranslations('inventory')
  const tInvoices = useTranslations('invoices')

  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType, dateFrom, dateTo],
    queryFn: async () => {
      switch (reportType) {
        case 'revenue':
          return api.reports.revenueBook(dateFrom, dateTo)
        case 'cash':
          return api.reports.cashBook(dateFrom, dateTo)
        case 'bank':
          return api.reports.bankBook(dateFrom, dateTo)
        case 'expense':
          return api.reports.expenseBook(dateFrom, dateTo)
        case 'inventory':
          return api.reports.inventoryBook(dateFrom, dateTo)
        case 'tax': {
          const year = new Date(dateFrom).getFullYear()
          return api.reports.taxBookReport(year)
        }
        case 'salary': {
          const date = new Date(dateFrom)
          return api.reports.salaryBookReport(date.getMonth() + 1, date.getFullYear())
        }
        default:
          return null
      }
    },
    enabled: open && !!reportType,
  })

  const getReportTitle = () => {
    switch (reportType) {
      case 'revenue': return t('revenueReport').toUpperCase()
      case 'cash': return t('cashReport').toUpperCase()
      case 'bank': return t('bankReport').toUpperCase()
      case 'expense': return t('expenseReport').toUpperCase()
      case 'inventory': return t('inventoryReport').toUpperCase()
      case 'tax': return t('taxReport').toUpperCase()
      case 'salary': return t('salaryReport').toUpperCase()
      default: return t('title').toUpperCase()
    }
  }

  const getColumns = () => {
    switch (reportType) {
      case 'revenue':
        return [
          { title: '#', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: tCommon('date'), dataIndex: 'date', key: 'date', width: 100 },
          { title: tInvoices('invoiceNumber'), dataIndex: 'invoice_no', key: 'invoice_no', width: 100 },
          { title: tCommon('name'), dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
          {
            title: tCommon('total'),
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'cash':
        return [
          { title: '#', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: tCommon('date'), dataIndex: 'date', key: 'date', width: 100 },
          { title: tCommon('description'), dataIndex: 'description', key: 'description', ellipsis: true },
          {
            title: tFinance('income'),
            dataIndex: 'debit',
            key: 'debit',
            width: 100,
            align: 'right' as const,
            render: (v: number) => v > 0 ? formatCurrency(v) : '-',
          },
          {
            title: tFinance('expense'),
            dataIndex: 'credit',
            key: 'credit',
            width: 100,
            align: 'right' as const,
            render: (v: number) => v > 0 ? formatCurrency(v) : '-',
          },
          {
            title: tFinance('balance'),
            dataIndex: 'balance',
            key: 'balance',
            width: 110,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'expense':
        return [
          { title: '#', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: tCommon('date'), dataIndex: 'date', key: 'date', width: 100 },
          { title: tCommon('type'), dataIndex: 'category', key: 'category', width: 100 },
          { title: tCommon('description'), dataIndex: 'description', key: 'description', ellipsis: true },
          {
            title: tCommon('amount'),
            dataIndex: 'amount',
            key: 'amount',
            width: 120,
            align: 'right' as const,
            render: (v: number) => formatCurrency(v),
          },
        ]
      case 'inventory':
        return [
          { title: '#', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: tCommon('date'), dataIndex: 'date', key: 'date', width: 100 },
          { title: tCommon('name'), dataIndex: 'product_name', key: 'product_name', ellipsis: true },
          { title: tCommon('type'), dataIndex: 'movement_type', key: 'movement_type', width: 80 },
          { title: tCommon('quantity'), dataIndex: 'quantity', key: 'quantity', width: 60, align: 'right' as const },
          { title: tInventory('stock'), dataIndex: 'after_quantity', key: 'after_quantity', width: 60, align: 'right' as const },
        ]
      case 'tax':
        return [
          { title: t('quarter'), dataIndex: 'quarter', key: 'quarter', width: 60, render: (v: number) => `Q${v}` },
          { title: t('revenue'), dataIndex: 'total_revenue', key: 'total_revenue', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: 'VAT', dataIndex: 'vat_collected', key: 'vat_collected', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: 'VAT', dataIndex: 'vat_deductible', key: 'vat_deductible', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: 'VAT', dataIndex: 'vat_payable', key: 'vat_payable', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: 'PIT', dataIndex: 'pit_payable', key: 'pit_payable', width: 100, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: tCommon('total'), dataIndex: 'total_tax', key: 'total_tax', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: tCommon('status'), dataIndex: 'status', key: 'status', width: 100 },
        ]
      case 'salary':
        return [
          { title: '#', dataIndex: 'stt', key: 'stt', width: 50 },
          { title: tCommon('name'), dataIndex: 'name', key: 'name', ellipsis: true },
          { title: tHr('position'), dataIndex: 'position', key: 'position', width: 100 },
          { title: tCommon('date'), dataIndex: 'working_days', key: 'working_days', width: 80 },
          { title: tHr('salary'), dataIndex: 'base_salary', key: 'base_salary', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: tCommon('total'), dataIndex: 'gross_salary', key: 'gross_salary', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: tCommon('amount'), dataIndex: 'net_salary', key: 'net_salary', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
          { title: tCommon('status'), dataIndex: 'status', key: 'status', width: 80 },
        ]
      default:
        return []
    }
  }

  const getDataSource = () => {
    if (!data) return []

    if ('entries' in data) {
      return data.entries
    }

    // Tax book has 'quarters' instead of 'entries'
    if ('quarters' in data) {
      return data.quarters
    }

    return []
  }

  const getTotals = () => {
    if (!data) return null
    if ('totals' in data) return data.totals
    if ('summary' in data) return data.summary
    return null
  }

  const formatPeriod = () => {
    return `${dateFrom} - ${dateTo}`
  }

  const handleExportExcel = () => {
    if (!data) {
      message.warning(tCommon('noData'))
      return
    }

    const storeName = 'Cua hang' // Default store name, could be fetched from context
    const period = formatPeriod()

    try {
      switch (reportType) {
        case 'revenue':
          exportRevenueBook(data as RevenueBookReport, storeName, period)
          break
        case 'cash':
          exportCashBook(data as CashBookReport, storeName, period)
          break
        case 'bank':
          exportBankBook(data as BankBookReport, storeName, period)
          break
        case 'expense':
          exportExpenseBook(data as ExpenseBookReport, storeName, period)
          break
        case 'inventory':
          exportInventoryBook(data as InventoryBookReport, storeName, period)
          break
        case 'tax': {
          // Tax book uses year from the period
          const year = new Date(dateFrom).getFullYear()
          exportTaxBook(data as unknown as TaxBookReport, storeName, year)
          break
        }
        case 'salary':
          exportSalaryBook(data as unknown as SalaryBookReport, storeName, period)
          break
        default:
          message.warning(tCommon('noData'))
          return
      }
      message.success(tCommon('success'))
      trackReportExported(reportType, 'excel')
    } catch (error) {
      console.error('Export error:', error)
      message.error(tCommon('error'))
    }
  }

  const handleExportPDF = async () => {
    if (!data) {
      message.warning(tCommon('noData'))
      return
    }

    const storeInfo = {
      name: 'Cua hang', // Default store name, could be fetched from context
      address: undefined,
      taxCode: undefined,
    }

    setIsExportingPDF(true)

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100))

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
          message.warning(tCommon('noData'))
          return
      }
      message.success(tCommon('success'))
      trackReportExported(reportType, 'pdf')
    } catch (error) {
      console.error('PDF export error:', error)
      message.error(tCommon('error'))
    } finally {
      setIsExportingPDF(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={getReportTitle()}
      placement="bottom"
      height="90%"
      extra={
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={handleExportExcel}
            disabled={!data || isLoading}
          >
            Excel
          </Button>
          <Button
            icon={isExportingPDF ? <LoadingOutlined /> : <FilePdfOutlined />}
            size="small"
            onClick={handleExportPDF}
            disabled={!data || isLoading || isExportingPDF}
            loading={isExportingPDF}
          >
            PDF
          </Button>
        </Space>
      }
    >
      <div className="text-center mb-4">
        <Text type="secondary">
          Ky: {dateFrom} - {dateTo}
        </Text>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : !data ? (
        <Empty description={tCommon('noData')} />
      ) : (
        <>
          <Table
            dataSource={getDataSource() as Record<string, unknown>[]}
            columns={getColumns() as { title: string; dataIndex: string; key: string }[]}
            rowKey="stt"
            size="small"
            pagination={false}
            scroll={{ x: true }}
          />

          {getTotals() && (
            <Card size="small" className="mt-4 bg-gray-50">
              <Title level={5} className="!mb-2">{tCommon('total')}</Title>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(getTotals() || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <Text type="secondary">{key.replace(/_/g, ' ')}:</Text>
                    <Text strong>
                      {typeof value === 'number' ? formatCurrency(value) : value}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Drawer>
  )
}
