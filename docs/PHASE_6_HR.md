# 👥 PHASE 6: HR & PAYROLL
## Thời gian: 2 tuần (10 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Quản lý nhân viên
- [ ] Chấm công (check-in/out)
- [ ] Tính lương tự động
- [ ] Tính BHXH, BHYT, BHTN
- [ ] Tính thuế TNCN (nếu có)
- [ ] Sổ lương

---

## 📋 QUY ĐỊNH BẢO HIỂM & THUẾ

### Tỷ lệ đóng BHXH (2026)

| Loại | Người lao động | Người sử dụng LĐ |
|------|----------------|------------------|
| BHXH | 8% | 17.5% |
| BHYT | 1.5% | 3% |
| BHTN | 1% | 1% |
| **Tổng** | **10.5%** | **21.5%** |

### Mức đóng BHXH

- **Tối thiểu:** Vùng I: 4,960,000đ, Vùng II: 4,410,000đ
- **Tối đa:** 20 × lương cơ sở = 46,800,000đ (2026)

### Thuế TNCN

- **Giảm trừ bản thân:** 11,000,000đ/tháng
- **Giảm trừ người phụ thuộc:** 4,400,000đ/người/tháng
- **Thuế suất:** 5% - 35% (lũy tiến)

---

## 📅 TUẦN 1: EMPLOYEE MANAGEMENT

### Ngày 1-2: Employee Functions

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.1.1 | Function: hr/employees/list | 2h | List với filter | Phase 5 |
| 6.1.2 | Function: hr/employees/create | 2h | Thêm nhân viên | 6.1.1 |
| 6.1.3 | Function: hr/employees/update | 1h | Sửa thông tin | 6.1.1 |
| 6.1.4 | Function: hr/employees/deactivate | 1h | Nghỉ việc | 6.1.1 |
| 6.1.5 | Function: hr/positions/list | 1h | Danh sách vị trí | 6.1.1 |

**Employee Schema:**
```typescript
interface Employee {
  id: string
  store_id: string
  user_id?: string // Link to app user (optional)
  name: string
  phone: string
  id_card: string // CCCD/CMND
  date_of_birth?: Date
  address?: string
  position: string
  department?: string
  hire_date: Date
  contract_type: 'full_time' | 'part_time' | 'contract'
  base_salary: number
  allowances: number
  dependents: number // Người phụ thuộc
  bank_account?: string
  bank_name?: string
  social_insurance_no?: string
  active: boolean
}
```

**Checklist:**
- [ ] CRUD nhân viên hoạt động
- [ ] Validate CCCD/CMND
- [ ] Link với user account (optional)

---

### Ngày 3: Employee UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.2.1 | Employee list page | 2h | Grid view mobile | 6.1.x |
| 6.2.2 | Employee card component | 1h | Avatar, name, position | 6.2.1 |
| 6.2.3 | Employee detail page | 2h | Full info display | 6.2.1 |
| 6.2.4 | Add employee form | 2h | Bottom sheet form | 6.1.2 |
| 6.2.5 | Edit employee form | 1h | Pre-filled form | 6.1.3 |

**Employee Form:**
```typescript
const employeeSchema = z.object({
  name: z.string().min(1, 'Tên bắt buộc'),
  phone: z.string().regex(/^0\d{9}$/, 'SĐT không hợp lệ'),
  id_card: z.string().regex(/^\d{9,12}$/, 'CCCD không hợp lệ'),
  position: z.string().min(1),
  hire_date: z.date(),
  contract_type: z.enum(['full_time', 'part_time', 'contract']),
  base_salary: z.number().min(0),
  allowances: z.number().min(0).default(0),
  dependents: z.number().int().min(0).default(0),
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),
})
```

**Checklist:**
- [ ] Avatar upload (optional)
- [ ] Position dropdown
- [ ] Salary format với separator
- [ ] Validate phone, CCCD

---

### Ngày 4-5: Attendance (Chấm công)

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.3.1 | Function: hr/attendance/check-in | 2h | Ghi nhận check-in | 6.1.x |
| 6.3.2 | Function: hr/attendance/check-out | 2h | Ghi nhận check-out | 6.3.1 |
| 6.3.3 | Function: hr/attendance/list | 2h | List theo tháng | 6.3.1 |
| 6.3.4 | Function: hr/attendance/summary | 2h | Tổng hợp ngày công | 6.3.3 |
| 6.3.5 | Attendance page | 2h | Calendar view | 6.3.3 |
| 6.3.6 | Check-in/out button | 1h | Big button UI | 6.3.1 |

