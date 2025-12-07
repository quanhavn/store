# Viettel E-Invoice API Integration Plan

## Overview
Integration with Viettel SINVOICE Web Service v2.35 for Vietnam Tax 2026 compliance.

## Base URLs
- **Production**: `https://api-vinvoice.viettel.vn/services/einvoiceapplication/api/`
- **Sandbox**: Use Viettel sandbox credentials

---

## Phase 1: Authentication & Setup

### 1.1 Authentication
- **Method**: Username/Password → Token-based
- **Credentials Required**:
  - `username`: Viettel account username
  - `password`: Viettel account password
  - `supplierTaxCode`: Business MST (10 or 13 digits)

### 1.2 Environment Variables
```env
VIETTEL_INVOICE_BASE_URL=https://api-vinvoice.viettel.vn/services/einvoiceapplication/api
VIETTEL_INVOICE_USERNAME=
VIETTEL_INVOICE_PASSWORD=
VIETTEL_SUPPLIER_TAX_CODE=
VIETTEL_INVOICE_TEMPLATE=    # Template code
VIETTEL_INVOICE_SERIAL=      # Serial number
```

---

## Phase 2: Core API Endpoints

### 2.1 Invoice Operations

| Operation | Endpoint | Method | Description |
|-----------|----------|--------|-------------|
| **Create Invoice** | `InvoiceAPI/InvoiceWS/createInvoice/{taxCode}` | POST | Issue new invoice (HSM signing) |
| **Create Draft** | `InvoiceAPI/InvoiceWS/createInvoiceDraft/{taxCode}` | POST | Create draft invoice |
| **Get Invoice** | `InvoiceAPI/InvoiceWS/getInvoiceRepresentationFile` | POST | Download invoice PDF/XML |
| **Cancel Invoice** | `InvoiceAPI/InvoiceWS/cancelTransactionInvoice` | POST | Cancel issued invoice |
| **Adjust Invoice** | `InvoiceAPI/InvoiceWS/createInvoice/{taxCode}` | POST | Issue adjustment invoice |
| **Replace Invoice** | `InvoiceAPI/InvoiceWS/createInvoice/{taxCode}` | POST | Issue replacement invoice |

### 2.2 Lookup Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| **Search Invoice** | `InvoiceAPI/InvoiceUtilsWS/getInvoiceInfo` | POST |
| **Check Status** | `InvoiceAPI/InvoiceUtilsWS/checkInvoiceStatus` | POST |
| **Get Invoice List** | `InvoiceAPI/InvoiceUtilsWS/searchInvoice` | POST |

---

## Phase 3: Data Structures

### 3.1 Invoice Request Payload
```typescript
interface VNPTInvoiceRequest {
  generalInvoiceInfo: {
    invoiceType: string;           // "1" = VAT invoice
    templateCode: string;          // e.g., "1/001"
    invoiceSeries: string;         // e.g., "AA/22E"
    currencyCode: string;          // "VND"
    invoiceIssuedDate: string;     // "dd/MM/yyyy"
    paymentMethodName: string;     // "TM" (cash) / "CK" (transfer)
    adjustmentType?: string;       // "1" = info adjust, "2" = amount adjust
    originalInvoiceId?: string;    // For adjustment/replacement
  };
  
  buyerInfo: {
    buyerName: string;
    buyerLegalName?: string;
    buyerTaxCode?: string;         // Optional for B2C
    buyerAddressLine: string;
    buyerEmail?: string;
    buyerPhoneNumber?: string;
  };
  
  sellerInfo: {
    sellerLegalName: string;
    sellerTaxCode: string;
    sellerAddressLine: string;
    sellerPhoneNumber: string;
    sellerEmail: string;
    sellerBankName?: string;
    sellerBankAccount?: string;
  };
  
  itemInfo: VNPTInvoiceItem[];
  
  summarizeInfo: {
    sumOfTotalLineAmountWithoutTax: number;
    totalAmountWithoutTax: number;
    totalTaxAmount: number;
    totalAmountWithTax: number;
    totalAmountWithTaxInWords: string;  // Vietnamese words
    discountAmount?: number;
  };
  
  taxBreakdowns: VNPTTaxBreakdown[];
}

interface VNPTInvoiceItem {
  lineNumber: number;
  selection: number;              // 1 = product, 2 = discount, 3 = note
  itemCode?: string;
  itemName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;          // 0, 8, 10
  taxAmount: number;
  itemTotalAmountWithoutTax: number;
  itemTotalAmountWithTax: number;
}

interface VNPTTaxBreakdown {
  taxPercentage: number;
  taxableAmount: number;
  taxAmount: number;
}
```

