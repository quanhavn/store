# 📊 PHASE 7: REPORTS & ANALYTICS
## Thời gian: 2 tuần (10 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Dashboard tổng quan
- [ ] 7 sổ sách kế toán hoàn chỉnh
- [ ] Export Excel/PDF
- [ ] Biểu đồ thống kê
- [ ] So sánh kỳ này vs kỳ trước

---

## 📋 7 SỔ SÁCH KẾ TOÁN

| STT | Tên sổ | Mô tả | Phase đã làm |
|-----|--------|-------|--------------|
| 1 | Sổ doanh thu | Doanh thu từ bán hàng | Phase 5 |
| 2 | Sổ tiền mặt | Thu chi tiền mặt | Phase 4 |
| 3 | Sổ tiền gửi | Thu chi ngân hàng | Phase 4 |
| 4 | Sổ chi phí | Chi phí theo danh mục | Phase 4 |
| 5 | Sổ tồn kho | Xuất nhập tồn | Phase 3 |
| 6 | Sổ nghĩa vụ thuế | VAT, TNCN theo quý | Phase 5 |
| 7 | Sổ lương | Lương nhân viên | Phase 6 |

---

## 📅 TUẦN 1: DASHBOARD & ANALYTICS

### Ngày 1-2: Dashboard Overview

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.1.1 | Function: reports/dashboard-summary | 3h | Tổng hợp số liệu | Phase 6 |
| 7.1.2 | Today's sales widget | 2h | Doanh thu hôm nay | 7.1.1 |
| 7.1.3 | This month summary | 2h | DT, CP, LN tháng | 7.1.1 |
| 7.1.4 | Low stock alert widget | 1h | SP sắp hết | Phase 3 |
| 7.1.5 | Tax reminder widget | 1h | Nhắc kê khai | Phase 5 |
| 7.1.6 | Recent sales widget | 1h | 5 đơn gần nhất | 7.1.1 |

**Dashboard Summary Function:**
```typescript
// supabase/functions/reports/dashboard-summary/index.ts
interface DashboardSummary {
  today: {
    revenue: number
    orders: number
    avgOrderValue: number
  }
  thisMonth: {
    revenue: number
    expenses: number
    profit: number
    orders: number
  }
  comparison: {
    revenueChange: number // % vs last month
    ordersChange: number
    profitChange: number
  }
  alerts: {
    lowStockCount: number
    pendingTax: boolean
    taxDeadlineDays: number
  }
  recentSales: Sale[]
}
```

**Dashboard Layout (Mobile):**
```
┌─────────────────────────────┐
│ 🏪 Tên Cửa Hàng             │
├─────────────────────────────┤
│ HÔM NAY                     │
│ 💰 3,500,000đ   📦 15 đơn   │
├─────────────────────────────┤
│ THÁNG NÀY                   │
│ Doanh thu: 85,000,000đ ↑12% │
│ Chi phí:   40,000,000đ      │
│ Lợi nhuận: 45,000,000đ ↑8%  │
├─────────────────────────────┤
│ ⚠️ 5 SP sắp hết hàng        │
│ 📋 Còn 15 ngày kê khai thuế │
├─────────────────────────────┤
│ ĐƠN HÀNG GẦN ĐÂY            │
│ • HD001 - 350,000đ - 14:30  │
│ • HD002 - 150,000đ - 13:45  │
│ • HD003 - 500,000đ - 12:20  │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Real-time data
- [ ] Pull to refresh
- [ ] Comparison với tháng trước
- [ ] Quick navigation từ widgets

---

### Ngày 3-4: Sales Analytics

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.2.1 | Function: reports/sales-analytics | 3h | Phân tích bán hàng | 7.1.x |
| 7.2.2 | Daily sales chart | 2h | Line chart 30 ngày | 7.2.1 |
| 7.2.3 | Sales by category | 2h | Pie chart | 7.2.1 |
| 7.2.4 | Top selling products | 2h | Bar chart | 7.2.1 |
| 7.2.5 | Sales by hour | 1h | Heatmap giờ cao điểm | 7.2.1 |
| 7.2.6 | Sales by payment method | 1h | Pie chart | 7.2.1 |

**Sales Analytics Data:**
```typescript
interface SalesAnalytics {
  period: { start: Date; end: Date }
  
