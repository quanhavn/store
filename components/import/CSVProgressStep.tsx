'use client'

import { useEffect, useCallback, useRef } from 'react'
import { Progress, Typography, Result, List, Space, Tag } from 'antd'
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useCSVImportStore } from '@/lib/stores/csv-import'
import { api } from '@/lib/supabase/functions'
import type { ImportEntityType, ParsedRow } from '@/lib/import/types'

const { Text, Paragraph } = Typography

const BATCH_SIZE = 10 // Process 10 rows at a time

interface ExistingData {
  categoryNames: Set<string>
  customerPhones: Set<string>
  productSkus: Set<string>
  productBarcodes: Set<string>
  employeeIdCards: Set<string>
  employeePhones: Set<string>
}

export function CSVProgressStep() {
  const {
    entityType,
    parsedRows,
    validRowCount,
    progress,
    result,
    setProgress,
    setResult,
    setStep,
  } = useCSVImportStore()

  const importStarted = useRef(false)

  const fetchExistingData = useCallback(async (): Promise<ExistingData> => {
    const existing: ExistingData = {
      categoryNames: new Set(),
      customerPhones: new Set(),
      productSkus: new Set(),
      productBarcodes: new Set(),
      employeeIdCards: new Set(),
      employeePhones: new Set(),
    }

    try {
      switch (entityType) {
        case 'category': {
          const { categories } = await api.categories.list()
          categories.forEach((c) => existing.categoryNames.add(c.name.toLowerCase()))
          break
        }
        case 'customer': {
          const { customers } = await api.customers.list({ limit: 10000 })
          customers.forEach((c) => {
            if (c.phone) existing.customerPhones.add(c.phone)
          })
          break
        }
        case 'product': {
          const { products } = await api.products.list({ limit: 10000 })
          products.forEach((p) => {
            if (p.sku) existing.productSkus.add(p.sku)
            if (p.barcode) existing.productBarcodes.add(p.barcode)
          })
          break
        }
        case 'employee': {
          const { employees } = await api.hr.listEmployees()
          employees.forEach((e) => {
            if (e.id_card) existing.employeeIdCards.add(e.id_card)
            if (e.phone) existing.employeePhones.add(e.phone)
          })
          break
        }
      }
    } catch (err) {
      console.error('Error fetching existing data:', err)
    }

    return existing
  }, [entityType])

  const isDuplicate = useCallback((row: ParsedRow, existing: ExistingData): string | null => {
    const data = row.data

    switch (entityType) {
      case 'category': {
        const name = (data.name as string)?.toLowerCase()
        if (name && existing.categoryNames.has(name)) {
          return `Danh mục "${data.name}" đã tồn tại`
        }
        break
      }
      case 'customer': {
        const phone = data.phone as string
        if (phone && existing.customerPhones.has(phone)) {
          return `Số điện thoại "${phone}" đã tồn tại`
        }
        break
      }
      case 'product': {
        const sku = data.sku as string
        const barcode = data.barcode as string
        if (sku && existing.productSkus.has(sku)) {
          return `Mã SKU "${sku}" đã tồn tại`
        }
        if (barcode && existing.productBarcodes.has(barcode)) {
          return `Mã vạch "${barcode}" đã tồn tại`
        }
        break
      }
      case 'employee': {
        const idCard = data.id_card as string
        const phone = data.phone as string
        if (idCard && existing.employeeIdCards.has(idCard)) {
          return `CMND/CCCD "${idCard}" đã tồn tại`
        }
        if (phone && existing.employeePhones.has(phone)) {
          return `Số điện thoại "${phone}" đã tồn tại`
        }
        break
      }
    }
    return null
  }, [entityType])

  const addToExisting = useCallback((row: ParsedRow, existing: ExistingData) => {
    const data = row.data

    switch (entityType) {
      case 'category': {
        const name = (data.name as string)?.toLowerCase()
        if (name) existing.categoryNames.add(name)
        break
      }
      case 'customer': {
        const phone = data.phone as string
        if (phone) existing.customerPhones.add(phone)
        break
      }
      case 'product': {
        const sku = data.sku as string
        const barcode = data.barcode as string
        if (sku) existing.productSkus.add(sku)
        if (barcode) existing.productBarcodes.add(barcode)
        break
      }
      case 'employee': {
        const idCard = data.id_card as string
        const phone = data.phone as string
        if (idCard) existing.employeeIdCards.add(idCard)
        if (phone) existing.employeePhones.add(phone)
        break
      }
    }
  }, [entityType])

  const importData = useCallback(async () => {
    if (importStarted.current) return
    importStarted.current = true

    const validRows = parsedRows.filter((r) => r.isValid)

    if (validRows.length === 0) {
      setResult({
        success: false,
        totalRows: parsedRows.length,
        importedCount: 0,
        skippedCount: parsedRows.length,
        errors: [{ row: 0, message: 'Không có dữ liệu hợp lệ để import' }],
      })
      setStep('complete')
      return
    }

    setProgress({
      current: 0,
      total: validRows.length,
      status: 'importing',
      message: 'Đang kiểm tra dữ liệu trùng...',
    })

    // Fetch existing data for duplicate checking
    const existing = await fetchExistingData()

    let importedCount = 0
    let skippedCount = 0
    const errors: Array<{ row: number; message: string }> = []

    // Process in batches
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)

      // Process batch items sequentially to properly track duplicates
      for (const row of batch) {
        // Check for duplicate
        const duplicateReason = isDuplicate(row, existing)
        if (duplicateReason) {
          skippedCount++
          errors.push({
            row: row.rowIndex,
            message: duplicateReason,
          })
          continue
        }

        try {
          await importSingleRow(row, entityType)
          importedCount++
          // Add to existing set to prevent duplicates within this import
          addToExisting(row, existing)
        } catch (err) {
          errors.push({
            row: row.rowIndex,
            message: err instanceof Error ? err.message : 'Lỗi không xác định',
          })
        }
      }

      setProgress({
        current: Math.min(i + BATCH_SIZE, validRows.length),
        total: validRows.length,
        status: 'importing',
        message: `Đang import ${Math.min(i + BATCH_SIZE, validRows.length)}/${validRows.length}...`,
      })
    }

    setResult({
      success: importedCount > 0,
      totalRows: parsedRows.length,
      importedCount,
      skippedCount: parsedRows.length - validRowCount + skippedCount,
      errors,
    })

    setProgress({
      current: validRows.length,
      total: validRows.length,
      status: 'complete',
      message: 'Hoàn tất',
    })

    setStep('complete')
  }, [parsedRows, validRowCount, entityType, setProgress, setResult, setStep, fetchExistingData, isDuplicate, addToExisting])

  useEffect(() => {
    if (progress.status === 'idle' && !importStarted.current) {
      importData()
    }
  }, [progress.status, importData])

  if (progress.status === 'complete' || result) {
    return (
      <Result
        status={result?.success ? 'success' : 'warning'}
        title={result?.success ? 'Import thành công!' : 'Import hoàn tất với lỗi'}
        subTitle={
          <Space direction="vertical">
            <Text>
              Đã import: <Text strong className="text-green-600">{result?.importedCount || 0}</Text> / {result?.totalRows || 0} dòng
            </Text>
            {(result?.skippedCount || 0) > 0 && (
              <Text>
                Bỏ qua: <Text type="secondary">{result?.skippedCount}</Text> dòng
              </Text>
            )}
          </Space>
        }
        extra={
          result?.errors && result.errors.length > 0 && (
            <div className="text-left max-h-[200px] overflow-y-auto">
              <Text strong className="block mb-2">Chi tiết lỗi:</Text>
              <List
                size="small"
                dataSource={result.errors.slice(0, 10)}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red">Dòng {item.row}</Tag>
                    <Text type="secondary">{item.message}</Text>
                  </List.Item>
                )}
              />
              {result.errors.length > 10 && (
                <Text type="secondary" className="mt-2 block">
                  ...và {result.errors.length - 10} lỗi khác
                </Text>
              )}
            </div>
          )
        }
      />
    )
  }

  return (
    <div className="text-center py-8">
      <LoadingOutlined style={{ fontSize: 48 }} className="text-blue-500 mb-4" />
      <Paragraph className="text-lg mb-4">{progress.message}</Paragraph>
      <Progress
        percent={Math.round((progress.current / progress.total) * 100)}
        status="active"
        strokeColor={{ from: '#108ee9', to: '#87d068' }}
      />
      <Text type="secondary" className="mt-2 block">
        {progress.current} / {progress.total} dòng
      </Text>
    </div>
  )
}