**Attendance Flow:**
```typescript
// Check-in
const checkIn = async (employeeId: string) => {
  const today = new Date().toISOString().split('T')[0]
  
  // Check if already checked in
  const existing = await getAttendance(employeeId, today)
  if (existing?.check_in) {
    throw new Error('Đã check-in hôm nay')
  }
  
  return await createAttendance({
    employee_id: employeeId,
    work_date: today,
    check_in: new Date().toISOString(),
    status: 'present'
  })
}

// Check-out
const checkOut = async (employeeId: string) => {
  const today = new Date().toISOString().split('T')[0]
  const attendance = await getAttendance(employeeId, today)
  
  if (!attendance?.check_in) {
    throw new Error('Chưa check-in hôm nay')
  }
  
  return await updateAttendance(attendance.id, {
    check_out: new Date().toISOString()
  })
}
```

**Attendance UI:**
```
┌─────────────────────────────┐
│ 📅 Chấm công - 15/01/2026   │
├─────────────────────────────┤
│                             │
│   Xin chào, Nguyễn Văn A    │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    ✅ CHECK-IN      │   │
│   │      08:30          │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│   Hoặc                      │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    🏠 CHECK-OUT     │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Check-in ghi thời gian thực
- [ ] Check-out tính giờ làm
- [ ] Không check-in 2 lần/ngày
- [ ] Calendar view tháng

---

## 📅 TUẦN 2: PAYROLL

### Ngày 6-7: Salary Calculation

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.4.1 | Function: hr/payroll/calculate | 4h | Tính lương tháng | 6.3.x |
| 6.4.2 | Working days calculation | 2h | Từ attendance | 6.4.1 |
| 6.4.3 | Insurance calculation | 2h | BHXH, BHYT, BHTN | 6.4.1 |
| 6.4.4 | PIT calculation | 2h | Thuế TNCN | 6.4.1 |
| 6.4.5 | Net salary calculation | 1h | Thực lĩnh | 6.4.4 |

**Salary Calculation Logic:**
```typescript
// supabase/functions/hr/payroll/calculate/index.ts
interface SalaryCalculation {
  employee_id: string
  period_month: number
  period_year: number
  
  // Attendance
  working_days: number
  standard_days: number // 26 ngày
  
  // Earnings
  base_salary: number
  pro_rated_salary: number // base × (working/standard)
  allowances: number
  overtime_pay: number
  gross_salary: number
  
  // Deductions - Employee portion
  social_insurance: number // 8%
  health_insurance: number // 1.5%
  unemployment_insurance: number // 1%
  
  // Tax
  taxable_income: number
  personal_deduction: number // 11M
  dependent_deduction: number // 4.4M × số NPT
  pit: number
  
  // Net
  total_deductions: number
  net_salary: number
}

const calculateSalary = async (employeeId: string, month: number, year: number) => {
  const employee = await getEmployee(employeeId)
  const attendance = await getMonthlyAttendance(employeeId, month, year)
  
  // Working days
  const workingDays = attendance.filter(a => a.status === 'present').length
  const halfDays = attendance.filter(a => a.status === 'half_day').length
  const totalDays = workingDays + (halfDays * 0.5)
  const standardDays = 26
  
  // Pro-rated salary
  const proRatedSalary = (employee.base_salary / standardDays) * totalDays
  const grossSalary = proRatedSalary + employee.allowances
  
  // Insurance (capped at 46.8M)
  const insuranceBase = Math.min(grossSalary, 46_800_000)
  const socialInsurance = insuranceBase * 0.08
  const healthInsurance = insuranceBase * 0.015
  const unemploymentInsurance = insuranceBase * 0.01
  const totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance
  
  // PIT calculation
  const personalDeduction = 11_000_000
  const dependentDeduction = employee.dependents * 4_400_000
  const taxableIncome = Math.max(0, grossSalary - totalInsurance - personalDeduction - dependentDeduction)
  const pit = calculateProgressivePIT(taxableIncome)
  
  // Net salary
  const totalDeductions = totalInsurance + pit
  const netSalary = grossSalary - totalDeductions
  
  return {
    employee_id: employeeId,
    period_month: month,
    period_year: year,
    working_days: totalDays,
    standard_days: standardDays,
    base_salary: employee.base_salary,
    pro_rated_salary: proRatedSalary,
    allowances: employee.allowances,
    gross_salary: grossSalary,
    social_insurance: socialInsurance,
    health_insurance: healthInsurance,
    unemployment_insurance: unemploymentInsurance,
    taxable_income: taxableIncome,
    personal_deduction: personalDeduction,
    dependent_deduction: dependentDeduction,
    pit,
    total_deductions: totalDeductions,
    net_salary: netSalary
  }
}