  dailySales: {
    date: string
    revenue: number
    orders: number
  }[]
  
  byCategory: {
    category: string
    revenue: number
    percentage: number
  }[]
  
  topProducts: {
    product_id: string
    product_name: string
    quantity_sold: number
    revenue: number
  }[]
  
  byHour: {
    hour: number
    orders: number
    revenue: number
  }[]
  
  byPaymentMethod: {
    method: string
    count: number
    amount: number
    percentage: number
  }[]
}
```

**Charts (using recharts):**
```tsx
import { LineChart, PieChart, BarChart, ResponsiveContainer } from 'recharts'

// Daily sales trend
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={dailySales}>
    <XAxis dataKey="date" />
    <YAxis />
    <Line type="monotone" dataKey="revenue" stroke="#3ecf8e" />
  </LineChart>
</ResponsiveContainer>
```

**Checklist:**
- [ ] Chart responsive mobile
- [ ] Swipe giữa các charts
- [ ] Date range selector
- [ ] Export chart as image

---

### Ngày 5: Financial Analytics

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.3.1 | Function: reports/financial-analytics | 3h | P&L summary | 7.2.x |
| 7.3.2 | Revenue vs Expense chart | 2h | Dual line chart | 7.3.1 |
| 7.3.3 | Expense breakdown chart | 1h | By category | 7.3.1 |
| 7.3.4 | Cash flow chart | 2h | In/Out flow | 7.3.1 |

**Financial Analytics:**
```typescript
interface FinancialAnalytics {
  period: { start: Date; end: Date }
  
  summary: {
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
    netProfit: number
    profitMargin: number // %
  }
  
  monthlyTrend: {
    month: string
    revenue: number
    expenses: number
    profit: number
  }[]
  
  expenseBreakdown: {
    category: string
    amount: number
    percentage: number
  }[]
  
  cashFlow: {
    date: string
    cashIn: number
    cashOut: number
    balance: number
  }[]
}
```

**Checklist:**
- [ ] P&L summary card
- [ ] Trend comparison
- [ ] Expense breakdown
- [ ] Cash flow visualization

---

## 📅 TUẦN 2: REPORTS HUB & EXPORT

### Ngày 6: Reports Hub

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.4.1 | Reports hub page | 2h | List 7 sổ sách | 7.3.x |
| 7.4.2 | Report card component | 1h | Name, icon, description | 7.4.1 |
| 7.4.3 | Quick date presets | 1h | Hôm nay, tuần, tháng, quý | 7.4.1 |
| 7.4.4 | Custom date range | 2h | Date picker | 7.4.3 |
| 7.4.5 | Report preview | 2h | Preview trước export | 7.4.1 |

**Reports Hub UI:**
```
┌─────────────────────────────┐
│ 📊 Báo cáo & Sổ sách        │
├─────────────────────────────┤
│ Chọn kỳ báo cáo:            │
│ [Hôm nay][Tuần][Tháng][Quý] │
│ [Tùy chọn...]               │
├─────────────────────────────┤
│ 📈 Sổ doanh thu             │
│    Doanh thu bán hàng       │
│    [Xem] [Excel] [PDF]      │
├─────────────────────────────┤
│ 💵 Sổ tiền mặt              │
│    Thu chi tiền mặt         │
│    [Xem] [Excel] [PDF]      │
├─────────────────────────────┤
│ 🏦 Sổ tiền gửi              │
│    Thu chi ngân hàng        │
│    [Xem] [Excel] [PDF]      │
├─────────────────────────────┤
│ 📋 Sổ chi phí               │
│ 📦 Sổ tồn kho               │
│ 🧾 Sổ nghĩa vụ thuế         │
│ 👥 Sổ lương                 │
└─────────────────────────────┘
```

**Checklist:**
- [ ] 7 reports accessible
- [ ] Quick date presets
- [ ] Custom date range
- [ ] Preview before export

---

### Ngày 7-8: Export Functionality

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.5.1 | Excel export utility | 3h | Using xlsx library | 7.4.x |
| 7.5.2 | PDF export utility | 3h | Using jspdf | 7.4.x |
| 7.5.3 | Report header/footer | 1h | Store info, date | 7.5.1 |
| 7.5.4 | Styling for exports | 2h | Borders, fonts | 7.5.1 |
| 7.5.5 | Download/Share options | 2h | Mobile share sheet | 7.5.2 |

**Excel Export:**
```typescript
// lib/reports/export-excel.ts
import * as XLSX from 'xlsx'