### 3.2 Invoice Response
```typescript
interface ViettelInvoiceResponse {
  errorCode: string;              // "0" = success
  description: string;
  result: {
    invoiceNo: string;            // e.g., "00000123"
    transactionUuid: string;
    reservationCode: string;      // Mã tra cứu
    supplierTaxCode: string;
  };
}
```

---

## Phase 4: Supabase Edge Functions Architecture

### 4.1 Edge Functions Structure
```
supabase/functions/
├── invoice-create/           # Create and sign invoice
├── invoice-draft/            # Create draft invoice
├── invoice-cancel/           # Cancel invoice
├── invoice-adjust/           # Issue adjustment
├── invoice-replace/          # Issue replacement
├── invoice-download/         # Get PDF/XML
├── invoice-lookup/           # Search invoices
└── _shared/
    ├── viettel-client.ts     # Viettel API client
    ├── auth.ts               # Token management
    └── number-to-words.ts    # Vietnamese number converter
```

### 4.2 Database Schema Additions
```sql
-- Invoice tracking table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  sale_id UUID REFERENCES sales(id),
  
  -- VNPT tracking
  vnpt_transaction_uuid TEXT,
  invoice_no TEXT,
  invoice_series TEXT,
  reservation_code TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, issued, cancelled, adjusted
  vnpt_sync_status TEXT DEFAULT 'pending', -- pending, synced, error
  vnpt_error_message TEXT,
  
  -- Invoice data (cached)
  buyer_name TEXT,
  buyer_tax_code TEXT,
  total_amount INTEGER,
  vat_amount INTEGER,
  
  -- Timestamps
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline queue for sync
CREATE TABLE invoice_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  action TEXT, -- create, cancel, adjust
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 5: Offline Handling

### 5.1 Dexie.js Schema
```typescript
// lib/offline/invoice-db.ts
invoiceDrafts: '++id, saleId, status, createdAt',
invoiceSyncQueue: '++id, invoiceId, action, retryCount'
```

### 5.2 Sync Strategy
1. **Create invoice offline** → Save to `invoiceDrafts` with status `pending`
2. **When online** → Push to VNPT via Edge Function
3. **On success** → Update local record with `invoice_no`, `reservation_code`
4. **On failure** → Add to retry queue, notify user

---

## Phase 6: Implementation Roadmap

### Week 1: Foundation
- [ ] Set up Viettel sandbox account
- [x] Create `viettel-client.ts` shared module
- [ ] Implement `invoice-create` Edge Function
- [x] Add database migrations
- [x] Add environment configuration
- [x] Create TypeScript types for invoices

### Week 2: Core Features
- [ ] Implement `invoice-download` (PDF/XML)
- [ ] Implement `invoice-cancel`
- [ ] Add invoice list/search
- [ ] Create React hooks for invoice operations

### Week 3: Advanced Operations
- [ ] Implement adjustment invoices
- [ ] Implement replacement invoices
- [ ] Add batch invoice creation

### Week 4: Offline & Polish
- [ ] Implement offline queue with Dexie.js
- [ ] Add sync indicator in UI
- [ ] Error handling & retry logic
- [ ] Testing with sandbox

---

## Phase 7: UI Components Needed

```
components/
├── invoice/
│   ├── InvoiceForm.tsx           # Customer info input
│   ├── InvoicePreview.tsx        # Preview before submit
│   ├── InvoiceList.tsx           # List of issued invoices
│   ├── InvoiceDetail.tsx         # View invoice details
│   ├── InvoiceActions.tsx        # Cancel/Adjust/Download
│   └── InvoiceSyncStatus.tsx     # Offline sync indicator
```

---

## Security Considerations

1. **NEVER expose Viettel credentials in client code**
2. All API calls through Supabase Edge Functions
3. Store credentials in Supabase Vault or Edge Function secrets
4. Log all invoice operations for audit
5. Validate MST format before API calls

---

## Testing Checklist

- [ ] Create invoice with valid data
- [ ] Create invoice with VAT 0%, 8%, 10%
- [ ] Handle API timeout
- [ ] Handle invalid credentials
- [ ] Offline creation → online sync
- [ ] Cancel invoice
- [ ] Adjustment invoice
- [ ] Replacement invoice
- [ ] Download PDF
- [ ] Download XML

---

## References

- VNPT API Documentation: v2.35
- Vietnam Tax Authority: Circular 78/2021/TT-BTC
- E-Invoice Decree: 123/2020/NĐ-CP
