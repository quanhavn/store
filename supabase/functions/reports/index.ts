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
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

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

        // Tax deadline (next quarter)
        const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
        const taxDeadlines: Record<number, { month: number; day: number }> = {
          1: { month: 3, day: 30 }, // Q1 -> April 30
          2: { month: 6, day: 30 }, // Q2 -> July 30
          3: { month: 9, day: 30 }, // Q3 -> October 30
          4: { month: 0, day: 30 }, // Q4 -> January 30 next year
        }

        const deadline = taxDeadlines[currentQuarter]
        const taxDeadlineYear = currentQuarter === 4 ? now.getFullYear() + 1 : now.getFullYear()
        const taxDeadlineDate = new Date(taxDeadlineYear, deadline.month, deadline.day)
        const taxDeadlineDays = Math.ceil((taxDeadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

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
          .select('id, total, completed_at, sale_items(quantity, product_id, products(category_id, categories(name))), payments(method, amount)')
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
            const categoryName = (item.products as { category_id: string; categories: { name: string } })?.categories?.name || 'Khac'
            const categoryRevenue = categoryMap.get(categoryName) || 0
            categoryMap.set(categoryName, categoryRevenue + (item.quantity * (sale.total / (sale.sale_items?.length || 1))))
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

        const { data: sales } = await supabase
          .from('sales')
          .select('id, invoice_no, customer_name, subtotal, vat_amount, total, completed_at, payments(method)')
          .eq('store_id', store_id)
          .eq('status', 'completed')
          .gte('completed_at', date_from)
          .lte('completed_at', date_to + 'T23:59:59')
          .order('completed_at')

        const entries = (sales || []).map((sale, index) => ({
          stt: index + 1,
          date: sale.completed_at.split('T')[0],
          invoice_no: sale.invoice_no,
          customer_name: sale.customer_name || 'Khach le',
          subtotal: sale.subtotal,
          vat_amount: sale.vat_amount,
          total: sale.total,
          payment_method: sale.payments?.[0]?.method || 'cash',
        }))

        return successResponse({
          period: { from: date_from, to: date_to },
          entries,
          totals: {
            total_subtotal: entries.reduce((sum, e) => sum + e.subtotal, 0),
            total_vat: entries.reduce((sum, e) => sum + e.vat_amount, 0),
            total_revenue: entries.reduce((sum, e) => sum + e.total, 0),
            sale_count: entries.length,
          },
        })
      }

      case 'cash_book': {
        const { date_from, date_to } = body

        const { data: transactions } = await supabase
          .from('cash_book')
          .select('*')
          .eq('store_id', store_id)
          .gte('transaction_date', date_from)
          .lte('transaction_date', date_to)
          .order('created_at')

        const entries = (transactions || []).map((t, index) => ({
          stt: index + 1,
          date: t.transaction_date,
          description: t.description,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance,
          reference_type: t.reference_type,
        }))

        return successResponse({
          period: { from: date_from, to: date_to },
          entries,
          totals: {
            total_debit: entries.reduce((sum, e) => sum + e.debit, 0),
            total_credit: entries.reduce((sum, e) => sum + e.credit, 0),
            closing_balance: entries.length > 0 ? entries[entries.length - 1].balance : 0,
          },
        })
      }

      case 'bank_book': {
        const { date_from, date_to, bank_account_id } = body

        let query = supabase
          .from('bank_book')
          .select('*, bank_accounts(bank_name, account_number)')
          .eq('store_id', store_id)
          .gte('transaction_date', date_from)
          .lte('transaction_date', date_to)
          .order('created_at')

        if (bank_account_id) {
          query = query.eq('bank_account_id', bank_account_id)
        }

        const { data: transactions } = await query

        const entries = (transactions || []).map((t, index) => ({
          stt: index + 1,
          date: t.transaction_date,
          bank_name: (t.bank_accounts as { bank_name: string })?.bank_name,
          account_number: (t.bank_accounts as { account_number: string })?.account_number,
          description: t.description,
          debit: t.debit,
          credit: t.credit,
          bank_ref: t.bank_ref,
        }))

        return successResponse({
          period: { from: date_from, to: date_to },
          entries,
          totals: {
            total_debit: entries.reduce((sum, e) => sum + e.debit, 0),
            total_credit: entries.reduce((sum, e) => sum + e.credit, 0),
          },
        })
      }

      case 'expense_book': {
        const { date_from, date_to } = body

        const { data: expenses } = await supabase
          .from('expenses')
          .select('*, expense_categories(name)')
          .eq('store_id', store_id)
          .gte('expense_date', date_from)
          .lte('expense_date', date_to)
          .order('expense_date')

        const entries = (expenses || []).map((e, index) => ({
          stt: index + 1,
          date: e.expense_date,
          category: (e.expense_categories as { name: string })?.name || 'Khac',
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

        const { data: movements } = await supabase
          .from('inventory_movements')
          .select('*, products(name, sku)')
          .eq('store_id', store_id)
          .gte('created_at', date_from)
          .lte('created_at', date_to + 'T23:59:59')
          .order('created_at')

        const entries = (movements || []).map((m, index) => ({
          stt: index + 1,
          date: m.created_at.split('T')[0],
          product_name: (m.products as { name: string })?.name,
          sku: (m.products as { sku: string })?.sku,
          movement_type: m.movement_type,
          quantity: m.quantity,
          before_quantity: m.before_quantity,
          after_quantity: m.after_quantity,
          reason: m.reason,
          reference_id: m.reference_id,
        }))

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
          period: `Thang ${month}/${year}`,
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