interface ExportOptions {
  filename: string
  sheetName: string
  headers: string[]
  data: any[][]
  totals?: any[]
  metadata?: {
    storeName: string
    period: string
    generatedAt: string
  }
}

export const exportToExcel = (options: ExportOptions) => {
  const workbook = XLSX.utils.book_new()
  
  // Add metadata rows
  const metadataRows = [
    [options.metadata?.storeName || ''],
    [options.sheetName],
    [`Kỳ: ${options.metadata?.period || ''}`],
    [`Ngày xuất: ${options.metadata?.generatedAt || new Date().toLocaleDateString('vi-VN')}`],
    [], // Empty row
    options.headers,
  ]
  
  // Combine all data
  const allData = [...metadataRows, ...options.data]
  
  // Add totals if provided
  if (options.totals) {
    allData.push([]) // Empty row
    allData.push(options.totals)
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(allData)
  
  // Set column widths
  const colWidths = options.headers.map((h, i) => ({
    wch: Math.max(h.length, 15)
  }))
  worksheet['!cols'] = colWidths
  
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName)
  XLSX.writeFile(workbook, `${options.filename}.xlsx`)
}
```

**PDF Export:**
```typescript
// lib/reports/export-pdf.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFExportOptions {
  filename: string
  title: string
  period: string
  storeName: string
  headers: string[]
  data: any[][]
  totals?: any[]
}

