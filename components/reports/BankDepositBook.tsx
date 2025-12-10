'use client'

import { useState } from 'react'
import { Card, Table, Typography, Select, DatePicker, Button, Spin, Empty, Space, message } from 'antd'
import { FileExcelOutlined, FilePdfOutlined, BankOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import dayjs, { Dayjs } from 'dayjs'
import { api, type BankBookReport, type BankAccount } from '@/lib/supabase/functions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportBankBook } from '@/lib/reports/export-templates'
import { exportBankBookPDF } from '@/lib/reports/pdf-templates'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface BankDepositBookProps {
  storeInfo?: {
    name: string
    address: string
    taxCode?: string
  }
}

export function BankDepositBook({ storeInfo }: BankDepositBookProps) {
  const t = useTranslations('reports')
  const tFinance = useTranslations('finance')
  const tCommon = useTranslations('common')

  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.finance.listBankAccounts(),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const accounts = Array.isArray(accountsData?.bank_accounts) ? accountsData.bank_accounts : []

  const { data: reportData, isLoading: loadingReport, refetch } = useQuery({
    queryKey: ['bank-book-report', selectedAccountId, dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => api.reports.bankBook(
      dateRange[0].format('YYYY-MM-DD'),
      dateRange[1].format('YYYY-MM-DD'),
      selectedAccountId
    ),
    enabled: !!selectedAccountId,
  })

  const columns = [
    {
      title: <div className="text-center font-semibold">GHI SỔ</div>,
      onHeaderCell: () => ({ rowSpan: 2 }),
      children: [
        {
          title: '',
          onHeaderCell: () => ({ rowSpan: 0 }),
          children: [
            {
              title: <div className="text-center text-xs">A</div>,
              dataIndex: 'record_date',
              key: 'record_date',
              width: 80,
              render: (date: string) => date ? formatDate(date) : '',
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-semibold">CHỨNG TỪ</div>,
      children: [
        {
          title: <div className="text-center">SỐ HIỆU</div>,
          children: [
            {
              title: <div className="text-center text-xs">B</div>,
              dataIndex: 'voucher_no',
              key: 'voucher_no',
              width: 80,
              render: (v: string | null) => v || '-',
            },
          ],
        },
        {
          title: <div className="text-center">NGÀY, THÁNG</div>,
          children: [
            {
              title: <div className="text-center text-xs">C</div>,
              dataIndex: 'voucher_date',
              key: 'voucher_date',
              width: 100,
              render: (date: string) => date ? formatDate(date) : '',
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-semibold">DIỄN GIẢI</div>,
      onHeaderCell: () => ({ rowSpan: 2 }),
      children: [
        {
          title: '',
          onHeaderCell: () => ({ rowSpan: 0 }),
          children: [
            {
              title: <div className="text-center text-xs">D</div>,
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-semibold">SỐ TIỀN</div>,
      children: [
        {
          title: <div className="text-center">THU<br/><span className="text-xs">(GỬI VÀO)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs">1</div>,
              dataIndex: 'debit',
              key: 'debit',
              width: 110,
              align: 'right' as const,
              render: (v: number) => v > 0 ? formatCurrency(v) : '-',
            },
          ],
        },
        {
          title: <div className="text-center">CHI<br/><span className="text-xs">(RÚT RA)</span></div>,
          children: [
            {
              title: <div className="text-center text-xs">2</div>,
              dataIndex: 'credit',
              key: 'credit',
              width: 110,
              align: 'right' as const,
              render: (v: number) => v > 0 ? formatCurrency(v) : '-',
            },
          ],
        },
        {
          title: <div className="text-center">CÒN LẠI</div>,
          children: [
            {
              title: <div className="text-center text-xs">3</div>,
              dataIndex: 'balance',
              key: 'balance',
              width: 110,
              align: 'right' as const,
              render: (v: number) => formatCurrency(v),
            },
          ],
        },
      ],
    },
    {
      title: <div className="text-center font-semibold">GHI CHÚ</div>,
      onHeaderCell: () => ({ rowSpan: 2 }),
      children: [
        {
          title: '',
          onHeaderCell: () => ({ rowSpan: 0 }),
          children: [
            {
              title: <div className="text-center text-xs">F</div>,
              dataIndex: 'note',
              key: 'note',
              width: 80,
              render: (v: string | null) => v || '-',
            },
          ],
        },
      ],
    },
  ]

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]])
    }
  }

  const renderHeader = () => {
    if (!reportData?.bank_account) return null

    return (
      <div className="mb-6 text-center print:mb-4">
        {storeInfo && (
          <>
            <Text strong className="block text-sm">{storeInfo.name}</Text>
            <Text type="secondary" className="block text-xs">{storeInfo.address}</Text>
            {storeInfo.taxCode && (
              <Text type="secondary" className="block text-xs">MST: {storeInfo.taxCode}</Text>
            )}
          </>
        )}
        
        <Title level={4} className="!mt-4 !mb-2">{t('bankBook.title')}</Title>
        
        <Text className="block text-sm">
          {t('bankBook.bankLocation')}: {reportData.bank_account.bank_name}
        </Text>
        <Text className="block text-sm">
          {t('bankBook.accountNumber')}: {reportData.bank_account.account_number}
        </Text>
        
        <Text type="secondary" className="block text-xs mt-2">
          {t('bankBook.unit')}: {t('bankBook.unitVND')}
        </Text>
      </div>
    )
  }

  const renderSummary = () => {
    if (!reportData) return null

    return (
      <Table.Summary fixed>
        <Table.Summary.Row className="bg-blue-50">
          <Table.Summary.Cell index={0} />
          <Table.Summary.Cell index={1} />
          <Table.Summary.Cell index={2} />
          <Table.Summary.Cell index={3}>
            <Text strong>- {t('bankBook.totalMovement')}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="right">
            <Text strong className="text-green-600">{formatCurrency(reportData.totals.total_debit)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="right">
            <Text strong className="text-red-600">{formatCurrency(reportData.totals.total_credit)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={6} />
          <Table.Summary.Cell index={7} />
        </Table.Summary.Row>
        
        <Table.Summary.Row className="bg-green-50">
          <Table.Summary.Cell index={0} />
          <Table.Summary.Cell index={1} />
          <Table.Summary.Cell index={2} />
          <Table.Summary.Cell index={3}>
            <Text strong>- {t('bankBook.closingBalance')}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="center">
            <Text type="secondary">x</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="center">
            <Text type="secondary">x</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={6} align="right">
            <Text strong className="text-lg">{formatCurrency(reportData.totals.closing_balance)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={7} align="center">
            <Text type="secondary">x</Text>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  const getTableData = () => {
    if (!reportData) return []
    
    const openingRow = {
      stt: 0,
      record_date: '',
      voucher_no: '',
      voucher_date: '',
      description: `- ${t('bankBook.openingBalance')}`,
      debit: 0,
      credit: 0,
      balance: reportData.opening_balance,
      note: '',
      isSpecialRow: true,
    }

    return [openingRow, ...reportData.entries]
  }

  const handleExportExcel = () => {
    if (!reportData) return
    try {
      const period = `${dateRange[0].format('DD/MM/YYYY')}-${dateRange[1].format('DD/MM/YYYY')}`
      exportBankBook(reportData, storeInfo?.name || 'Cửa hàng', period)
      message.success(tCommon('success'))
    } catch (error) {
      console.error('Export Excel error:', error)
      message.error(tCommon('error'))
    }
  }

  const handleExportPDF = async () => {
    if (!reportData) return
    try {
      await exportBankBookPDF(reportData, {
        name: storeInfo?.name || 'Cửa hàng',
        address: storeInfo?.address,
        taxCode: storeInfo?.taxCode,
      })
      message.success(tCommon('success'))
    } catch (error) {
      console.error('Export PDF error:', error)
      message.error(tCommon('error'))
    }
  }

  return (
    <Card className="print:shadow-none print:border-0">
      <div className="flex flex-wrap gap-4 mb-4 print:hidden">
        <Select
          placeholder={tFinance('selectBankAccount')}
          style={{ width: 280 }}
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          loading={loadingAccounts}
          options={accounts.map((acc: BankAccount) => ({
            value: acc.id,
            label: (
              <div className="flex items-center gap-2">
                <BankOutlined />
                <span>{acc.bank_name} - {acc.account_number}</span>
              </div>
            ),
          }))}
        />
        
        <RangePicker
          value={dateRange}
          onChange={handleDateChange}
          format="DD/MM/YYYY"
        />
        
        <Button onClick={() => refetch()} disabled={!selectedAccountId}>
          {tCommon('refresh')}
        </Button>
        
        <Space className="ml-auto">
          <Button 
            icon={<FileExcelOutlined />} 
            disabled={!reportData}
            onClick={handleExportExcel}
          >
            Excel
          </Button>
          <Button 
            icon={<FilePdfOutlined />} 
            disabled={!reportData}
            onClick={handleExportPDF}
          >
            PDF
          </Button>
        </Space>
      </div>

      {!selectedAccountId ? (
        <Empty
          image={<BankOutlined className="text-5xl text-gray-300" />}
          description={t('bankBook.selectAccountPrompt')}
        />
      ) : loadingReport ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : !reportData || reportData.entries.length === 0 ? (
        <>
          {renderHeader()}
          <Empty description={t('bankBook.noTransactions')} />
        </>
      ) : (
        <>
          {renderHeader()}
          
          <Table
            dataSource={getTableData()}
            columns={columns}
            rowKey={(record) => record.stt || 'opening'}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 900 }}
            summary={() => renderSummary()}
            rowClassName={(record) => (record as { isSpecialRow?: boolean }).isSpecialRow ? 'bg-gray-50' : ''}
          />
          
          <div className="mt-8 flex justify-between text-center print:mt-4">
            <div>
              <Text strong className="block">{t('bankBook.preparedBy')}</Text>
              <Text type="secondary" className="block text-xs">{t('bankBook.signName')}</Text>
            </div>
            <div>
              <Text className="block">{t('bankBook.dateSignature')}</Text>
              <Text strong className="block mt-2">{t('bankBook.businessOwner')}</Text>
              <Text type="secondary" className="block text-xs">{t('bankBook.signNameStamp')}</Text>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
