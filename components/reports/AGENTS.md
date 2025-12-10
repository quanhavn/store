# Reports Component Guidelines

## Vietnamese Accounting Books (Sổ sách kế toán)

This folder contains components for Vietnamese tax-compliant accounting books following the Vietnam Tax 2026 regulations.

### Template Standards

All accounting book reports must follow the official Vietnamese tax templates:
- **Sổ tiền gửi ngân hàng**: Mẫu số S7-HKD
- **Sổ chi tiết vật liệu**: Mẫu số S4-HKD
- **Sổ tiền mặt**: Mẫu số S5-HKD
- **Sổ doanh thu**: Mẫu số S1-HKD

### PDF Export Rules

1. **Always use Vietnamese fonts** - Load and use Roboto fonts for proper Vietnamese character display:
   ```typescript
   import { loadVietnameseFonts, addVietnameseFonts } from '@/lib/reports/pdf-fonts'
   
   await loadVietnameseFonts()
   const hasVietnameseFont = addVietnameseFonts(doc)
   const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'
   ```

2. **Never use normalizeVietnamese()** for bank book or similar reports - display Vietnamese text exactly as written

3. **Include signature section**:
   - Left: "Người lập biểu" + "(Ký, họ tên)"
   - Right: "Ngày ... tháng ... năm ..." + "Người đại diện HKD/Cá nhân KD" + "(Ký, họ tên, đóng dấu)"

### Excel Export Rules

1. **Use merged cells** for multi-row headers with `worksheet['!merges']`
2. **Include signature section**:
   - Left: "Người lập biểu" + "(Ký, họ tên)"
   - Right: "Ngày ... tháng ... năm ..." + "Người đại diện HKD/Cá nhân KD" + "(Ký, họ tên, đóng dấu)"

### Component Structure

Each book component should have:
1. **Account/filter selector** (if applicable)
2. **Date range picker**
3. **Refresh button**
4. **Export buttons** (Excel, PDF)
5. **Table with proper header structure**
6. **Summary footer** using `Table.Summary`

### Naming Conventions

- Component: `{BookName}Book.tsx` (e.g., `BankDepositBook.tsx`)
- PDF export: `export{BookName}PDF` (e.g., `exportBankBookPDF`)
- Excel export: `export{BookName}` (e.g., `exportBankBook`)

### Translation Keys

Store translations under `reports.{bookName}.*`:
```json
{
  "reports": {
    "bankBook": {
      "title": "SỔ TIỀN GỬI NGÂN HÀNG",
      "openingBalance": "Số dư đầu kỳ",
      "closingBalance": "Số dư cuối kỳ",
      ...
    }
  }
}
```

### Currency Formatting

- Use INTEGER for VND amounts (no decimals)
- Format with thousand separators: `123,456,789`
- Use `-` for zero values in PDF/Excel

---

## CRITICAL RULES FOR NEW REPORTS

### 1. Vietnamese Font in PDF - REQUIRED

**NEVER use `normalizeVietnamese()`** - it strips diacritical marks.

**ALWAYS load Vietnamese fonts:**
```typescript
export async function exportXxxPDF(data, storeInfo): Promise<void> {
  const { loadVietnameseFonts, addVietnameseFonts } = await import('./pdf-fonts')
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  await loadVietnameseFonts()
  
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  
  const hasVietnameseFont = addVietnameseFonts(doc)
  const fontName = hasVietnameseFont ? 'Roboto' : 'helvetica'
  
  // Use fontName for all text
  doc.setFont(fontName, 'bold')
  doc.text('SỔ TIỀN GỬI NGÂN HÀNG', ...)
  
  // Use fontName in autoTable styles
  autoTable(doc, {
    styles: { font: fontName, ... },
    ...
  })
}
```

### 2. Integration to Reports Page

When creating a new report book:

1. **Add to `components/reports/index.ts`:**
   ```typescript
   export { NewBook } from './NewBook'
   ```

2. **Update `app/(main)/reports/page.tsx`:**
   ```typescript
   import { NewBook } from '@/components/reports'
   
   // Add state for drawer
   const [newBookOpen, setNewBookOpen] = useState(false)
   
   // Handle in handleViewReport
   const handleViewReport = (reportType, dateFrom, dateTo) => {
     if (reportType === 'new_book') {
       setNewBookOpen(true)
     } else {
       // existing logic
     }
   }
   
   // Add Drawer
   <Drawer
     open={newBookOpen}
     onClose={() => setNewBookOpen(false)}
     title={t('newBook.title')}
     placement="bottom"
     height="95%"
     destroyOnClose
   >
     <NewBook storeInfo={storeInfo} />
   </Drawer>
   ```

3. **Add to `ReportsHub.tsx` REPORTS array** (if applicable)

### 3. Export Function Signature

- **PDF exports must be `async`** (returns `Promise<void>`)
- **Excel exports can be sync** (returns `void`)

```typescript
// PDF - async
export async function exportNewBookPDF(data: NewBookReport, storeInfo: StoreInfo): Promise<void>

// Excel - sync  
export function exportNewBook(data: NewBookReport, storeName: string, period: string): void
```

### 4. Report Type Interface

Update `lib/supabase/functions.ts` with new report type:
```typescript
export interface NewBookReport {
  period: { from: string; to: string }
  opening_balance: number  // for balance-tracking books
  entries: Array<{
    stt: number
    // ... fields matching template columns
  }>
  totals: {
    total_debit: number
    total_credit: number
    closing_balance: number
  }
}
```

### 5. Edge Function

Update `supabase/functions/reports/index.ts`:
- Add request interface
- Add case handler
- Calculate opening balance from transactions before `date_from`
- Calculate running balance per entry
