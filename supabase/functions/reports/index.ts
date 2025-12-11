import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

// Dashboard interfaces
interface DashboardSummaryRequest {
  action: 'dashboard_summary'
}

interface SalesAnalyticsRequest {
  action: 'sales_analytics'
  date_from: string
  date_to: string
}

interface FinancialAnalyticsRequest {
  action: 'financial_analytics'
  date_from: string
  date_to: string
}

// 7 Accounting Books
interface RevenueBookRequest {
  action: 'revenue_book'
  date_from: string
  date_to: string
}

interface CashBookRequest {
  action: 'cash_book'
  date_from: string
  date_to: string
}

interface BankBookRequest {
  action: 'bank_book'
  date_from: string
  date_to: string
  bank_account_id?: string
}

interface ExpenseBookRequest {
  action: 'expense_book'
  date_from: string
  date_to: string
}

interface InventoryBookRequest {
  action: 'inventory_book'
  date_from: string
  date_to: string
}

interface InventoryDetailBookRequest {
  action: 'inventory_detail_book'
  date_from: string
  date_to: string
}

interface TaxBookRequest {
  action: 'tax_book'
  year: number
}

interface SalaryBookRequest {
  action: 'salary_book'
  month: number
  year: number
}

type ReportsRequest =
  | DashboardSummaryRequest
  | SalesAnalyticsRequest
  | FinancialAnalyticsRequest
  | RevenueBookRequest
  | CashBookRequest
  | BankBookRequest
  | ExpenseBookRequest
  | InventoryBookRequest
  | InventoryDetailBookRequest
  | TaxBookRequest
  | SalaryBookRequest

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: ReportsRequest = await req.json()

    switch (body.action) {
      case 'dashboard_summary': {
        // Use Vietnam timezone (GMT+7) for date calculations
        const VIETNAM_TZ_OFFSET = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
        const now = new Date()
        const vietnamNow = new Date(now.getTime() + VIETNAM_TZ_OFFSET)
        
        // Get date parts in Vietnam timezone
        const year = vietnamNow.getUTCFullYear()
        const month = vietnamNow.getUTCMonth()
        const day = vietnamNow.getUTCDate()
        
        // Create dates in Vietnam timezone, then convert back to UTC for querying
        const todayStart = new Date(Date.UTC(year, month, day) - VIETNAM_TZ_OFFSET).toISOString()
        const monthStart = new Date(Date.UTC(year, month, 1) - VIETNAM_TZ_OFFSET).toISOString()
        const lastMonthStart = new Date(Date.UTC(year, month - 1, 1) - VIETNAM_TZ_OFFSET).toISOString()
        const lastMonthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59) - VIETNAM_TZ_OFFSET).toISOString()

        // Today's sales
        const { data: todaySales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', todayStart)

        const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total, 0) || 0
        const todayOrders = todaySales?.length || 0

        // This month's sales
        const { data: monthSales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', monthStart)

        const monthRevenue = monthSales?.reduce((sum, s) => sum + s.total, 0) || 0
        const monthOrders = monthSales?.length || 0

        // This month's expenses
        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('store_id', store_id)
          .gte('expense_date', monthStart.split('T')[0])

        const totalExpenses = monthExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0

        // Last month comparison
        const { data: lastMonthSales } = await supabase
          .from('sales')
          .select('total')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', lastMonthStart)
          .lte('completed_at', lastMonthEnd)

        const lastMonthRevenue = lastMonthSales?.reduce((sum, s) => sum + s.total, 0) || 0

        // Low stock alerts
        const { data: lowStock, count: lowStockCount } = await supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('store_id', store_id)
          .eq('active', true)
          .lt('stock_quantity', 10)

        // Recent sales
        const { data: recentSales } = await supabase
          .from('sales')
          .select('id, invoice_no, total, completed_at, customer_name')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)

        // Tax deadline (next quarter) - use Vietnam timezone
        const currentQuarter = Math.ceil((month + 1) / 3)
        const taxDeadlines: Record<number, { month: number; day: number }> = {
          1: { month: 3, day: 30 }, // Q1 -> April 30
          2: { month: 6, day: 30 }, // Q2 -> July 30
          3: { month: 9, day: 30 }, // Q3 -> October 30
          4: { month: 0, day: 30 }, // Q4 -> January 30 next year
        }

        const deadline = taxDeadlines[currentQuarter]
        const taxDeadlineYear = currentQuarter === 4 ? year + 1 : year
        const taxDeadlineDate = new Date(taxDeadlineYear, deadline.month, deadline.day)
        const taxDeadlineDays = Math.ceil((taxDeadlineDate.getTime() - vietnamNow.getTime()) / (1000 * 60 * 60 * 24))

        return successResponse({
          today: {
            revenue: todayRevenue,
            orders: todayOrders,
            avgOrderValue: todayOrders > 0 ? Math.round(todayRevenue / todayOrders) : 0,
          },
          thisMonth: {
            revenue: monthRevenue,
            expenses: totalExpenses,
            profit: monthRevenue - totalExpenses,
            orders: monthOrders,
          },
          comparison: {
            revenueChange: lastMonthRevenue > 0
              ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
              : 0,
          },
          alerts: {
            lowStockCount: lowStockCount || 0,
            taxDeadlineDays,
          },
          recentSales: recentSales || [],
        })
      }

      case 'sales_analytics': {
        const { date_from, date_to } = body

        // Daily sales
        const { data: sales } = await supabase
          .from('sales')
          .select('id, total, completed_at, sale_items(quantity, unit_price, product_id, products(id, name, category_id, categories(name))), payments(method, amount)')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', date_from)
          .lte('completed_at', date_to + 'T23:59:59')

        // Aggregate daily sales
        const dailySalesMap = new Map<string, { revenue: number; orders: number }>()
        const categoryMap = new Map<string, number>()
        const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
        const hourMap = new Map<number, { orders: number; revenue: number }>()
        const paymentMap = new Map<string, { count: number; amount: number }>()

        for (const sale of sales || []) {
          const date = sale.completed_at.split('T')[0]
          const hour = new Date(sale.completed_at).getHours()

          // Daily
          const dailyData = dailySalesMap.get(date) || { revenue: 0, orders: 0 }
          dailyData.revenue += sale.total
          dailyData.orders += 1
          dailySalesMap.set(date, dailyData)

          // Hourly
          const hourData = hourMap.get(hour) || { orders: 0, revenue: 0 }
          hourData.orders += 1
          hourData.revenue += sale.total
          hourMap.set(hour, hourData)

          // Categories and products
          for (const item of sale.sale_items || []) {
            const product = item.products as { id: string; name: string; category_id: string; categories: { name: string } }
            const categoryName = product?.categories?.name || 'Khac'
            const itemRevenue = item.quantity * item.unit_price

            // Category aggregation
            const categoryRevenue = categoryMap.get(categoryName) || 0
            categoryMap.set(categoryName, categoryRevenue + itemRevenue)

            // Product aggregation
            if (product?.id) {
              const productData = productMap.get(product.id) || { name: product.name, quantity: 0, revenue: 0 }
              productData.quantity += item.quantity
              productData.revenue += itemRevenue
              productMap.set(product.id, productData)
            }
          }

          // Payment methods
          for (const payment of sale.payments || []) {
            const methodData = paymentMap.get(payment.method) || { count: 0, amount: 0 }
            methodData.count += 1
            methodData.amount += payment.amount
            paymentMap.set(payment.method, methodData)
          }
        }

        const totalRevenue = Array.from(dailySalesMap.values()).reduce((sum, d) => sum + d.revenue, 0)

        // Get top 10 products sorted by revenue
        const topProducts = Array.from(productMap.entries())
          .map(([_, data]) => ({
            product_name: data.name,
            quantity_sold: data.quantity,
            revenue: data.revenue,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        return successResponse({
          period: { start: date_from, end: date_to },
          dailySales: Array.from(dailySalesMap.entries()).map(([date, data]) => ({
            date,
            revenue: data.revenue,
            orders: data.orders,
          })).sort((a, b) => a.date.localeCompare(b.date)),
          byCategory: Array.from(categoryMap.entries()).map(([category, revenue]) => ({
            category,
            revenue,
            percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
          })),
          topProducts,
          byHour: Array.from(hourMap.entries()).map(([hour, data]) => ({
            hour,
            orders: data.orders,
            revenue: data.revenue,
          })).sort((a, b) => a.hour - b.hour),
          byPaymentMethod: Array.from(paymentMap.entries()).map(([method, data]) => ({
            method,
            count: data.count,
            amount: data.amount,
            percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0,
          })),
          summary: {
            totalRevenue,
            totalOrders: sales?.length || 0,
          },
        })
      }

      case 'financial_analytics': {
        const { date_from, date_to } = body

        // Get sales
        const { data: sales } = await supabase
          .from('sales')
          .select('total, completed_at')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', date_from)
          .lte('completed_at', date_to + 'T23:59:59')

        // Get expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, expense_date, expense_categories(name)')
          .eq('store_id', store_id)
          .gte('expense_date', date_from)
          .lte('expense_date', date_to)

        // Aggregate by month
        const monthlyMap = new Map<string, { revenue: number; expenses: number }>()

        for (const sale of sales || []) {
          const month = sale.completed_at.substring(0, 7) // YYYY-MM
          const data = monthlyMap.get(month) || { revenue: 0, expenses: 0 }
          data.revenue += sale.total
          monthlyMap.set(month, data)
        }

        for (const expense of expenses || []) {
          const month = expense.expense_date.substring(0, 7)
          const data = monthlyMap.get(month) || { revenue: 0, expenses: 0 }
          data.expenses += expense.amount
          monthlyMap.set(month, data)
        }

        // Expense breakdown
        const expenseByCategory = new Map<string, number>()
        for (const expense of expenses || []) {
          const categoryName = (expense.expense_categories as { name: string })?.name || 'Khac'
          const current = expenseByCategory.get(categoryName) || 0
          expenseByCategory.set(categoryName, current + expense.amount)
        }

        const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0
        const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

        return successResponse({
          period: { start: date_from, end: date_to },
          summary: {
            totalRevenue,
            totalExpenses,
            grossProfit: totalRevenue - totalExpenses,
            profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
          },
          monthlyTrend: Array.from(monthlyMap.entries()).map(([month, data]) => ({
            month,
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
          })).sort((a, b) => a.month.localeCompare(b.month)),
          expenseBreakdown: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
          })),
        })
      }

      case 'revenue_book': {
        const { date_from, date_to } = body

        // Fetch store defaults for fallback
        const { data: store } = await supabase
          .from('stores')
          .select('default_vat_rate, pit_rate')
          .eq('id', store_id)
          .single()

        const defaultVat = store?.default_vat_rate ?? 1
        const defaultPit = store?.pit_rate ?? 0.5

        // Fetch sales with sale_items and products for tax categorization
        const { data: sales } = await supabase
          .from('sales')
          .select(`
            id,
            invoice_no,
            customer_name,
            total,
            completed_at,
            note,
            sale_items(
              quantity,
              unit_price,
              discount,
              product_id,
              products(
                name,
                vat_rate,
                pit_rate
              )
            )
          `)
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', date_from)
          .lte('completed_at', date_to + 'T23:59:59')
          .order('completed_at', { ascending: true })

        // Category mapping by (VAT, PIT) rates
        type CategoryKey = 'goods_distribution' | 'service_construction' | 'manufacturing_transport' | 'other_business'
        const categorizeByRates = (vatRate: number, pitRate: number): CategoryKey => {
          if (vatRate === 1 && pitRate === 0.5) return 'goods_distribution'
          if (vatRate === 5 && pitRate === 2) return 'service_construction'
          if (vatRate === 3 && pitRate === 1.5) return 'manufacturing_transport'
          if (vatRate === 2 && pitRate === 1) return 'other_business'
          return 'other_business' // fallback
        }

        const totals = {
          goods_distribution: 0,
          service_construction: 0,
          manufacturing_transport: 0,
          other_business: 0,
        }

        const entries = (sales || []).map((sale, idx) => {
          let goods = 0, service = 0, manufacturing = 0, other = 0

          for (const item of sale.sale_items || []) {
            const product = item.products as { vat_rate: number | null; pit_rate: number | null } | null
            const vatRate = product?.vat_rate ?? defaultVat
            const pitRate = product?.pit_rate ?? defaultPit
            const category = categorizeByRates(vatRate, pitRate)
            const itemBase = (item.unit_price * item.quantity) - (item.discount || 0)

            switch (category) {
              case 'goods_distribution': goods += itemBase; break
              case 'service_construction': service += itemBase; break
              case 'manufacturing_transport': manufacturing += itemBase; break
              case 'other_business': other += itemBase; break
            }
          }

          totals.goods_distribution += goods
          totals.service_construction += service
          totals.manufacturing_transport += manufacturing
          totals.other_business += other

          const record_date = sale.completed_at.split('T')[0]
          return {
            stt: idx + 1,
            record_date,
            voucher_no: sale.invoice_no || '',
            voucher_date: record_date,
            description: sale.customer_name ? `Bán hàng cho ${sale.customer_name}` : 'Bán hàng',
            goods_distribution: goods,
            service_construction: service,
            manufacturing_transport: manufacturing,
            other_business: other,
            note: sale.note || '',
          }
        })

        // Compute tax payable per category using statutory rates
        const tax_payable = {
          vat_goods: Math.round(totals.goods_distribution * 0.01),
          pit_goods: Math.round(totals.goods_distribution * 0.005),
          vat_service: Math.round(totals.service_construction * 0.05),
          pit_service: Math.round(totals.service_construction * 0.02),
          vat_manufacturing: Math.round(totals.manufacturing_transport * 0.03),
          pit_manufacturing: Math.round(totals.manufacturing_transport * 0.015),
          vat_other: Math.round(totals.other_business * 0.02),
          pit_other: Math.round(totals.other_business * 0.01),
          total_vat: 0,
          total_pit: 0,
        }
        tax_payable.total_vat = tax_payable.vat_goods + tax_payable.vat_service + tax_payable.vat_manufacturing + tax_payable.vat_other
        tax_payable.total_pit = tax_payable.pit_goods + tax_payable.pit_service + tax_payable.pit_manufacturing + tax_payable.pit_other

        const total_revenue = totals.goods_distribution + totals.service_construction + totals.manufacturing_transport + totals.other_business
        const year = new Date(date_from).getFullYear()

        return successResponse({
          period: { from: date_from, to: date_to },
          year,
          entries,
          totals: {
            ...totals,
            total_revenue,
          },
          tax_payable,
        })
      }

      case 'cash_book': {
        const { date_from, date_to } = body

        // Get opening balance from transactions before date_from
        const { data: openingTxns } = await supabase
          .from('cash_book')
          .select('debit, credit')
          .eq('store_id', store_id)
          .lt('transaction_date', date_from)

        const opening_balance = (openingTxns || []).reduce(
          (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
          0
        )

        const { data: transactions } = await supabase
          .from('cash_book')
          .select('*')
          .eq('store_id', store_id)
          .gte('transaction_date', date_from)
          .lte('transaction_date', date_to)
          .order('transaction_date')
          .order('created_at')

        let runningBalance = opening_balance
        const entries = (transactions || []).map((t, index) => {
          runningBalance += (t.debit || 0) - (t.credit || 0)
          const isIncome = t.debit > 0
          return {
            stt: index + 1,
            record_date: t.transaction_date,
            voucher_date: t.transaction_date,
            voucher_no_in: isIncome ? t.voucher_no || `PT${String(index + 1).padStart(3, '0')}` : '',
            voucher_no_out: !isIncome ? t.voucher_no || `PC${String(index + 1).padStart(3, '0')}` : '',
            description: t.description,
            debit: t.debit || 0,
            credit: t.credit || 0,
            balance: runningBalance,
            note: '',
            reference_type: t.reference_type,
          }
        })

        return successResponse({
          period: { from: date_from, to: date_to },
          opening_balance,
          entries,
          totals: {
            total_debit: entries.reduce((sum, e) => sum + e.debit, 0),
            total_credit: entries.reduce((sum, e) => sum + e.credit, 0),
            closing_balance: entries.length > 0 ? entries[entries.length - 1].balance : opening_balance,
          },
        })
      }

      case 'bank_book': {
        const { date_from, date_to, bank_account_id } = body

        if (!bank_account_id) {
          return errorResponse('bank_account_id is required', 400)
        }

        const { data: bankAccount } = await supabase
          .from('bank_accounts')
          .select('id, bank_name, account_number, account_name')
          .eq('id', bank_account_id)
          .eq('store_id', store_id)
          .single()

        if (!bankAccount) {
          return errorResponse('Bank account not found', 404)
        }

        const { data: openingTxns } = await supabase
          .from('bank_book')
          .select('debit, credit')
          .eq('store_id', store_id)
          .eq('bank_account_id', bank_account_id)
          .lt('transaction_date', date_from)

        const opening_balance = (openingTxns || []).reduce(
          (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
          0
        )

        const { data: transactions } = await supabase
          .from('bank_book')
          .select('*')
          .eq('store_id', store_id)
          .eq('bank_account_id', bank_account_id)
          .gte('transaction_date', date_from)
          .lte('transaction_date', date_to)
          .order('transaction_date')
          .order('created_at')

        let runningBalance = opening_balance
        const entries = (transactions || []).map((t, index) => {
          runningBalance = runningBalance + (t.debit || 0) - (t.credit || 0)
          return {
            stt: index + 1,
            record_date: t.transaction_date,
            voucher_no: t.voucher_no,
            voucher_date: t.transaction_date,
            description: t.description,
            debit: t.debit || 0,
            credit: t.credit || 0,
            balance: runningBalance,
            note: t.bank_ref,
          }
        })

        const total_debit = entries.reduce((sum, e) => sum + e.debit, 0)
        const total_credit = entries.reduce((sum, e) => sum + e.credit, 0)

        return successResponse({
          period: { from: date_from, to: date_to },
          bank_account: bankAccount,
          opening_balance,
          entries,
          totals: {
            total_debit,
            total_credit,
            closing_balance: opening_balance + total_debit - total_credit,
          },
        })
      }

      case 'expense_book': {
        const { date_from, date_to } = body

        const { data: expenses } = await supabase
          .from('expenses')
          .select('*, expense_categories(name, code)')
          .eq('store_id', store_id)
          .gte('expense_date', date_from)
          .lte('expense_date', date_to)
          .order('expense_date')

        const entries = (expenses || []).map((e, index) => ({
          stt: index + 1,
          date: e.expense_date,
          category: (e.expense_categories as { name: string; code: string })?.name || 'Khác',
          category_code: (e.expense_categories as { name: string; code: string })?.code || 'OTHER',
          description: e.description,
          amount: e.amount,
          vat_amount: e.vat_amount,
          payment_method: e.payment_method,
          invoice_no: e.invoice_no,
          supplier_name: e.supplier_name,
        }))

        // Group by category
        const byCategory = new Map<string, number>()
        for (const entry of entries) {
          const current = byCategory.get(entry.category) || 0
          byCategory.set(entry.category, current + entry.amount)
        }

        return successResponse({
          period: { from: date_from, to: date_to },
          entries,
          byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({
            category,
            amount,
          })),
          totals: {
            total_amount: entries.reduce((sum, e) => sum + e.amount, 0),
            total_vat: entries.reduce((sum, e) => sum + e.vat_amount, 0),
            expense_count: entries.length,
          },
        })
      }

      case 'inventory_book': {
        const { date_from, date_to } = body

        const { data: logs } = await supabase
          .from('inventory_logs')
          .select('*, products(name, sku, stock_quantity)')
          .eq('store_id', store_id)
          .gte('created_at', date_from)
          .lte('created_at', date_to + 'T23:59:59')
          .order('created_at')

        const entries = (logs || []).map((log, index) => {
          const isIn = ['import', 'return'].includes(log.type)
          return {
            stt: index + 1,
            date: log.created_at.split('T')[0],
            product_name: (log.products as { name: string })?.name,
            sku: (log.products as { sku: string })?.sku,
            movement_type: isIn ? 'in' : 'out',
            quantity: log.quantity,
            before_quantity: 0,
            after_quantity: (log.products as { stock_quantity: number })?.stock_quantity || 0,
            reason: log.note,
            reference_id: log.reference_id,
          }
        })

        return successResponse({
          period: { from: date_from, to: date_to },
          entries,
          summary: {
            total_in: entries.filter(e => e.movement_type === 'in').reduce((sum, e) => sum + e.quantity, 0),
            total_out: entries.filter(e => e.movement_type === 'out').reduce((sum, e) => sum + e.quantity, 0),
            total_movements: entries.length,
          },
        })
      }

      case 'inventory_detail_book': {
        const { date_from, date_to } = body

        // Get all inventory logs in the period
        const { data: logs } = await supabase
          .from('inventory_logs')
          .select('*, products(id, name, sku, unit, cost_price)')
          .eq('store_id', store_id)
          .gte('created_at', date_from)
          .lte('created_at', date_to + 'T23:59:59')
          .order('created_at')

        // Get opening stock for each product by summing all logs before date_from
        const { data: openingLogs } = await supabase
          .from('inventory_logs')
          .select('product_id, type, quantity')
          .eq('store_id', store_id)
          .lt('created_at', date_from)

        // Calculate opening stock per product
        const openingStockMap = new Map<string, number>()
        for (const log of openingLogs || []) {
          const current = openingStockMap.get(log.product_id) || 0
          const isIn = ['import', 'return'].includes(log.type)
          const qty = Math.abs(log.quantity)
          openingStockMap.set(log.product_id, current + (isIn ? qty : -qty))
        }

        // Group logs by product
        const productLogsMap = new Map<string, typeof logs>()
        for (const log of logs || []) {
          const productId = log.product_id
          if (!productLogsMap.has(productId)) {
            productLogsMap.set(productId, [])
          }
          productLogsMap.get(productId)!.push(log)
        }

        // Build per-product report
        const productReports = []

        for (const [productId, productLogs] of productLogsMap) {
          const firstLog = productLogs[0]
          const product = firstLog.products as { id: string; name: string; sku: string; unit: string; cost_price: number }
          const costPrice = product?.cost_price || 0
          const openingQty = openingStockMap.get(productId) || 0
          const openingAmount = openingQty * costPrice

          let runningQty = openingQty
          let runningAmount = openingAmount
          let totalInQty = 0
          let totalInAmount = 0
          let totalOutQty = 0
          let totalOutAmount = 0

          const entries = []

          // First entry: opening balance
          entries.push({
            stt: 1,
            documentNo: '',
            documentDate: date_from,
            description: 'Tồn đầu kỳ',
            inQty: null,
            inUnitPrice: null,
            inAmount: null,
            outQty: null,
            outUnitPrice: null,
            outAmount: null,
            balanceQty: openingQty,
            balanceAmount: openingAmount,
          })

          // Process each log
          for (const log of productLogs) {
            const isIn = ['import', 'return'].includes(log.type)
            const qty = Math.abs(log.quantity)
            const unitPrice = log.unit_cost || costPrice
            const amount = qty * unitPrice

            if (isIn) {
              runningQty += qty
              runningAmount += amount
              totalInQty += qty
              totalInAmount += amount
            } else {
              runningQty -= qty
              runningAmount -= amount
              totalOutQty += qty
              totalOutAmount += amount
            }

            const typeDescriptions: Record<string, string> = {
              import: 'Nhập hàng',
              export: 'Xuất hàng',
              sale: 'Bán hàng',
              return: 'Trả hàng',
              adjustment: 'Điều chỉnh',
            }

            entries.push({
              stt: entries.length + 1,
              documentNo: log.reference_id || '',
              documentDate: log.created_at.split('T')[0],
              description: log.note || typeDescriptions[log.type] || log.type,
              inQty: isIn ? qty : null,
              inUnitPrice: isIn ? unitPrice : null,
              inAmount: isIn ? amount : null,
              outQty: !isIn ? qty : null,
              outUnitPrice: !isIn ? unitPrice : null,
              outAmount: !isIn ? amount : null,
              balanceQty: runningQty,
              balanceAmount: runningAmount,
            })
          }

          productReports.push({
            productId: productId,
            productName: product?.name || 'Unknown',
            sku: product?.sku || '',
            unit: product?.unit || 'cái',
            entries,
            totals: {
              totalInQty,
              totalInAmount,
              totalOutQty,
              totalOutAmount,
              closingQty: runningQty,
              closingAmount: runningAmount,
            },
          })
        }

        return successResponse({
          period: { from: date_from, to: date_to },
          products: productReports,
        })
      }

      case 'tax_book': {
        const { year } = body

        const quarters = []

        for (let q = 1; q <= 4; q++) {
          const qStart = new Date(year, (q - 1) * 3, 1)
          const qEnd = new Date(year, q * 3, 0)

          const { data: sales } = await supabase
            .from('sales')
            .select('subtotal, vat_amount, total')
            .eq('store_id', store_id)
            .eq('status', 'completed')
            .gte('completed_at', qStart.toISOString())
            .lte('completed_at', qEnd.toISOString() + 'T23:59:59')

          const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0
          const vatCollected = sales?.reduce((sum, s) => sum + s.vat_amount, 0) || 0

          // Get store settings for PIT rate
          const { data: store } = await supabase
            .from('stores')
            .select('pit_rate')
            .eq('id', store_id)
            .single()

          const pitRate = (store?.pit_rate || 1) / 100
          const subtotal = sales?.reduce((sum, s) => sum + s.subtotal, 0) || 0
          const pitPayable = Math.round(subtotal * pitRate)

          quarters.push({
            quarter: q,
            period_start: qStart.toISOString().split('T')[0],
            period_end: qEnd.toISOString().split('T')[0],
            total_revenue: totalRevenue,
            vat_collected: vatCollected,
            vat_deductible: 0, // Would need purchase VAT tracking
            vat_payable: vatCollected,
            pit_payable: pitPayable,
            total_tax: vatCollected + pitPayable,
            status: qEnd < new Date() ? 'pending' : 'not_started',
          })
        }

        return successResponse({
          year,
          quarters,
          summary: {
            total_revenue: quarters.reduce((sum, q) => sum + q.total_revenue, 0),
            total_vat: quarters.reduce((sum, q) => sum + q.vat_payable, 0),
            total_pit: quarters.reduce((sum, q) => sum + q.pit_payable, 0),
            total_tax: quarters.reduce((sum, q) => sum + q.total_tax, 0),
          },
        })
      }

      case 'salary_book': {
        const { month, year } = body

        const { data: payrolls } = await supabase
          .from('payroll')
          .select('*, employees(name, position)')
          .eq('store_id', store_id)
          .eq('period_month', month)
          .eq('period_year', year)
          .order('employees(name)')

        const entries = (payrolls || []).map((p, index) => ({
          stt: index + 1,
          name: (p.employees as { name: string })?.name,
          position: (p.employees as { position: string })?.position,
          working_days: `${p.working_days}/${p.standard_days}`,
          base_salary: p.base_salary,
          allowances: p.allowances,
          gross_salary: p.gross_salary,
          social_insurance: p.social_insurance,
          health_insurance: p.health_insurance,
          unemployment_insurance: p.unemployment_insurance,
          pit: p.pit,
          net_salary: p.net_salary,
          status: p.status,
        }))

        return successResponse({
          period: `Tháng ${month}/${year}`,
          entries,
          totals: {
            total_base_salary: entries.reduce((sum, e) => sum + e.base_salary, 0),
            total_allowances: entries.reduce((sum, e) => sum + e.allowances, 0),
            total_gross: entries.reduce((sum, e) => sum + e.gross_salary, 0),
            total_insurance: entries.reduce((sum, e) => sum + e.social_insurance + e.health_insurance + e.unemployment_insurance, 0),
            total_pit: entries.reduce((sum, e) => sum + e.pit, 0),
            total_net: entries.reduce((sum, e) => sum + e.net_salary, 0),
            employee_count: entries.length,
          },
        })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Reports function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
