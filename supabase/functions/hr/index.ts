import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getUser,
  getUserStore,
  successResponse,
  errorResponse,
  handleCors,
} from '../_shared/supabase.ts'

// Employee interfaces
interface ListEmployeesRequest {
  action: 'list_employees'
  active_only?: boolean
  position?: string
}

interface CreateEmployeeRequest {
  action: 'create_employee'
  name: string
  phone: string
  id_card: string
  date_of_birth?: string
  address?: string
  position: string
  department?: string
  hire_date: string
  contract_type: 'full_time' | 'part_time' | 'contract'
  base_salary: number
  allowances?: number
  dependents?: number
  bank_account?: string
  bank_name?: string
  social_insurance_no?: string
}

interface UpdateEmployeeRequest {
  action: 'update_employee'
  id: string
  name?: string
  phone?: string
  id_card?: string
  date_of_birth?: string
  address?: string
  position?: string
  department?: string
  contract_type?: 'full_time' | 'part_time' | 'contract'
  base_salary?: number
  allowances?: number
  dependents?: number
  bank_account?: string
  bank_name?: string
  social_insurance_no?: string
}

interface DeactivateEmployeeRequest {
  action: 'deactivate_employee'
  id: string
  termination_date?: string
  termination_reason?: string
}

interface GetEmployeeRequest {
  action: 'get_employee'
  id: string
}

interface ListPositionsRequest {
  action: 'list_positions'
}

// Attendance interfaces
interface CheckInRequest {
  action: 'check_in'
  employee_id: string
  notes?: string
}

interface CheckOutRequest {
  action: 'check_out'
  employee_id: string
  notes?: string
}

interface GetAttendanceRequest {
  action: 'get_attendance'
  employee_id?: string
  date_from?: string
  date_to?: string
}

interface AttendanceSummaryRequest {
  action: 'attendance_summary'
  employee_id: string
  month: number
  year: number
}

// Payroll interfaces
interface CalculateSalaryRequest {
  action: 'calculate_salary'
  employee_id: string
  month: number
  year: number
}

interface CalculateAllSalariesRequest {
  action: 'calculate_all_salaries'
  month: number
  year: number
}

interface ApprovePayrollRequest {
  action: 'approve_payroll'
  payroll_ids: string[]
}

interface MarkPaidRequest {
  action: 'mark_paid'
  payroll_id: string
  payment_method: 'cash' | 'bank_transfer'
  payment_date?: string
}

interface GetPayrollRequest {
  action: 'get_payroll'
  month: number
  year: number
}

interface GetSalaryBookRequest {
  action: 'salary_book'
  month: number
  year: number
}

type HRRequest =
  | ListEmployeesRequest
  | CreateEmployeeRequest
  | UpdateEmployeeRequest
  | DeactivateEmployeeRequest
  | GetEmployeeRequest
  | ListPositionsRequest
  | CheckInRequest
  | CheckOutRequest
  | GetAttendanceRequest
  | AttendanceSummaryRequest
  | CalculateSalaryRequest
  | CalculateAllSalariesRequest
  | ApprovePayrollRequest
  | MarkPaidRequest
  | GetPayrollRequest
  | GetSalaryBookRequest

// Insurance rates (2026 Vietnam)
const INSURANCE_RATES = {
  social: { employee: 0.08, employer: 0.175 },
  health: { employee: 0.015, employer: 0.03 },
  unemployment: { employee: 0.01, employer: 0.01 },
}

const INSURANCE_CAP = 46_800_000 // 20x base salary (2.34M x 20)
const PERSONAL_DEDUCTION = 11_000_000
const DEPENDENT_DEDUCTION = 4_400_000
const STANDARD_WORKING_DAYS = 26