// Progressive PIT calculation
const calculateProgressivePIT = (income: number): number => {
  const brackets = [
    { limit: 5_000_000, rate: 0.05 },
    { limit: 10_000_000, rate: 0.10 },
    { limit: 18_000_000, rate: 0.15 },
    { limit: 32_000_000, rate: 0.20 },
    { limit: 52_000_000, rate: 0.25 },
    { limit: 80_000_000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ]
  
  let tax = 0
  let remaining = income
  let previousLimit = 0
  
  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remaining, bracket.limit - previousLimit)
    if (taxableInBracket <= 0) break
    
    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
    previousLimit = bracket.limit
  }
  
  return tax
}
```

**Checklist:**
- [ ] Lương theo ngày công
- [ ] BHXH đúng tỷ lệ
- [ ] TNCN lũy tiến đúng
- [ ] Net salary chính xác

---

### Ngày 8: Payroll UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.5.1 | Payroll dashboard | 2h | Summary tháng | 6.4.x |
| 6.5.2 | Payslip list | 2h | Tất cả NV trong tháng | 6.5.1 |
| 6.5.3 | Payslip detail | 2h | Chi tiết 1 NV | 6.5.2 |
| 6.5.4 | Approve payroll | 1h | Batch approve | 6.5.2 |
| 6.5.5 | Mark as paid | 1h | Đánh dấu đã trả | 6.5.4 |

**Payslip Detail:**
```
┌─────────────────────────────┐
│ PHIẾU LƯƠNG THÁNG 01/2026   │
├─────────────────────────────┤
│ Họ tên: Nguyễn Văn A        │
│ Chức vụ: Nhân viên bán hàng │
│ Ngày công: 24/26            │
├─────────────────────────────┤
│ THU NHẬP                    │
│ Lương cơ bản:    8,000,000đ │
│ Lương thực tế:   7,384,615đ │
│ Phụ cấp:         1,000,000đ │
│ ─────────────────────────── │
│ Tổng thu nhập:   8,384,615đ │
├─────────────────────────────┤
│ KHẤU TRỪ                    │
│ BHXH (8%):         670,769đ │
│ BHYT (1.5%):       125,769đ │
│ BHTN (1%):          83,846đ │
│ Thuế TNCN:               0đ │
│ ─────────────────────────── │
│ Tổng khấu trừ:     880,384đ │
├─────────────────────────────┤
│ THỰC LĨNH:       7,504,231đ │
└─────────────────────────────┘
```

**Checklist:**
- [ ] List NV với status
- [ ] Chi tiết breakdown
- [ ] Approve/Reject flow
- [ ] Mark paid với ngày

---

### Ngày 9: Salary Book

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.6.1 | Function: reports/salary-book | 3h | Sổ lương theo tháng | 6.4.x |
| 6.6.2 | Salary book page | 2h | Table tất cả NV | 6.6.1 |
| 6.6.3 | Month/Year selector | 1h | Chọn kỳ lương | 6.6.2 |
| 6.6.4 | Export Excel/PDF | 2h | Both formats | 6.6.2 |

**Salary Book Format:**
```
SỔ LƯƠNG
Kỳ: Tháng 01/2026

