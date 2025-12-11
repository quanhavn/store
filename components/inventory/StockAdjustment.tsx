'use client'

import { useState } from 'react'
import {
  Segmented,
  Button,
  List,
  InputNumber,
  Input,
  Empty,
  Modal,
  message,
  Spin,
  Typography,
  Tag,
  Select,
  Radio
} from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckOutlined,
  DollarOutlined,
  BankOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { useInventoryStore, AdjustmentType } from '@/lib/stores/inventory'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const { Text } = Typography
const { TextArea } = Input

interface ProductVariant {
  id: string
  name: string
  sku?: string
  barcode?: string
  sell_price: number
  cost_price?: number
  quantity: number
  min_stock?: number
  active?: boolean
}

interface ProductUnit {
  id: string
  unit_name: string
  conversion_rate: number
  barcode?: string
  sell_price?: number
  cost_price?: number
  is_base_unit: boolean
  is_default: boolean
  active?: boolean
}

interface Product {
  id: string
  name: string
  sku: string | null
  quantity: number
  cost_price: number
  unit: string
  has_variants?: boolean
  has_units?: boolean
  variants?: ProductVariant[]
  units?: ProductUnit[]
}

export function StockAdjustment() {
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [variantSelectProduct, setVariantSelectProduct] = useState<Product | null>(null)
  const [unitSelectProduct, setUnitSelectProduct] = useState<Product | null>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()
  const t = useTranslations('inventory')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const tProducts = useTranslations('products')

  const {
    adjustmentType,
    adjustmentItems,
    adjustmentNote,
    supplierName,
    paymentMethod,
    bankAccountId,
    setAdjustmentType,
    addAdjustmentItem,
    addAdjustmentItemWithVariant,
    removeAdjustmentItem,
    updateAdjustmentQuantity,
    updateAdjustmentCost,
    updateAdjustmentUnit,
    setAdjustmentNote,
    setSupplierName,
    setPaymentMethod,
    setBankAccountId,
    clearAdjustment,
    getItemCount,
    getTotalValue,
  } = useInventoryStore()

  const { data: bankAccountsData } = useQuery<{ id: string; bank_name: string; account_number: string; is_default: boolean }[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number, is_default')
        .order('is_default', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : []

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['products-search-with-variants', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return []
      
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*), product_units(*)')
        .eq('active', true)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .limit(20)
      
      if (error) throw error
      
      interface ProductRow {
        id: string
        name: string
        sku: string | null
        quantity: number
        cost_price: number
        unit: string
        has_variants?: boolean
        has_units?: boolean
        product_variants?: ProductVariant[]
        product_units?: ProductUnit[]
      }
      
      return (data as ProductRow[] || []).map((p) => ({
        ...p,
        variants: p.product_variants?.filter((v) => v.active !== false) || [],
        units: p.product_units?.filter((u) => u.active !== false) || [],
      })) as Product[]
    },
    enabled: searchTerm.length > 0,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (adjustmentType === 'import') {
        const items = adjustmentItems.map(item => {
          const baseQuantity = item.conversion_rate 
            ? Math.round(item.adjustment_quantity * item.conversion_rate) 
            : item.adjustment_quantity
          return {
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: baseQuantity,
            unit_cost: item.unit_cost ?? undefined,
          }
        })
        
        await api.inventory.batchImport({
          items,
          note: adjustmentNote || undefined,
          record_expense: getTotalValue() > 0,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === 'bank_transfer' ? bankAccountId || undefined : undefined,
          supplier_name: supplierName || undefined,
        })
      } else {
        for (const item of adjustmentItems) {
          const baseQuantity = item.conversion_rate 
            ? Math.round(item.adjustment_quantity * item.conversion_rate) 
            : item.adjustment_quantity
          
          if (adjustmentType === 'export') {
            await api.inventory.export({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: baseQuantity,
              note: item.note || adjustmentNote,
            })
          } else {
            await api.inventory.adjust({
              product_id: item.product_id,
              variant_id: item.variant_id,
              new_quantity: item.current_quantity + baseQuantity,
              note: item.note || adjustmentNote,
            })
          }
        }
      }
      return true
    },
    onSuccess: () => {
      const expenseMsg = adjustmentType === 'import' && getTotalValue() > 0 
        ? ` (${t('expenseRecorded')})` 
        : ''
      message.success(
        adjustmentType === 'import'
          ? `${t('stockInSuccess')}${expenseMsg}`
          : adjustmentType === 'export'
          ? t('stockOutSuccess')
          : t('adjustmentSuccess')
      )
      clearAdjustment()
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => {
      message.error(`${tErrors('generic')}: ${error.message}`)
    },
  })

  const handleAddProduct = (product: Product) => {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setVariantSelectProduct(product)
      setProductSearchOpen(false)
      return
    }

    if (product.has_units && product.units && product.units.length > 1) {
      setUnitSelectProduct(product)
      setProductSearchOpen(false)
      return
    }

    const defaultUnit = product.units?.find(u => u.is_default) || product.units?.[0]

    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      cost_price: defaultUnit?.cost_price ?? product.cost_price,
      unit_id: defaultUnit?.id,
      unit_name: defaultUnit?.unit_name || product.unit,
      conversion_rate: defaultUnit?.conversion_rate || 1,
    })
    setProductSearchOpen(false)
    setSearchTerm('')
  }

  const handleSelectVariant = (product: Product, variant: ProductVariant) => {
    addAdjustmentItemWithVariant({
      id: product.id,
      name: product.name,
      quantity: variant.quantity,
      cost_price: variant.cost_price ?? product.cost_price,
      variant_id: variant.id,
      variant_name: variant.name,
    })
    setVariantSelectProduct(null)
    setSearchTerm('')
  }

  const handleSelectUnit = (product: Product, unit: ProductUnit) => {
    addAdjustmentItem({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      cost_price: unit.cost_price ?? product.cost_price,
      unit_id: unit.id,
      unit_name: unit.unit_name,
      conversion_rate: unit.conversion_rate,
    })
    setUnitSelectProduct(null)
    setSearchTerm('')
  }

  const getTypeLabel = (type: AdjustmentType) => {
    switch (type) {
      case 'import':
        return t('stockIn')
      case 'export':
        return t('stockOut')
      case 'adjustment':
        return t('adjustment')
    }
  }

  return (
    <div>
      <Segmented
        block
        options={[
          { value: 'import', label: t('stockIn') },
          { value: 'export', label: t('stockOut') },
          { value: 'adjustment', label: t('adjustment') },
        ]}
        value={adjustmentType}
        onChange={(value) => setAdjustmentType(value as AdjustmentType)}
        className="mb-4"
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setProductSearchOpen(true)}
        block
        className="mb-4"
      >
        {t('addProduct')}
      </Button>

      {adjustmentItems.length === 0 ? (
        <Empty
          description={t('noProducts')}
          className="my-8"
        />
      ) : (
        <>
          <List
            dataSource={adjustmentItems}
            renderItem={(item) => (
              <List.Item className="!px-0">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.product_name}</div>
                      {item.variant_name && (
                        <Tag color="blue" className="mt-1">{item.variant_name}</Tag>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {t('currentStock')}: {item.current_quantity}
                        {item.unit_name && ` ${item.unit_name}`}
                      </div>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeAdjustmentItem(item.product_id, item.variant_id)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        type="text"
                        icon={<MinusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity - 1,
                            item.variant_id
                          )
                        }
                      />
                      <InputNumber
                        min={1}
                        value={item.adjustment_quantity}
                        onChange={(value) =>
                          updateAdjustmentQuantity(item.product_id, value || 1, item.variant_id)
                        }
                        controls={false}
                        className="w-16 text-center border-0"
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          updateAdjustmentQuantity(
                            item.product_id,
                            item.adjustment_quantity + 1,
                            item.variant_id
                          )
                        }
                      />
                    </div>
                    {item.unit_name && (
                      <Text type="secondary" className="text-sm">/{item.unit_name}</Text>
                    )}
                    {adjustmentType === 'import' && (
                      <InputNumber
                        placeholder={t('costPrice')}
                        value={item.unit_cost}
                        onChange={(value) =>
                          updateAdjustmentCost(item.product_id, value, item.variant_id)
                        }
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        }
                        parser={(value) =>
                          Number(value?.replace(/,/g, '')) || 0
                        }
                        className="flex-1"
                        suffix="đ"
                      />
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />

          <TextArea
            placeholder={t('notePlaceholder')}
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            rows={2}
            className="mt-4"
          />

          {adjustmentType === 'import' && (
            <>
              <Input
                placeholder={t('supplierNamePlaceholder')}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="mt-4"
              />
              {getTotalValue() > 0 && (
                <div className="mt-4">
                  <Text className="block mb-2 font-medium">{t('paymentMethod')}:</Text>
                  <Radio.Group
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value)
                      if (e.target.value === 'bank_transfer' && bankAccounts.length > 0) {
                        const defaultBank = bankAccounts.find((b: { is_default?: boolean }) => b.is_default) || bankAccounts[0]
                        setBankAccountId(defaultBank.id)
                      }
                    }}
                    className="w-full"
                  >
                    <div className="flex flex-col gap-2">
                      <Radio value="cash" className="!flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <span className="flex items-center gap-2">
                          <DollarOutlined />
                          {tCommon('cash')}
                        </span>
                      </Radio>
                      <Radio value="bank_transfer" className="!flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <span className="flex items-center gap-2">
                          <BankOutlined />
                          {tCommon('bankTransfer')}
                        </span>
                      </Radio>
                    </div>
                  </Radio.Group>
                  
                  {paymentMethod === 'bank_transfer' && (
                    <div className="mt-2">
                      <Select
                        className="w-full"
                        placeholder={t('selectBankAccount')}
                        value={bankAccountId}
                        onChange={(value) => setBankAccountId(value)}
                        options={bankAccounts.map((bank: { id: string; bank_name: string; account_number: string }) => ({
                          value: bank.id,
                          label: `${bank.bank_name} - ${bank.account_number}`,
                        }))}
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {paymentMethod === 'cash' 
                      ? t('autoDeductExpenseCash', { amount: formatCurrency(getTotalValue()) })
                      : t('autoDeductExpenseBank', { amount: formatCurrency(getTotalValue()) })
                    }
                  </div>
                </div>
              )}
            </>
          )}

          <div className="bg-gray-50 p-3 rounded-lg mt-4">
            <div className="flex justify-between mb-1">
              <Text type="secondary">{tCommon('type')}:</Text>
              <Text>{getTypeLabel(adjustmentType)}</Text>
            </div>
            <div className="flex justify-between mb-1">
              <Text type="secondary">Số lượng:</Text>
              <Text>{getItemCount()} {tCommon('products')}</Text>
            </div>
            {adjustmentType === 'import' && (
              <div className="flex justify-between">
                <Text type="secondary">{t('totalValue')}:</Text>
                <Text strong>{formatCurrency(getTotalValue())}</Text>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={clearAdjustment} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
              disabled={getTotalValue() > 0 && paymentMethod === 'bank_transfer' && !bankAccountId}
              className="flex-1"
            >
              {tCommon('confirm')}
            </Button>
          </div>
        </>
      )}

      <Modal
        title={t('selectProduct')}
        open={productSearchOpen}
        onCancel={() => {
          setProductSearchOpen(false)
          setSearchTerm('')
        }}
        footer={null}
      >
        <Input
          placeholder={t('searchProductPlaceholder')}
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
          autoFocus
        />

        {searchLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : searchResults.length === 0 ? (
          <Empty description={searchTerm ? t('noProductsFound') : t('enterProductNameToSearch')} />
        ) : (
          <List
            dataSource={searchResults}
            renderItem={(product) => {
              const isAdded = adjustmentItems.some(
                (item) => item.product_id === product.id && !item.variant_id
              )
              const hasVariants = product.has_variants && product.variants && product.variants.length > 0
              return (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => !isAdded && handleAddProduct(product)}
                >
                  <div className="flex justify-between w-full">
                    <div>
                      <div className="font-medium">
                        {product.name}
                        {hasVariants && (
                          <Tag color="purple" className="ml-2">{tProducts('hasVariants')}</Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.sku && `SKU: ${product.sku} | `}
                        {t('stock')}: {product.quantity} {product.unit}
                      </div>
                    </div>
                    {isAdded ? (
                      <Text type="secondary">{t('added')}</Text>
                    ) : (
                      <PlusOutlined className="text-blue-500" />
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Modal>

      <Modal
        title={`${tProducts('variants.selectVariant')} - ${variantSelectProduct?.name}`}
        open={!!variantSelectProduct}
        onCancel={() => setVariantSelectProduct(null)}
        footer={null}
      >
        {variantSelectProduct && variantSelectProduct.variants && (
          <List
            dataSource={variantSelectProduct.variants}
            renderItem={(variant) => {
              const isAdded = adjustmentItems.some(
                (item) => item.product_id === variantSelectProduct.id && item.variant_id === variant.id
              )
              const isOutOfStock = adjustmentType !== 'import' && variant.quantity <= 0
              return (
                <List.Item
                  className={`cursor-pointer hover:bg-gray-50 ${isOutOfStock ? 'opacity-50' : ''}`}
                  onClick={() => !isAdded && !isOutOfStock && handleSelectVariant(variantSelectProduct, variant)}
                >
                  <div className="flex justify-between w-full">
                    <div>
                      <div className="font-medium">{variant.name}</div>
                      <div className="text-xs text-gray-500">
                        {variant.sku && `SKU: ${variant.sku} | `}
                        {t('stock')}: {variant.quantity}
                      </div>
                    </div>
                    {isAdded ? (
                      <Text type="secondary">{t('added')}</Text>
                    ) : isOutOfStock ? (
                      <Tag color="red">Hết hàng</Tag>
                    ) : (
                      <Text strong className="text-blue-600">
                        {formatCurrency(variant.cost_price || variantSelectProduct.cost_price)}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Modal>

      <Modal
        title={`${tProducts('units.selectUnit')} - ${unitSelectProduct?.name}`}
        open={!!unitSelectProduct}
        onCancel={() => setUnitSelectProduct(null)}
        footer={null}
      >
        {unitSelectProduct && unitSelectProduct.units && (
          <List
            dataSource={unitSelectProduct.units}
            renderItem={(unit) => {
              const isAdded = adjustmentItems.some(
                (item) => item.product_id === unitSelectProduct.id && item.unit_id === unit.id
              )
              const price = unit.cost_price ?? unitSelectProduct.cost_price
              return (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => !isAdded && handleSelectUnit(unitSelectProduct, unit)}
                >
                  <div className="flex justify-between w-full">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {unit.unit_name}
                        {unit.is_base_unit && (
                          <Tag color="blue">{tProducts('units.baseUnit')}</Tag>
                        )}
                        {unit.is_default && (
                          <Tag color="green">{tProducts('units.default')}</Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {unit.conversion_rate > 1 && `x${unit.conversion_rate} ${tProducts('units.baseUnit').toLowerCase()}`}
                      </div>
                    </div>
                    {isAdded ? (
                      <Text type="secondary">{t('added')}</Text>
                    ) : (
                      <Text strong className="text-blue-600">
                        {formatCurrency(price)}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </Modal>
    </div>
  )
}