// Progressive PIT calculation
function calculatePIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

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
  let remaining = taxableIncome
  let previousLimit = 0

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remaining, bracket.limit - previousLimit)
    if (taxableInBracket <= 0) break

    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
    previousLimit = bracket.limit
  }

  return Math.round(tax)
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)

    const body: HRRequest = await req.json()

    switch (body.action) {
      // Employee CRUD
      case 'list_employees': {
        const { active_only = true, position } = body

        let query = supabase
          .from('employees')
          .select('*')
          .eq('store_id', store_id)
          .order('name')

        if (active_only) {
          query = query.eq('active', true)
        }

        if (position) {
          query = query.eq('position', position)
        }

        const { data, error } = await query

        if (error) throw error

        return successResponse({ employees: data })
      }

      case 'create_employee': {
        const {
          name,
          phone,
          id_card,
          date_of_birth,
          address,
          position,
          department,
          hire_date,
          contract_type,
          base_salary,
          allowances = 0,
          dependents = 0,
          bank_account,
          bank_name,
          social_insurance_no,
        } = body

        // Validate phone format (Vietnam)
        if (!/^0\d{9}$/.test(phone)) {
          return errorResponse('So dien thoai khong hop le', 400)
        }

        // Validate ID card format (CCCD 12 digits or CMND 9 digits)
        if (!/^\d{9,12}$/.test(id_card)) {
          return errorResponse('So CCCD/CMND khong hop le', 400)
        }

        const { data, error } = await supabase
          .from('employees')
          .insert({
            store_id,
            name,
            phone,
            id_card,
            date_of_birth,
            address,
            position,
            department,
            hire_date,
            contract_type,
            base_salary,
            allowances,
            dependents,
            bank_account,
            bank_name,
            social_insurance_no,
            active: true,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ employee: data })
      }

      case 'update_employee': {
        const { id, ...updates } = body

        // Remove action from updates
        const updateData = { ...updates } as Record<string, unknown>
        delete updateData.action

        // Validate phone if provided
        if (updates.phone && !/^0\d{9}$/.test(updates.phone)) {
          return errorResponse('So dien thoai khong hop le', 400)
        }

        // Validate ID card if provided
        if (updates.id_card && !/^\d{9,12}$/.test(updates.id_card)) {
          return errorResponse('So CCCD/CMND khong hop le', 400)
        }

        const { data, error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ employee: data })
      }

      case 'deactivate_employee': {
        const { id, termination_date, termination_reason } = body

        const { data, error } = await supabase
          .from('employees')
          .update({
            active: false,
            termination_date: termination_date || new Date().toISOString().split('T')[0],
            termination_reason,
          })
          .eq('id', id)
          .eq('store_id', store_id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ employee: data })
      }

      case 'get_employee': {
        const { id } = body

        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', id)
          .eq('store_id', store_id)
          .single()

        if (error) throw error

        return successResponse({ employee: data })
      }

      case 'list_positions': {
        // Get distinct positions from employees
        const { data, error } = await supabase
          .from('employees')
          .select('position')
          .eq('store_id', store_id)
          .eq('active', true)

        if (error) throw error

        const positions = [...new Set(data.map(e => e.position))].sort()

        // Add default positions if empty
        const defaultPositions = [
          'Nhân viên ban hang',
          'Thu ngan',
          'Quan ly',
          'Kho',
          'Ke toan',
        ]

        const allPositions = positions.length > 0 ? positions : defaultPositions

        return successResponse({ positions: allPositions })
      }

      // Attendance
      case 'check_in': {
        const { employee_id, notes } = body
        const today = new Date().toISOString().split('T')[0]

        // Check if already checked in today
        const { data: existing } = await supabase
          .from('attendance')
          .select('id, check_in')
          .eq('store_id', store_id)
          .eq('employee_id', employee_id)
          .eq('work_date', today)
          .single()

        if (existing?.check_in) {
          return errorResponse('Da check-in hom nay', 400)
        }

        const now = new Date().toISOString()

        if (existing) {
          // Update existing record
          const { data, error } = await supabase
            .from('attendance')
            .update({
              check_in: now,
              status: 'present',
              notes,
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (error) throw error
          return successResponse({ attendance: data })
        }

        // Create new record
        const { data, error } = await supabase
          .from('attendance')
          .insert({
            store_id,
            employee_id,
            work_date: today,
            check_in: now,
            status: 'present',
            notes,
          })
          .select()
          .single()

        if (error) throw error

        return successResponse({ attendance: data })
      }

      case 'check_out': {
        const { employee_id, notes } = body
        const today = new Date().toISOString().split('T')[0]

        // Get today's attendance
        const { data: attendance, error: fetchError } = await supabase
          .from('attendance')
          .select('*')
          .eq('store_id', store_id)
          .eq('employee_id', employee_id)
          .eq('work_date', today)
          .single()

        if (fetchError || !attendance) {
          return errorResponse('Chua check-in hom nay', 400)
        }

        if (attendance.check_out) {
          return errorResponse('Da check-out hom nay', 400)
        }

        const now = new Date()
        const checkIn = new Date(attendance.check_in)
        const workingHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60)

        // Determine status based on hours worked
        let status = 'present'
        if (workingHours < 4) {
          status = 'absent' // Less than half day
        } else if (workingHours < 8) {
          status = 'half_day'
        }

        const { data, error } = await supabase
          .from('attendance')
          .update({
            check_out: now.toISOString(),
            working_hours: Math.round(workingHours * 10) / 10,
            status,
            notes: notes || attendance.notes,
          })
          .eq('id', attendance.id)
          .select()
          .single()

        if (error) throw error

        return successResponse({ attendance: data })
      }

      case 'get_attendance': {
        const { employee_id, date_from, date_to } = body

        let query = supabase
          .from('attendance')
          .select('*, employees(id, name, position)')
          .eq('store_id', store_id)
          .order('work_date', { ascending: false })

        if (employee_id) {
          query = query.eq('employee_id', employee_id)
        }

        if (date_from) {
          query = query.gte('work_date', date_from)
        }

        if (date_to) {
          query = query.lte('work_date', date_to)
        }

        const { data, error } = await query

        if (error) throw error

        return successResponse({ attendance: data })
      }

      case 'attendance_summary': {
        const { employee_id, month, year } = body

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('store_id', store_id)
          .eq('employee_id', employee_id)
          .gte('work_date', startDate)
          .lte('work_date', endDate)

        if (error) throw error

        const summary = {
          total_days: data.length,
          present: data.filter(a => a.status === 'present').length,
          half_day: data.filter(a => a.status === 'half_day').length,
          absent: data.filter(a => a.status === 'absent').length,
          late: data.filter(a => a.is_late).length,
          total_working_days: 0,
          total_working_hours: 0,
        }

        summary.total_working_days = summary.present + (summary.half_day * 0.5)
        summary.total_working_hours = data.reduce((sum, a) => sum + (a.working_hours || 0), 0)

        return successResponse({
          summary,
          attendance: data,
        })
      }

      // Payroll
      case 'calculate_salary': {
        const { employee_id, month, year } = body

        // Get employee
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employee_id)
          .eq('store_id', store_id)
          .single()

        if (empError) throw empError

        // Get attendance summary
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]

        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('store_id', store_id)
          .eq('employee_id', employee_id)
          .gte('work_date', startDate)
          .lte('work_date', endDate)

        const presentDays = attendance?.filter(a => a.status === 'present').length || 0
        const halfDays = attendance?.filter(a => a.status === 'half_day').length || 0
        const workingDays = presentDays + (halfDays * 0.5)

        // Pro-rated salary
        const proRatedSalary = (employee.base_salary / STANDARD_WORKING_DAYS) * workingDays
        const grossSalary = proRatedSalary + (employee.allowances || 0)

        // Insurance calculation (capped)
        const insuranceBase = Math.min(grossSalary, INSURANCE_CAP)
        const socialInsurance = Math.round(insuranceBase * INSURANCE_RATES.social.employee)
        const healthInsurance = Math.round(insuranceBase * INSURANCE_RATES.health.employee)
        const unemploymentInsurance = Math.round(insuranceBase * INSURANCE_RATES.unemployment.employee)
        const totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance

        // Employer insurance (for records)
        const employerSocialIns = Math.round(insuranceBase * INSURANCE_RATES.social.employer)
        const employerHealthIns = Math.round(insuranceBase * INSURANCE_RATES.health.employer)
        const employerUnemploymentIns = Math.round(insuranceBase * INSURANCE_RATES.unemployment.employer)
        const totalEmployerInsurance = employerSocialIns + employerHealthIns + employerUnemploymentIns

        // PIT calculation
        const dependentDeduction = (employee.dependents || 0) * DEPENDENT_DEDUCTION
        const taxableIncome = Math.max(0, grossSalary - totalInsurance - PERSONAL_DEDUCTION - dependentDeduction)
        const pit = calculatePIT(taxableIncome)

        // Net salary
        const totalDeductions = totalInsurance + pit
        const netSalary = Math.round(grossSalary - totalDeductions)

        // Check if payroll record exists
        const { data: existingPayroll } = await supabase
          .from('payroll')
          .select('id')
          .eq('store_id', store_id)
          .eq('employee_id', employee_id)
          .eq('period_month', month)
          .eq('period_year', year)
          .single()

        const payrollData = {
          store_id,
          employee_id,
          period_month: month,
          period_year: year,
          working_days: workingDays,
          standard_days: STANDARD_WORKING_DAYS,
          base_salary: employee.base_salary,
          pro_rated_salary: Math.round(proRatedSalary),
          allowances: employee.allowances || 0,
          gross_salary: Math.round(grossSalary),
          social_insurance: socialInsurance,
          health_insurance: healthInsurance,
          unemployment_insurance: unemploymentInsurance,
          employer_social_insurance: employerSocialIns,
          employer_health_insurance: employerHealthIns,
          employer_unemployment_insurance: employerUnemploymentIns,
          taxable_income: Math.round(taxableIncome),
          personal_deduction: PERSONAL_DEDUCTION,
          dependent_deduction: dependentDeduction,
          pit,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          status: 'calculated',
        }

        let payroll
        if (existingPayroll) {
          const { data, error } = await supabase
            .from('payroll')
            .update(payrollData)
            .eq('id', existingPayroll.id)
            .select()
            .single()

          if (error) throw error
          payroll = data
        } else {
          const { data, error } = await supabase
            .from('payroll')
            .insert(payrollData)
            .select()
            .single()

          if (error) throw error
          payroll = data
        }

        return successResponse({ payroll, employee })
      }

      case 'calculate_all_salaries': {
        const { month, year } = body

        // Get all active employees
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id')
          .eq('store_id', store_id)
          .eq('active', true)

        if (empError) throw empError

        const results = []
        for (const emp of employees) {
          // Recursively calculate each salary
          const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('id', emp.id)
            .single()

          if (!employee) continue

          // Get attendance summary
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const endDate = new Date(year, month, 0).toISOString().split('T')[0]

          const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('store_id', store_id)
            .eq('employee_id', emp.id)
            .gte('work_date', startDate)
            .lte('work_date', endDate)

          const presentDays = attendance?.filter(a => a.status === 'present').length || 0
          const halfDays = attendance?.filter(a => a.status === 'half_day').length || 0
          const workingDays = presentDays + (halfDays * 0.5)

          const proRatedSalary = (employee.base_salary / STANDARD_WORKING_DAYS) * workingDays
          const grossSalary = proRatedSalary + (employee.allowances || 0)

          const insuranceBase = Math.min(grossSalary, INSURANCE_CAP)
          const socialInsurance = Math.round(insuranceBase * INSURANCE_RATES.social.employee)
          const healthInsurance = Math.round(insuranceBase * INSURANCE_RATES.health.employee)
          const unemploymentInsurance = Math.round(insuranceBase * INSURANCE_RATES.unemployment.employee)
          const totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance

          const employerSocialIns = Math.round(insuranceBase * INSURANCE_RATES.social.employer)
          const employerHealthIns = Math.round(insuranceBase * INSURANCE_RATES.health.employer)
          const employerUnemploymentIns = Math.round(insuranceBase * INSURANCE_RATES.unemployment.employer)

          const dependentDeduction = (employee.dependents || 0) * DEPENDENT_DEDUCTION
          const taxableIncome = Math.max(0, grossSalary - totalInsurance - PERSONAL_DEDUCTION - dependentDeduction)
          const pit = calculatePIT(taxableIncome)

          const totalDeductions = totalInsurance + pit
          const netSalary = Math.round(grossSalary - totalDeductions)

          const payrollData = {
            store_id,
            employee_id: emp.id,
            period_month: month,
            period_year: year,
            working_days: workingDays,
            standard_days: STANDARD_WORKING_DAYS,
            base_salary: employee.base_salary,
            pro_rated_salary: Math.round(proRatedSalary),
            allowances: employee.allowances || 0,
            gross_salary: Math.round(grossSalary),
            social_insurance: socialInsurance,
            health_insurance: healthInsurance,
            unemployment_insurance: unemploymentInsurance,
            employer_social_insurance: employerSocialIns,
            employer_health_insurance: employerHealthIns,
            employer_unemployment_insurance: employerUnemploymentIns,
            taxable_income: Math.round(taxableIncome),
            personal_deduction: PERSONAL_DEDUCTION,
            dependent_deduction: dependentDeduction,
            pit,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            status: 'calculated',
          }

          // Upsert payroll
          const { data: existingPayroll } = await supabase
            .from('payroll')
            .select('id')
            .eq('store_id', store_id)
            .eq('employee_id', emp.id)
            .eq('period_month', month)
            .eq('period_year', year)
            .single()

          if (existingPayroll) {
            await supabase
              .from('payroll')
              .update(payrollData)
              .eq('id', existingPayroll.id)
          } else {
            await supabase
              .from('payroll')
              .insert(payrollData)
          }

          results.push({ employee_id: emp.id, net_salary: netSalary })
        }

        return successResponse({
          calculated: results.length,
          results,
        })
      }

      case 'approve_payroll': {
        const { payroll_ids } = body

        const { data, error } = await supabase
          .from('payroll')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .in('id', payroll_ids)
          .eq('store_id', store_id)
          .select()

        if (error) throw error

        return successResponse({ approved: data.length, payrolls: data })
      }

      case 'mark_paid': {
        const { payroll_id, payment_method, payment_date } = body

        // Get payroll details
        const { data: payroll, error: payrollError } = await supabase
          .from('payroll')
          .select('*, employees(name)')
          .eq('id', payroll_id)
          .eq('store_id', store_id)
          .single()

        if (payrollError) throw payrollError

        if (payroll.status !== 'approved') {
          return errorResponse('Chi co the tra luong cho bang luong da duyet', 400)
        }

        // Update payroll status
        const { data: updatedPayroll, error: updateError } = await supabase
          .from('payroll')
          .update({
            status: 'paid',
            payment_method,
            paid_date: payment_date || new Date().toISOString().split('T')[0],
          })
          .eq('id', payroll_id)
          .select()
          .single()

        if (updateError) throw updateError

        // Record to cash/bank book
        const description = `Luong T${payroll.period_month}/${payroll.period_year} - ${payroll.employees?.name || 'NV'}`

        if (payment_method === 'cash') {
          const { data: lastEntry } = await supabase
            .from('cash_book')
            .select('balance')
            .eq('store_id', store_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const currentBalance = lastEntry?.balance || 0
          const newBalance = currentBalance - payroll.net_salary

          await supabase.from('cash_book').insert({
            store_id,
            description,
            reference_type: 'salary',
            reference_id: payroll_id,
            debit: 0,
            credit: payroll.net_salary,
            balance: newBalance,
            created_by: user.id,
          })
        }

        // Create expense record
        await supabase.from('expenses').insert({
          store_id,
          description,
          amount: payroll.gross_salary,
          payment_method,
          expense_date: payment_date || new Date().toISOString().split('T')[0],
          created_by: user.id,
        })

        return successResponse({ payroll: updatedPayroll })
      }

      case 'get_payroll': {
        const { month, year } = body

        const { data, error } = await supabase
          .from('payroll')
          .select('*, employees(id, name, position, bank_account, bank_name)')
          .eq('store_id', store_id)
          .eq('period_month', month)
          .eq('period_year', year)
          .order('employees(name)')

        if (error) throw error

        // Calculate totals
        const totals = {
          total_gross: data.reduce((sum, p) => sum + p.gross_salary, 0),
          total_net: data.reduce((sum, p) => sum + p.net_salary, 0),
          total_insurance_employee: data.reduce((sum, p) =>
            sum + p.social_insurance + p.health_insurance + p.unemployment_insurance, 0
          ),
          total_insurance_employer: data.reduce((sum, p) =>
            sum + (p.employer_social_insurance || 0) + (p.employer_health_insurance || 0) + (p.employer_unemployment_insurance || 0), 0
          ),
          total_pit: data.reduce((sum, p) => sum + p.pit, 0),
        }

        return successResponse({
          payrolls: data,
          totals,
          period: `T${month}/${year}`,
        })
      }

      case 'salary_book': {
        const { month, year } = body

        const { data, error } = await supabase
          .from('payroll')
          .select('*, employees(id, name, position)')
          .eq('store_id', store_id)
          .eq('period_month', month)
          .eq('period_year', year)
          .order('employees(name)')

        if (error) throw error

        // Format for salary book
        const salaryBook = data.map((p, index) => ({
          stt: index + 1,
          name: p.employees?.name,
          position: p.employees?.position,
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

        const totals = {
          total_base_salary: data.reduce((sum, p) => sum + p.base_salary, 0),
          total_allowances: data.reduce((sum, p) => sum + p.allowances, 0),
          total_gross: data.reduce((sum, p) => sum + p.gross_salary, 0),
          total_social_insurance: data.reduce((sum, p) => sum + p.social_insurance, 0),
          total_health_insurance: data.reduce((sum, p) => sum + p.health_insurance, 0),
          total_unemployment_insurance: data.reduce((sum, p) => sum + p.unemployment_insurance, 0),
          total_pit: data.reduce((sum, p) => sum + p.pit, 0),
          total_net_salary: data.reduce((sum, p) => sum + p.net_salary, 0),
        }

        return successResponse({
          salary_book: salaryBook,
          totals,
          period: `Tháng ${month}/${year}`,
          employee_count: data.length,
        })
      }

      default:
        return errorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('HR function error:', error)
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
