# API DOCUMENTATION
## Store Management PWA - Edge Functions

**Version:** 1.0
**Base URL:** `https://[project-ref].supabase.co/functions/v1`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Products API](#2-products-api)
3. [Categories API](#3-categories-api)
4. [POS API](#4-pos-api)
5. [Inventory API](#5-inventory-api)
6. [Finance API](#6-finance-api)
7. [Tax API](#7-tax-api)
8. [HR API](#8-hr-api)
9. [Reports API](#9-reports-api)
10. [Error Handling](#10-error-handling)

---

## 1. AUTHENTICATION

### Overview

All API endpoints require authentication via Supabase Auth. Include the JWT token in the Authorization header.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
apikey: <supabase_anon_key>
```

### Getting a Token

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'phone@phone.local',
  password: 'password123'
})

// Access token
const token = data.session.access_token
```

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Store owner | Full access |
| `manager` | Store manager | Sales, inventory, finance, reports |
| `staff` | Staff member | Sales only |

---

## 2. PRODUCTS API

**Endpoint:** `/products`

### List Products

```http
POST /products
```

**Request:**
```json
{
  "action": "list",
  "search": "optional search term",
  "category_id": "optional-category-uuid",
  "page": 1,
  "limit": 20,
  "active_only": true
}
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "sku": "SKU001",
      "barcode": "8934567890123",
      "sell_price": 50000,
      "cost_price": 35000,
      "vat_rate": 10,
      "quantity": 100,
      "min_stock": 10,
      "unit": "cai",
      "image_url": "https://...",
      "category_id": "uuid",
      "active": true,
      "categories": {
        "id": "uuid",
        "name": "Category Name"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Get Single Product

```http
POST /products
```

**Request:**
```json
{
  "action": "get",
  "id": "product-uuid"
}
```

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Product Name",
    "sku": "SKU001",
    ...
  }
}
```

### Create Product

```http
POST /products
```

**Request:**
```json
{
  "action": "create",
  "name": "Product Name",
  "sku": "SKU001",
  "barcode": "8934567890123",
  "category_id": "category-uuid",
  "sell_price": 50000,
  "cost_price": 35000,
  "vat_rate": 10,
  "quantity": 100,
  "min_stock": 10,
  "unit": "cai",
  "image_url": "https://..."
}
```

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Product Name",
    ...
  }
}
```

### Update Product

```http
POST /products
```

**Request:**
```json
{
  "action": "update",
  "id": "product-uuid",
  "name": "Updated Name",
  "sell_price": 55000
}
```

### Delete Product

```http
POST /products
```

**Request:**
```json
{
  "action": "delete",
  "id": "product-uuid"
}
```

---

## 3. CATEGORIES API

**Endpoint:** `/categories`

### List Categories

```http
POST /categories
```

**Request:**
```json
{
  "action": "list"
}
```

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Category Name",
      "sort_order": 1,
      "product_count": 25
    }
  ]
}
```

### Create Category

```http
POST /categories
```

**Request:**
```json
{
  "action": "create",
  "name": "New Category",
  "sort_order": 1
}
```

### Update Category

```http
POST /categories
```

**Request:**
```json
{
  "action": "update",
  "id": "category-uuid",
  "name": "Updated Name"
}
```

### Delete Category

```http
POST /categories
```

**Request:**
```json
{
  "action": "delete",
  "id": "category-uuid"
}
```

---

## 4. POS API

**Endpoint:** `/pos`

### Create Sale

```http
POST /pos
```

**Request:**
```json
{
  "action": "create",
  "items": [
    {
      "product_id": "product-uuid",
      "product_name": "Product Name",
      "quantity": 2,
      "unit_price": 50000,
      "vat_rate": 10,
      "discount": 0
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 110000
    }
  ],
  "customer_name": "Customer Name",
  "customer_phone": "0912345678",
  "customer_tax_code": "0123456789",
  "discount": 0,
  "note": "Optional note"
}
```

**Payment Methods:**
- `cash` - Cash payment
- `bank_transfer` - Bank transfer (requires `bank_account_id`, `bank_ref`)
- `momo` - MoMo e-wallet
- `zalopay` - ZaloPay e-wallet
- `vnpay` - VNPay

**Response:**
```json
{
  "sale": {
    "id": "uuid",
    "invoice_no": "HD202412001",
    "subtotal": 100000,
    "vat_amount": 10000,
    "discount": 0,
    "total": 110000,
    "status": "completed",
    "customer_name": "Customer Name",
    "completed_at": "2024-12-07T10:30:00Z",
    "items": [...],
    "payments": [...]
  }
}
```

### Get Sale

```http
POST /pos
```

**Request:**
```json
{
  "action": "get",
  "id": "sale-uuid"
}
```

**Response:**
```json
{
  "sale": {
    "id": "uuid",
    "invoice_no": "HD202412001",
    "subtotal": 100000,
    "vat_amount": 10000,
    "discount": 0,
    "total": 110000,
    "status": "completed",
    "sale_items": [...],
    "payments": [...]
  }
}
```

### List Sales

```http
POST /pos
```

**Request:**
```json
{
  "action": "list",
  "page": 1,
  "limit": 20,
  "status": "completed",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

**Response:**
```json
{
  "sales": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## 5. INVENTORY API

**Endpoint:** `/inventory`

### Import Stock

```http
POST /inventory
```

**Request:**
```json
{
  "action": "import",
  "product_id": "product-uuid",
  "quantity": 50,
  "unit_cost": 35000,
  "note": "Import from supplier XYZ"
}
```

**Response:**
```json
{
  "log": {
    "id": "uuid",
    "type": "import",
    "quantity": 50,
    "total_value": 1750000
  },
  "new_quantity": 150
}
```

### Export Stock

```http
POST /inventory
```

**Request:**
```json
{
  "action": "export",
  "product_id": "product-uuid",
  "quantity": 10,
  "note": "Damaged goods"
}
```

### Adjust Stock

```http
POST /inventory
```

**Request:**
```json
{
  "action": "adjust",
  "product_id": "product-uuid",
  "new_quantity": 95,
  "note": "Stock check adjustment"
}
```

### Get Inventory Logs

```http
POST /inventory
```

**Request:**
```json
{
  "action": "logs",
  "product_id": "optional-product-uuid",
  "type": "import",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31",
  "page": 1,
  "limit": 20
}
```

**Log Types:**
- `import` - Stock import
- `export` - Stock export (non-sale)
- `sale` - Sale reduction
- `return` - Return from customer
- `adjustment` - Manual adjustment

### Get Inventory Summary

```http
POST /inventory
```

**Request:**
```json
{
  "action": "summary"
}
```

**Response:**
```json
{
  "summary": {
    "total_products": 250,
    "total_value": 125000000,
    "low_stock_count": 15,
    "out_of_stock_count": 3
  }
}
```

### Get Low Stock Products

```http
POST /inventory
```

**Request:**
```json
{
  "action": "low_stock"
}
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "quantity": 5,
      "min_stock": 10,
      "unit": "cai"
    }
  ]
}
```

### Stock Check Operations

**Create Stock Check Session:**
```json
{
  "action": "create_stock_check",
  "data": {
    "note": "Monthly stock check"
  }
}
```

**Get Active Stock Check:**
```json
{
  "action": "get_active_stock_check"
}
```

**Update Stock Check Item:**
```json
{
  "action": "update_stock_check_item",
  "data": {
    "stock_check_id": "uuid",
    "product_id": "uuid",
    "actual_quantity": 48,
    "note": "Found 2 damaged items"
  }
}
```

**Submit Stock Check:**
```json
{
  "action": "submit_stock_check",
  "data": {
    "stock_check_id": "uuid"
  }
}
```

**Cancel Stock Check:**
```json
{
  "action": "cancel_stock_check",
  "data": {
    "stock_check_id": "uuid"
  }
}
```

---

## 6. FINANCE API

**Endpoint:** `/finance`

### Cash In

```http
POST /finance
```

**Request:**
```json
{
  "action": "cash_in",
  "amount": 1000000,
  "description": "Cash deposit",
  "reference_type": "other"
}
```

### Cash Out

```http
POST /finance
```

**Request:**
```json
{
  "action": "cash_out",
  "amount": 500000,
  "description": "Rent payment",
  "reference_type": "expense"
}
```

### Get Cash Balance

```http
POST /finance
```

**Request:**
```json
{
  "action": "cash_balance"
}
```

**Response:**
```json
{
  "balance": 5000000,
  "last_transaction": {
    "id": "uuid",
    "description": "Sale HD202412001",
    "debit": 110000,
    "credit": 0,
    "created_at": "2024-12-07T10:30:00Z"
  }
}
```

### Get Cash Transactions

```http
POST /finance
```

**Request:**
```json
{
  "action": "cash_transactions",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31",
  "page": 1,
  "limit": 20
}
```

### Create Bank Account

```http
POST /finance
```

**Request:**
```json
{
  "action": "create_bank_account",
  "bank_name": "Vietcombank",
  "account_number": "0123456789",
  "account_holder": "NGUYEN VAN A",
  "branch": "Chi nhanh Ho Chi Minh",
  "is_default": true
}
```

### List Bank Accounts

```http
POST /finance
```

**Request:**
```json
{
  "action": "list_bank_accounts"
}
```

### Create Expense

```http
POST /finance
```

**Request:**
```json
{
  "action": "create_expense",
  "category_id": "expense-category-uuid",
  "amount": 500000,
  "vat_amount": 50000,
  "payment_method": "cash",
  "expense_date": "2024-12-07",
  "description": "Office supplies",
  "supplier_name": "ABC Company",
  "supplier_tax_code": "0123456789",
  "invoice_no": "INV001"
}
```

### List Expenses

```http
POST /finance
```

**Request:**
```json
{
  "action": "list_expenses",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31",
  "category_id": "optional-category-uuid",
  "page": 1,
  "limit": 20
}
```

### Get Finance Summary

```http
POST /finance
```

**Request:**
```json
{
  "action": "summary",
  "period": "month"
}
```

**Period options:** `day`, `week`, `month`, `year`

**Response:**
```json
{
  "summary": {
    "total_revenue": 50000000,
    "total_expenses": 15000000,
    "gross_profit": 35000000,
    "cash_balance": 5000000,
    "bank_balance": 30000000
  }
}
```

---

## 7. TAX API

**Endpoint:** `/tax`

### Get Tax Settings

```http
POST /tax
```

**Request:**
```json
{
  "action": "get_settings"
}
```

**Response:**
```json
{
  "settings": {
    "tax_code": "0123456789",
    "tax_bracket": "200m_to_1b",
    "vat_rate": 10,
    "pit_rate": 1.5
  }
}
```

### Update Tax Settings

```http
POST /tax
```

**Request:**
```json
{
  "action": "update_settings",
  "tax_code": "0123456789",
  "tax_bracket": "200m_to_1b",
  "vat_rate": 10,
  "pit_rate": 1.5
}
```

**Tax Brackets:**
- `under_200m` - Under 200 million VND/year
- `200m_to_1b` - 200 million to 1 billion VND/year
- `1b_to_3b` - 1 billion to 3 billion VND/year
- `over_3b` - Over 3 billion VND/year

### Get Quarterly Tax Summary

```http
POST /tax
```

**Request:**
```json
{
  "action": "quarterly_summary",
  "year": 2024,
  "quarter": 4
}
```

**Response:**
```json
{
  "quarter": 4,
  "year": 2024,
  "period_start": "2024-10-01",
  "period_end": "2024-12-31",
  "total_revenue": 150000000,
  "vat_collected": 15000000,
  "vat_deductible": 5000000,
  "vat_payable": 10000000,
  "pit_payable": 2250000,
  "total_tax": 12250000,
  "deadline": "2025-01-30"
}
```

### Get Tax Deadlines

```http
POST /tax
```

**Request:**
```json
{
  "action": "deadlines"
}
```

**Response:**
```json
{
  "deadlines": [
    {
      "quarter": 4,
      "year": 2024,
      "deadline": "2025-01-30",
      "days_remaining": 54,
      "status": "pending"
    }
  ]
}
```

---

## 8. HR API

**Endpoint:** `/hr`

### List Employees

```http
POST /hr
```

**Request:**
```json
{
  "action": "list_employees",
  "active_only": true,
  "position": "optional-position-filter"
}
```

**Response:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "name": "Nguyen Van A",
      "phone": "0912345678",
      "id_card": "012345678901",
      "position": "Nhân viên ban hang",
      "base_salary": 7000000,
      "allowances": 500000,
      "hire_date": "2024-01-15",
      "active": true
    }
  ]
}
```

### Create Employee

```http
POST /hr
```

**Request:**
```json
{
  "action": "create_employee",
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "id_card": "012345678901",
  "date_of_birth": "1990-05-15",
  "address": "123 ABC Street, District 1, HCMC",
  "position": "Nhân viên ban hang",
  "department": "Sales",
  "hire_date": "2024-12-07",
  "contract_type": "full_time",
  "base_salary": 7000000,
  "allowances": 500000,
  "dependents": 1,
  "bank_account": "0123456789",
  "bank_name": "Vietcombank",
  "social_insurance_no": "0123456789"
}
```

**Contract Types:**
- `full_time` - Full-time employee
- `part_time` - Part-time employee
- `contract` - Contract worker

### Update Employee

```http
POST /hr
```

**Request:**
```json
{
  "action": "update_employee",
  "id": "employee-uuid",
  "base_salary": 8000000,
  "position": "Quan ly"
}
```

### Deactivate Employee

```http
POST /hr
```

**Request:**
```json
{
  "action": "deactivate_employee",
  "id": "employee-uuid",
  "termination_date": "2024-12-31",
  "termination_reason": "Resigned"
}
```

### Check In

```http
POST /hr
```

**Request:**
```json
{
  "action": "check_in",
  "employee_id": "employee-uuid",
  "notes": "Optional note"
}
```

**Response:**
```json
{
  "attendance": {
    "id": "uuid",
    "employee_id": "uuid",
    "work_date": "2024-12-07",
    "check_in": "2024-12-07T08:30:00Z",
    "status": "present"
  }
}
```

### Check Out

```http
POST /hr
```

**Request:**
```json
{
  "action": "check_out",
  "employee_id": "employee-uuid",
  "notes": "Optional note"
}
```

**Response:**
```json
{
  "attendance": {
    "id": "uuid",
    "check_in": "2024-12-07T08:30:00Z",
    "check_out": "2024-12-07T17:30:00Z",
    "working_hours": 9,
    "status": "present"
  }
}
```

### Get Attendance

```http
POST /hr
```

**Request:**
```json
{
  "action": "get_attendance",
  "employee_id": "optional-employee-uuid",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

### Attendance Summary

```http
POST /hr
```

**Request:**
```json
{
  "action": "attendance_summary",
  "employee_id": "employee-uuid",
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "summary": {
    "total_days": 22,
    "present": 20,
    "half_day": 1,
    "absent": 1,
    "late": 2,
    "total_working_days": 20.5,
    "total_working_hours": 164
  },
  "attendance": [...]
}
```

### Calculate Salary

```http
POST /hr
```

**Request:**
```json
{
  "action": "calculate_salary",
  "employee_id": "employee-uuid",
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "payroll": {
    "id": "uuid",
    "employee_id": "uuid",
    "period_month": 12,
    "period_year": 2024,
    "working_days": 20.5,
    "standard_days": 26,
    "base_salary": 7000000,
    "pro_rated_salary": 5519231,
    "allowances": 500000,
    "gross_salary": 6019231,
    "social_insurance": 481538,
    "health_insurance": 90288,
    "unemployment_insurance": 60192,
    "taxable_income": 0,
    "personal_deduction": 11000000,
    "dependent_deduction": 4400000,
    "pit": 0,
    "total_deductions": 632018,
    "net_salary": 5387213,
    "status": "calculated"
  },
  "employee": {...}
}
```

### Calculate All Salaries

```http
POST /hr
```

**Request:**
```json
{
  "action": "calculate_all_salaries",
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "calculated": 5,
  "results": [
    { "employee_id": "uuid", "net_salary": 5387213 },
    ...
  ]
}
```

### Approve Payroll

```http
POST /hr
```

**Request:**
```json
{
  "action": "approve_payroll",
  "payroll_ids": ["uuid1", "uuid2"]
}
```

### Mark as Paid

```http
POST /hr
```

**Request:**
```json
{
  "action": "mark_paid",
  "payroll_id": "payroll-uuid",
  "payment_method": "bank_transfer",
  "payment_date": "2024-12-10"
}
```

### Get Payroll

```http
POST /hr
```

**Request:**
```json
{
  "action": "get_payroll",
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "payrolls": [...],
  "totals": {
    "total_gross": 30000000,
    "total_net": 26500000,
    "total_insurance_employee": 3150000,
    "total_insurance_employer": 10750000,
    "total_pit": 350000
  },
  "period": "T12/2024"
}
```

---

## 9. REPORTS API

**Endpoint:** `/reports`

### Dashboard Summary

```http
POST /reports
```

**Request:**
```json
{
  "action": "dashboard_summary"
}
```

**Response:**
```json
{
  "today": {
    "revenue": 5000000,
    "orders": 25,
    "avgOrderValue": 200000
  },
  "thisMonth": {
    "revenue": 150000000,
    "expenses": 45000000,
    "profit": 105000000,
    "orders": 750
  },
  "comparison": {
    "revenueChange": 15
  },
  "alerts": {
    "lowStockCount": 8,
    "taxDeadlineDays": 54
  },
  "recentSales": [...]
}
```

### Sales Analytics

```http
POST /reports
```

**Request:**
```json
{
  "action": "sales_analytics",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

**Response:**
```json
{
  "period": { "start": "2024-12-01", "end": "2024-12-31" },
  "dailySales": [
    { "date": "2024-12-01", "revenue": 5000000, "orders": 25 },
    ...
  ],
  "byCategory": [
    { "category": "Drinks", "revenue": 50000000, "percentage": 33 },
    ...
  ],
  "topProducts": [
    { "product_name": "Product A", "quantity_sold": 150, "revenue": 7500000 },
    ...
  ],
  "byHour": [
    { "hour": 9, "orders": 50, "revenue": 10000000 },
    ...
  ],
  "byPaymentMethod": [
    { "method": "cash", "count": 500, "amount": 100000000, "percentage": 67 },
    ...
  ],
  "summary": {
    "totalRevenue": 150000000,
    "totalOrders": 750
  }
}
```

### Financial Analytics

```http
POST /reports
```

**Request:**
```json
{
  "action": "financial_analytics",
  "date_from": "2024-01-01",
  "date_to": "2024-12-31"
}
```

**Response:**
```json
{
  "period": { "start": "2024-01-01", "end": "2024-12-31" },
  "summary": {
    "totalRevenue": 1800000000,
    "totalExpenses": 540000000,
    "grossProfit": 1260000000,
    "profitMargin": 70
  },
  "monthlyTrend": [
    { "month": "2024-01", "revenue": 150000000, "expenses": 45000000, "profit": 105000000 },
    ...
  ],
  "expenseBreakdown": [
    { "category": "Rent", "amount": 120000000, "percentage": 22 },
    ...
  ]
}
```

### Revenue Book (So Doanh Thu)

```http
POST /reports
```

**Request:**
```json
{
  "action": "revenue_book",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

**Response:**
```json
{
  "period": { "from": "2024-12-01", "to": "2024-12-31" },
  "entries": [
    {
      "stt": 1,
      "date": "2024-12-01",
      "invoice_no": "HD202412001",
      "customer_name": "Khach le",
      "subtotal": 100000,
      "vat_amount": 10000,
      "total": 110000,
      "payment_method": "cash"
    },
    ...
  ],
  "totals": {
    "total_subtotal": 136363636,
    "total_vat": 13636364,
    "total_revenue": 150000000,
    "sale_count": 750
  }
}
```

### Cash Book (So Tien Mat)

```http
POST /reports
```

**Request:**
```json
{
  "action": "cash_book",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

### Bank Book (So Tien Gui)

```http
POST /reports
```

**Request:**
```json
{
  "action": "bank_book",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31",
  "bank_account_id": "optional-bank-uuid"
}
```

### Expense Book (So Chi Phi)

```http
POST /reports
```

**Request:**
```json
{
  "action": "expense_book",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

### Inventory Book (So Ton Kho)

```http
POST /reports
```

**Request:**
```json
{
  "action": "inventory_book",
  "date_from": "2024-12-01",
  "date_to": "2024-12-31"
}
```

### Tax Book (So Nghia Vu Thue)

```http
POST /reports
```

**Request:**
```json
{
  "action": "tax_book",
  "year": 2024
}
```

**Response:**
```json
{
  "year": 2024,
  "quarters": [
    {
      "quarter": 1,
      "period_start": "2024-01-01",
      "period_end": "2024-03-31",
      "total_revenue": 450000000,
      "vat_collected": 45000000,
      "vat_deductible": 15000000,
      "vat_payable": 30000000,
      "pit_payable": 6750000,
      "total_tax": 36750000,
      "status": "paid"
    },
    ...
  ],
  "summary": {
    "total_revenue": 1800000000,
    "total_vat": 120000000,
    "total_pit": 27000000,
    "total_tax": 147000000
  }
}
```

### Salary Book (So Luong)

```http
POST /reports
```

**Request:**
```json
{
  "action": "salary_book",
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "period": "Tháng 12/2024",
  "entries": [
    {
      "stt": 1,
      "name": "Nguyen Van A",
      "position": "Nhân viên ban hang",
      "working_days": "20.5/26",
      "base_salary": 7000000,
      "allowances": 500000,
      "gross_salary": 6019231,
      "social_insurance": 481538,
      "health_insurance": 90288,
      "unemployment_insurance": 60192,
      "pit": 0,
      "net_salary": 5387213,
      "status": "paid"
    },
    ...
  ],
  "totals": {
    "total_base_salary": 35000000,
    "total_allowances": 2500000,
    "total_gross": 30000000,
    "total_social_insurance": 2400000,
    "total_health_insurance": 450000,
    "total_unemployment_insurance": 300000,
    "total_pit": 350000,
    "total_net_salary": 26500000
  },
  "employee_count": 5
}
```

---

## 10. ERROR HANDLING

### Error Response Format

```json
{
  "error": "Error message in Vietnamese or English"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

### Common Error Messages

| Message | Description |
|---------|-------------|
| `Missing authorization header` | No JWT token provided |
| `Unauthorized` | Invalid or expired token |
| `User has no associated store` | User not linked to a store |
| `Missing required field: {field}` | Required parameter missing |
| `San pham khong ton tai` | Product not found |
| `Khong du ton kho` | Insufficient stock |
| `Gio hang trong` | Empty cart |
| `Chua chon phuong thuc thanh toan` | No payment method selected |
| `So tien thanh toan khong du` | Insufficient payment amount |

### Rate Limiting

- Default: 1000 requests/hour (Supabase Free tier)
- Upgrade to Pro plan for higher limits

### Response Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1701950400
```

---

## EXAMPLE: Full Sale Flow

```javascript
// 1. Get products
const products = await fetch('/functions/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': ANON_KEY
  },
  body: JSON.stringify({ action: 'list' })
})

// 2. Create sale
const sale = await fetch('/functions/v1/pos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': ANON_KEY
  },
  body: JSON.stringify({
    action: 'create',
    items: [
      {
        product_id: 'product-uuid',
        product_name: 'Product A',
        quantity: 2,
        unit_price: 50000,
        vat_rate: 10,
        discount: 0
      }
    ],
    payments: [
      { method: 'cash', amount: 110000 }
    ]
  })
})

// 3. Check result
const result = await sale.json()
console.log('Invoice:', result.sale.invoice_no)
console.log('Total:', result.sale.total)
```

---

*API Documentation for Store Management PWA v1.0*