| STT | Họ tên | Chức vụ | Ngày công | Lương CB | Phụ cấp | Tổng TN | BHXH | BHYT | BHTN | TNCN | Thực lĩnh |
|-----|--------|---------|-----------|----------|---------|---------|------|------|------|------|-----------|
| 1   | Nguyễn A| NV bán hàng| 24/26  | 8,000,000| 1,000,000| 8,384,615| 670,769| 125,769| 83,846| 0| 7,504,231|
| 2   | Trần B | Thu ngân | 26/26    | 6,000,000| 500,000| 6,500,000| 520,000| 97,500| 65,000| 0| 5,817,500|
...
TỔNG CỘNG:                                                                                 | 13,321,731|

Tổng quỹ lương: 14,884,615đ
Tổng BHXH (NV + NSDLĐ): 4,768,308đ
Tổng TNCN: 0đ
```

**Checklist:**
- [ ] Tất cả NV trong kỳ
- [ ] Tổng quỹ lương
- [ ] Tổng BH phải đóng
- [ ] Export đúng format

---

### Ngày 10: Integration & Testing

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 6.7.1 | Link salary payment to cash/bank | 2h | Auto-record | 6.5.5 |
| 6.7.2 | Link to expense book | 1h | Expense type: Salary | 6.7.1 |
| 6.7.3 | Test attendance flow | 1h | E2E test | 6.3.x |
| 6.7.4 | Test payroll calculation | 2h | Accuracy test | 6.4.x |
| 6.7.5 | Bug fixes | 2h | Fix issues | - |

**Integration:**
```typescript
// When salary is paid
const paySalary = async (salaryRecordId: string, paymentMethod: 'cash' | 'bank_transfer') => {
  const salary = await getSalaryRecord(salaryRecordId)
  const employee = await getEmployee(salary.employee_id)
  
  // Record to cash/bank book
  if (paymentMethod === 'cash') {
    await recordCashOut({
      store_id: employee.store_id,
      amount: salary.net_salary,
      description: `Lương T${salary.period_month}/${salary.period_year} - ${employee.name}`,
      reference_type: 'salary',
      reference_id: salaryRecordId
    })
  } else {
    await recordBankOut({
      store_id: employee.store_id,
      amount: salary.net_salary,
      description: `Lương T${salary.period_month}/${salary.period_year} - ${employee.name}`,
      reference_type: 'salary',
      reference_id: salaryRecordId
    })
  }
  
  // Record to expense
  await createExpense({
    store_id: employee.store_id,
    category: 'SALARY',
    amount: salary.gross_salary,
    description: `Lương T${salary.period_month}/${salary.period_year} - ${employee.name}`
  })
  
  // Update salary record
  await updateSalaryRecord(salaryRecordId, {
    status: 'paid',
    paid_date: new Date(),
    payment_method: paymentMethod
  })
}
```

**Checklist:**
- [ ] Trả lương -> expense + cash/bank
- [ ] Số liệu khớp với sổ sách
- [ ] Test nhiều NV cùng lúc

---

## 📊 TỔNG KẾT PHASE 6

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Employee CRUD | ⬜ |
| Attendance (check-in/out) | ⬜ |
| Salary calculation | ⬜ |
| Insurance calculation | ⬜ |
| PIT calculation | ⬜ |
| Payroll management | ⬜ |
| Sổ lương | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| hr/employees/list | POST | List nhân viên |
| hr/employees/create | POST | Thêm nhân viên |
| hr/employees/update | POST | Sửa nhân viên |
| hr/employees/deactivate | POST | Nghỉ việc |
| hr/attendance/check-in | POST | Check-in |
| hr/attendance/check-out | POST | Check-out |
| hr/attendance/list | POST | List chấm công |
| hr/attendance/summary | POST | Tổng hợp ngày công |
| hr/payroll/calculate | POST | Tính lương |
| hr/payroll/approve | POST | Duyệt lương |
| hr/payroll/mark-paid | POST | Đánh dấu đã trả |
| reports/salary-book | POST | Sổ lương |

### UI Components Created

```
components/hr/
├── EmployeeList.tsx
├── EmployeeCard.tsx
├── EmployeeForm.tsx
├── EmployeeDetail.tsx
├── AttendanceCalendar.tsx
├── CheckInButton.tsx
├── CheckOutButton.tsx
├── PayrollDashboard.tsx
├── PayslipList.tsx
├── PayslipDetail.tsx
├── PayslipApproval.tsx
└── SalaryBookTable.tsx
```

---

*Phase 6 Completion Target: 2 weeks*