async function importSingleRow(
  row: ParsedRow,
  entityType: ImportEntityType
): Promise<void> {
  const data = row.data

  switch (entityType) {
    case 'category':
      await api.categories.create({
        name: data.name as string,
        parent_id: undefined, // Would need category lookup for parent_name
      })
      break

    case 'customer':
      await api.customers.create({
        name: data.name as string,
        phone: data.phone as string,
        address: (data.address as string) || undefined,
        tax_code: (data.tax_code as string) || undefined,
        notes: (data.notes as string) || undefined,
      })
      break

    case 'product':
      await api.products.create({
        name: data.name as string,
        sku: (data.sku as string) || undefined,
        barcode: (data.barcode as string) || undefined,
        category_id: undefined, // Would need category lookup for category_name
        cost_price: (data.cost_price as number) || 0,
        sell_price: (data.sell_price as number) || 0,
        vat_rate: (data.vat_rate as number) || 0,
        quantity: (data.quantity as number) || 0,
        min_stock: (data.min_stock as number) || 0,
        unit: (data.unit as string) || 'cái',
      })
      break

    case 'employee':
      await api.hr.createEmployee({
        name: data.name as string,
        phone: data.phone as string,
        id_card: data.id_card as string,
        date_of_birth: (data.date_of_birth as string) || undefined,
        address: (data.address as string) || undefined,
        position: data.position as string,
        department: (data.department as string) || undefined,
        hire_date: data.hire_date as string,
        contract_type: (data.contract_type as 'full_time' | 'part_time' | 'contract') || 'full_time',
        base_salary: (data.base_salary as number) || 0,
        allowances: (data.allowances as number) || undefined,
        dependents: (data.dependents as number) || undefined,
        bank_account: (data.bank_account as string) || undefined,
        bank_name: (data.bank_name as string) || undefined,
        social_insurance_no: (data.social_insurance_no as string) || undefined,
      })
      break
  }
}
