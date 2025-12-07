-- HR & Payroll Enhancement Migration
-- Adds missing columns to employees table and creates payroll table

-- Add missing columns to employees table
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS social_insurance_no VARCHAR(20),
  ADD COLUMN IF NOT EXISTS termination_date DATE,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add constraint for contract_type
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_contract_type_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_contract_type_check
  CHECK (contract_type IN ('full_time', 'part_time', 'contract'));

-- Create payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  
  -- Working days
  working_days NUMERIC(4,1) DEFAULT 0,
  standard_days INTEGER DEFAULT 26,
  
  -- Salary components
  base_salary INTEGER DEFAULT 0,
  pro_rated_salary INTEGER DEFAULT 0,
  allowances INTEGER DEFAULT 0,
  gross_salary INTEGER DEFAULT 0,
  
  -- Employee insurance deductions
  social_insurance INTEGER DEFAULT 0,
  health_insurance INTEGER DEFAULT 0,
  unemployment_insurance INTEGER DEFAULT 0,
  
  -- Employer insurance contributions
  employer_social_insurance INTEGER DEFAULT 0,
  employer_health_insurance INTEGER DEFAULT 0,
  employer_unemployment_insurance INTEGER DEFAULT 0,
  
  -- Tax calculation
  taxable_income INTEGER DEFAULT 0,
  personal_deduction INTEGER DEFAULT 11000000,
  dependent_deduction INTEGER DEFAULT 0,
  pit INTEGER DEFAULT 0,
  
  -- Final amounts
  total_deductions INTEGER DEFAULT 0,
  net_salary INTEGER DEFAULT 0,
  
  -- Status & workflow
  status VARCHAR(20) DEFAULT 'calculated' CHECK (status IN ('calculated', 'approved', 'paid')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank_transfer')),
  paid_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one payroll record per employee per period
  UNIQUE (store_id, employee_id, period_month, period_year)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payroll_store_period ON payroll(store_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);

-- Enable RLS on payroll
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll
CREATE POLICY "Users can view payroll in their store" ON payroll
  FOR SELECT
  USING (store_id = get_current_user_store_id());

CREATE POLICY "Managers can manage payroll" ON payroll
  FOR ALL
  USING (store_id = get_current_user_store_id() AND is_owner_or_manager());

-- Add expense category if expenses table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50);
  END IF;
END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_updated_at ON payroll;
CREATE TRIGGER trigger_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_updated_at();