export const exportToPDF = (options: PDFExportOptions) => {
  const doc = new jsPDF()
  
  // Add Vietnamese font (if needed)
  // doc.addFont('path/to/vietnamese-font.ttf', 'Vietnamese', 'normal')
  
  // Header
  doc.setFontSize(16)
  doc.text(options.storeName, 105, 15, { align: 'center' })
  
  doc.setFontSize(14)
  doc.text(options.title, 105, 25, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`Kỳ: ${options.period}`, 105, 32, { align: 'center' })
  
  // Table
  autoTable(doc, {
    head: [options.headers],
    body: options.data,
    foot: options.totals ? [options.totals] : undefined,
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [62, 207, 142] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Trang ${i}/${pageCount} - Xuất ngày ${new Date().toLocaleDateString('vi-VN')}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  doc.save(`${options.filename}.pdf`)
}
```

**Checklist:**
- [ ] Excel format đúng
- [ ] PDF readable
- [ ] Vietnamese characters work
- [ ] Share sheet on mobile

---

### Ngày 9: Report Templates

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.6.1 | Revenue book template | 1h | Theo chuẩn kế toán | 7.5.x |
| 7.6.2 | Cash book template | 1h | Running balance | 7.5.x |
| 7.6.3 | Bank book template | 1h | Per account | 7.5.x |
| 7.6.4 | Expense book template | 1h | By category | 7.5.x |
| 7.6.5 | Inventory book template | 1h | Opening/Closing | 7.5.x |
| 7.6.6 | Tax book template | 1h | Quarterly format | 7.5.x |
| 7.6.7 | Salary book template | 1h | All deductions | 7.5.x |

**Report Templates:**
```typescript
// Each report has a standard format
interface ReportTemplate {
  title: string
  headers: string[]
  columns: {
    key: string
    label: string
    width: number
    format?: 'number' | 'currency' | 'date' | 'percent'
    align?: 'left' | 'right' | 'center'
  }[]
  showTotals: boolean
  totalsRow?: string[]
}

const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  revenue: {
    title: 'SỔ DOANH THU',
    headers: ['STT', 'Ngày', 'Số HĐ', 'Khách hàng', 'Diễn giải', 'DT chưa VAT', 'VAT', 'Tổng DT', 'Hình thức'],
    columns: [
      { key: 'stt', label: 'STT', width: 5, align: 'center' },
      { key: 'date', label: 'Ngày', width: 12, format: 'date' },
      { key: 'invoice_no', label: 'Số HĐ', width: 15 },
      { key: 'customer', label: 'Khách hàng', width: 20 },
      { key: 'description', label: 'Diễn giải', width: 15 },
      { key: 'subtotal', label: 'DT chưa VAT', width: 15, format: 'currency', align: 'right' },
      { key: 'vat', label: 'VAT', width: 12, format: 'currency', align: 'right' },
      { key: 'total', label: 'Tổng DT', width: 15, format: 'currency', align: 'right' },
      { key: 'payment', label: 'Hình thức', width: 10, align: 'center' },
    ],
    showTotals: true,
  },
  cash: {
    title: 'SỔ TIỀN MẶT',
    headers: ['Ngày', 'Số CT', 'Diễn giải', 'Thu (Nợ)', 'Chi (Có)', 'Tồn quỹ'],
    // ...
  },
  // ... other templates
}
```

**Checklist:**
- [ ] Đúng format kế toán VN
- [ ] Cột số tiền align right
- [ ] Tổng cộng cuối bảng
- [ ] Header store info

---

### Ngày 10: Testing & Polish

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 7.7.1 | Test dashboard data | 1h | Accuracy check | 7.1.x |
| 7.7.2 | Test all 7 reports | 2h | Export correctly | 7.6.x |
| 7.7.3 | Mobile chart testing | 1h | Responsive | 7.2.x |
| 7.7.4 | Performance optimization | 2h | Large data sets | - |
| 7.7.5 | Bug fixes | 2h | Fix issues | - |

**Performance Optimization:**
```typescript
// Pagination for large reports
const REPORT_PAGE_SIZE = 100

// Lazy loading for charts
const LazyChart = dynamic(() => import('./SalesChart'), {
  loading: () => <Skeleton className="h-[200px]" />,
  ssr: false
})

// Memoization
const MemoizedReportTable = memo(ReportTable)
```

**Checklist:**
- [ ] Dashboard loads < 2s
- [ ] Reports với 1000+ rows work
- [ ] Charts render smoothly
- [ ] Export không timeout

---

## 📊 TỔNG KẾT PHASE 7

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Dashboard overview | ⬜ |
| Sales analytics | ⬜ |
| Financial analytics | ⬜ |
| Reports hub | ⬜ |
| Excel export | ⬜ |
| PDF export | ⬜ |
| 7 report templates | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| reports/dashboard-summary | POST | Tổng quan dashboard |
| reports/sales-analytics | POST | Phân tích bán hàng |
| reports/financial-analytics | POST | Phân tích tài chính |

### UI Components Created

```
components/reports/
├── DashboardSummary.tsx
├── TodaySalesWidget.tsx
├── MonthSummaryWidget.tsx
├── AlertsWidget.tsx
├── RecentSalesWidget.tsx
├── SalesChart.tsx
├── CategoryPieChart.tsx
├── TopProductsChart.tsx
├── HourlyHeatmap.tsx
├── RevenueExpenseChart.tsx
├── CashFlowChart.tsx
├── ReportsHub.tsx
├── ReportCard.tsx
├── DateRangePicker.tsx
├── ReportPreview.tsx
├── ReportTable.tsx
├── ExportButton.tsx
└── ShareSheet.tsx
```

### Libraries Added

```json
{
  "dependencies": {
    "recharts": "^2.x",
    "xlsx": "^0.18.x",
    "jspdf": "^2.x",
    "jspdf-autotable": "^3.x"
  }
}
```

---

*Phase 7 Completion Target: 2 weeks*
