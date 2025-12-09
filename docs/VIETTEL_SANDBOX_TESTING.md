# Viettel Sandbox Testing Guide

## Overview
This guide explains how to test the Viettel E-Invoice integration in sandbox before going live.

---

## Step 1: Register Viettel Sandbox Account

### Option A: Register Online
1. Visit: https://sinvoice.viettel.vn/
2. Click "Đăng ký" (Register)
3. Create account with:
   - Email
   - Phone
   - Business info
4. Verify email
5. You'll get sandbox **username** and **password**

### Option B: Contact Viettel Support
- Email: sinvoice@viettel.com.vn
- Phone: 1800 1149 (toll-free in Vietnam)
- Request sandbox account with test tax code

---

## Step 2: Get Sandbox Credentials

After registration, you'll have:

| Credential | Value | Example |
|-----------|-------|---------|
| **Username** | Your login email | `user@example.com` |
| **Password** | Your password | `YourPassword123` |
| **Tax Code** | Test MST (10 digits) | `0102345678` |
| **Template Code** | Invoice format | `1/001` |
| **Invoice Series** | Symbol code | `AA/22E` |

### Important Notes:
- **Sandbox URL**: Same as production (`https://api-vinvoice.viettel.vn/services/einvoiceapplication/api`)
- **Sandbox invoices** are NOT legal documents
- Sandbox test data expires after 90 days
- Template and Series codes must be configured in Viettel dashboard

---

## Step 3: Configure in Settings

1. **Navigate** to Settings → E-Invoice tab
2. **Enable** E-Invoice toggle
3. **Select** provider: Viettel
4. **Enter** sandbox credentials:
   ```
   Username: your-sandbox-email@example.com
   Password: your-sandbox-password
   Tax Code: 0102345678
   Template Code: 1/001
   Invoice Series: AA/22E
   ```
5. **Click** "Kiểm tra kết nối" (Test Connection)
6. If successful → "Kết nối thành công với Viettel API"

---

## Step 4: Test Invoice Creation

### Test Case 1: Basic Invoice (B2C - No Tax Code)
```
Customer Name: Khách hàng Test
Customer Phone: 0912345678
Customer Address: Test Address
Items:
  - Product 1: 100,000 VND × 1 = 100,000 VND (VAT 8%)
Total: 108,000 VND
```

### Test Case 2: Business Invoice (B2B - With Tax Code)
```
Customer Name: Công Ty Test
Customer Tax Code: 0201234567
Customer Phone: 0283333333
Customer Address: Test Company Address
Items:
  - Service 1: 500,000 VND × 1 = 500,000 VND (VAT 10%)
Total: 550,000 VND
```

### Test Case 3: Different VAT Rates
```
Item 1: 100,000 VND (VAT 0%) → Total: 100,000 VND
Item 2: 100,000 VND (VAT 8%) → Total: 108,000 VND
Item 3: 100,000 VND (VAT 10%) → Total: 110,000 VND
Total: 318,000 VND
```

---

## Step 5: Verify in Viettel Dashboard

After creating invoices:

1. **Login** to Viettel dashboard: https://sinvoice.viettel.vn/
2. **Navigate** to "Tra cứu hóa đơn" (Invoice Lookup)
3. **Search** by:
   - Invoice number (from response)
   - Date range
   - Status
4. **Verify**:
   - Invoice number matches
   - Customer info correct
   - Amount correct
   - VAT calculated properly
   - PDF downloadable

---

## Step 6: Download Invoice Files

### Via Settings (In App)
1. Navigate to Invoice → Invoice number
2. Click "Download PDF" or "Download XML"
3. File should contain:
   - Viettel lookup code
   - QR code for verification
   - Complete invoice details

### Via Viettel Portal
1. Login to Viettel dashboard
2. Find invoice
3. Download XML/PDF directly

---

## Step 7: Test Error Cases

### Test Case 1: Invalid Tax Code
```
Tax Code: INVALID (should fail)
Expected: "Mã số thuế không hợp lệ"
```

### Test Case 2: Invalid Credentials
```
Username: wrong@email.com
Password: wrongpassword
Expected: Authentication error
```

### Test Case 3: Missing Required Fields
```
Customer Name: (empty)
Expected: "Tên khách hàng bắt buộc"
```

### Test Case 4: Offline Mode
1. Create invoice while online → Synced
2. Go offline
3. Create another invoice → Saved locally
4. Go online → Auto-sync

---

## Step 8: Test Offline Sync

### Offline Creation
1. **Open** Settings → Disable WiFi/Data
2. **Create** a sale and invoice
3. **Verify** it shows "Đang chờ đồng bộ" (Pending sync)
4. **Check** offline queue in IndexedDB

### Manual Sync
1. **Re-enable** WiFi/Data
2. **Open** Invoice page
3. **Click** "Đồng bộ ngay" (Sync now)
4. **Verify** invoice appears with:
   - Invoice number
   - Viettel response code
   - PDF available for download

---

## Step 9: Test Invoice Operations

### Cancel Invoice (if supported in sandbox)
```
1. Open issued invoice
2. Click "Hủy hóa đơn" (Cancel Invoice)
3. Enter reason: "Test cancel"
4. Verify status changes to "Cancelled"
```

### Adjust Invoice (if supported)
```
1. Open issued invoice
2. Click "Điều chỉnh" (Adjust)
3. Change amount/info
4. Submit → New invoice created with adjustment marker
```

---

## Step 10: Performance Testing

### Load Test: Batch Create
```bash
# Create 10 invoices rapidly
for i in {1..10}; do
  POST /api/invoice/create
  Body: { customer_name: "Test $i", ... }
done

# Verify:
- All invoices created
- No timeout errors
- All have unique invoice numbers
```

### Offline Sync Test: Large Queue
```
1. Create 20 invoices offline
2. Go online
3. Verify all synced in order
4. Check no data loss
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Kết nối thất bại" | Invalid credentials | Verify username/password in Viettel dashboard |
| "Mã số thuế không hợp lệ" | Wrong tax code format | Use 10-13 digit format without special chars |
| "Template không tồn tại" | Template not configured | Setup in Viettel dashboard under Admin → Templates |
| "Ký hiệu hóa đơn không hợp lệ" | Wrong series code | Use format like AA/22E (must be configured) |
| Invoice stuck "Pending" | Offline sync issue | Manually click "Đồng bộ ngay" or check network |

---

## Production Checklist Before Go-Live

- [ ] Sandbox account created and verified
- [ ] All test cases pass in sandbox
- [ ] Offline sync tested and working
- [ ] Error handling tested
- [ ] Invoice PDFs generated and verified
- [ ] Viettel dashboard shows all test invoices
- [ ] Performance acceptable (< 3s per invoice)
- [ ] Team trained on settings configuration
- [ ] Backup/restore tested
- [ ] Security: credentials never logged or exposed
- [ ] RLS policies verify user can only access own store invoices

---

## Production Setup

Once ready to go live:

1. **Register** production Viettel account
2. **Update** settings with production credentials:
   - Same base URL (no change needed)
   - Production username/password
   - Real business tax code
   - Real template/series codes
3. **Test** one invoice creation
4. **Monitor** first 10 invoices for issues
5. **Enable** e_invoice_required flag in store settings

---

## Support Resources

- **Viettel Support**: sinvoice@viettel.com.vn
- **API Docs**: https://sinvoice.viettel.vn/documentation
- **Our Setup**: See `docs/VIETTEL_INVOICE_INTEGRATION_PLAN.md`
- **Settings**: Settings → E-Invoice tab in app
