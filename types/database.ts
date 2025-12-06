export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          name: string
          tax_code: string | null
          address: string | null
          phone: string | null
          email: string | null
          revenue_tier: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
          e_invoice_required: boolean
          e_invoice_provider: string | null
          e_invoice_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tax_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          revenue_tier?: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
          e_invoice_required?: boolean
          e_invoice_provider?: string | null
          e_invoice_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tax_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          revenue_tier?: 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'
          e_invoice_required?: boolean
          e_invoice_provider?: string | null
          e_invoice_config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          store_id: string | null
          name: string | null
          phone: string | null
          role: 'owner' | 'manager' | 'staff'
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          store_id?: string | null
          name?: string | null
          phone?: string | null
          role?: 'owner' | 'manager' | 'staff'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string | null
          name?: string | null
          phone?: string | null
          role?: 'owner' | 'manager' | 'staff'
          active?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          store_id: string
          name: string
          parent_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          category_id: string | null
          sku: string | null
          barcode: string | null
          name: string
          unit: string
          cost_price: number
          sell_price: number
          vat_rate: number
          quantity: number
          min_stock: number
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          category_id?: string | null
          sku?: string | null
          barcode?: string | null
          name: string
          unit?: string
          cost_price?: number
          sell_price: number
          vat_rate?: number
          quantity?: number
          min_stock?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          category_id?: string | null
          sku?: string | null
          barcode?: string | null
          name?: string
          unit?: string
          cost_price?: number
          sell_price?: number
          vat_rate?: number
          quantity?: number
          min_stock?: number
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          store_id: string
          user_id: string | null
          invoice_no: string | null
          subtotal: number
          vat_amount: number
          discount: number
          total: number
          status: 'pending' | 'completed' | 'cancelled' | 'refunded'
          customer_name: string | null
          customer_phone: string | null
          customer_tax_code: string | null
          note: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          user_id?: string | null
          invoice_no?: string | null
          subtotal?: number
          vat_amount?: number
          discount?: number
          total?: number
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          customer_name?: string | null
          customer_phone?: string | null
          customer_tax_code?: string | null
          note?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string | null
          invoice_no?: string | null
          subtotal?: number
          vat_amount?: number
          discount?: number
          total?: number
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          customer_name?: string | null
          customer_phone?: string | null
          customer_tax_code?: string | null
          note?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          vat_rate: number
          vat_amount: number
          discount: number
          total: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          vat_rate?: number
          vat_amount?: number
          discount?: number
          total: number
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          vat_rate?: number
          vat_amount?: number
          discount?: number
          total?: number
        }
      }
      payments: {
        Row: {
          id: string
          sale_id: string
          method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
          amount: number
          bank_account_id: string | null
          bank_ref: string | null
          paid_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
          amount: number
          bank_account_id?: string | null
          bank_ref?: string | null
          paid_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          method?: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay'
          amount?: number
          bank_account_id?: string | null
          bank_ref?: string | null
          paid_at?: string
        }
      }
      bank_accounts: {
        Row: {
          id: string
          store_id: string
          bank_name: string
          account_number: string
          account_name: string | null
          branch: string | null
          is_default: boolean
          balance: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          bank_name: string
          account_number: string
          account_name?: string | null
          branch?: string | null
          is_default?: boolean
          balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          bank_name?: string
          account_number?: string
          account_name?: string | null
          branch?: string | null
          is_default?: boolean
          balance?: number
          created_at?: string
        }
      }
      cash_book: {
        Row: {
          id: string
          store_id: string
          transaction_date: string
          voucher_no: string | null
          description: string | null
          reference_type: 'sale' | 'expense' | 'adjustment' | 'salary' | null
          reference_id: string | null
          debit: number
          credit: number
          balance: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          transaction_date?: string
          voucher_no?: string | null
          description?: string | null
          reference_type?: 'sale' | 'expense' | 'adjustment' | 'salary' | null
          reference_id?: string | null
          debit?: number
          credit?: number
          balance?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          transaction_date?: string
          voucher_no?: string | null
          description?: string | null
          reference_type?: 'sale' | 'expense' | 'adjustment' | 'salary' | null
          reference_id?: string | null
          debit?: number
          credit?: number
          balance?: number
          created_by?: string | null
          created_at?: string
        }
      }
      bank_book: {
        Row: {
          id: string
          store_id: string
          bank_account_id: string | null
          transaction_date: string
          voucher_no: string | null
          description: string | null
          reference_type: string | null
          reference_id: string | null
          debit: number
          credit: number
          balance: number
          bank_ref: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          bank_account_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          debit?: number
          credit?: number
          balance?: number
          bank_ref?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          bank_account_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          debit?: number
          credit?: number
          balance?: number
          bank_ref?: string | null
          created_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          store_id: string
          name: string
          code: string | null
          is_deductible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          code?: string | null
          is_deductible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          code?: string | null
          is_deductible?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          store_id: string
          category_id: string | null
          description: string | null
          amount: number
          vat_amount: number
          payment_method: 'cash' | 'bank_transfer' | null
          bank_account_id: string | null
          invoice_no: string | null
          supplier_name: string | null
          supplier_tax_code: string | null
          expense_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          category_id?: string | null
          description?: string | null
          amount: number
          vat_amount?: number
          payment_method?: 'cash' | 'bank_transfer' | null
          bank_account_id?: string | null
          invoice_no?: string | null
          supplier_name?: string | null
          supplier_tax_code?: string | null
          expense_date?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          category_id?: string | null
          description?: string | null
          amount?: number
          vat_amount?: number
          payment_method?: 'cash' | 'bank_transfer' | null
          bank_account_id?: string | null
          invoice_no?: string | null
          supplier_name?: string | null
          supplier_tax_code?: string | null
          expense_date?: string
          created_by?: string | null
          created_at?: string
        }
      }
      inventory_logs: {
        Row: {
          id: string
          store_id: string
          product_id: string | null
          type: 'import' | 'export' | 'sale' | 'return' | 'adjustment'
          quantity: number
          unit_cost: number | null
          total_value: number | null
          reference_type: string | null
          reference_id: string | null
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id?: string | null
          type: 'import' | 'export' | 'sale' | 'return' | 'adjustment'
          quantity: number
          unit_cost?: number | null
          total_value?: number | null
          reference_type?: string | null
          reference_id?: string | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string | null
          type?: 'import' | 'export' | 'sale' | 'return' | 'adjustment'
          quantity?: number
          unit_cost?: number | null
          total_value?: number | null
          reference_type?: string | null
          reference_id?: string | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          store_id: string
          user_id: string | null
          name: string
          phone: string | null
          id_card: string | null
          position: string | null
          base_salary: number
          allowances: number
          dependents: number
          hire_date: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id?: string | null
          name: string
          phone?: string | null
          id_card?: string | null
          position?: string | null
          base_salary?: number
          allowances?: number
          dependents?: number
          hire_date?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string | null
          name?: string
          phone?: string | null
          id_card?: string | null
          position?: string | null
          base_salary?: number
          allowances?: number
          dependents?: number
          hire_date?: string | null
          active?: boolean
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          work_date: string
          check_in: string | null
          check_out: string | null
          status: 'present' | 'absent' | 'half_day' | 'leave'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          work_date: string
          check_in?: string | null
          check_out?: string | null
          status?: 'present' | 'absent' | 'half_day' | 'leave'
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          work_date?: string
          check_in?: string | null
          check_out?: string | null
          status?: 'present' | 'absent' | 'half_day' | 'leave'
          note?: string | null
          created_at?: string
        }
      }
      salary_records: {
        Row: {
          id: string
          employee_id: string
          period_month: number
          period_year: number
          working_days: number
          base_salary: number
          allowances: number
          overtime_pay: number
          gross_salary: number
          social_insurance: number
          health_insurance: number
          unemployment_insurance: number
          pit: number
          deductions: number
          net_salary: number
          payment_method: string | null
          paid_date: string | null
          status: 'draft' | 'approved' | 'paid'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period_month: number
          period_year: number
          working_days?: number
          base_salary?: number
          allowances?: number
          overtime_pay?: number
          gross_salary?: number
          social_insurance?: number
          health_insurance?: number
          unemployment_insurance?: number
          pit?: number
          deductions?: number
          net_salary?: number
          payment_method?: string | null
          paid_date?: string | null
          status?: 'draft' | 'approved' | 'paid'
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period_month?: number
          period_year?: number
          working_days?: number
          base_salary?: number
          allowances?: number
          overtime_pay?: number
          gross_salary?: number
          social_insurance?: number
          health_insurance?: number
          unemployment_insurance?: number
          pit?: number
          deductions?: number
          net_salary?: number
          payment_method?: string | null
          paid_date?: string | null
          status?: 'draft' | 'approved' | 'paid'
          created_at?: string
        }
      }
      e_invoices: {
        Row: {
          id: string
          sale_id: string | null
          store_id: string | null
          invoice_symbol: string | null
          invoice_no: string | null
          issue_date: string | null
          provider: 'misa' | 'viettel' | 'sapo' | 'vnpt' | null
          provider_invoice_id: string | null
          tax_authority_code: string | null
          lookup_code: string | null
          qr_code: string | null
          pdf_url: string | null
          xml_content: string | null
          status: 'pending' | 'issued' | 'cancelled' | 'error'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_id?: string | null
          store_id?: string | null
          invoice_symbol?: string | null
          invoice_no?: string | null
          issue_date?: string | null
          provider?: 'misa' | 'viettel' | 'sapo' | 'vnpt' | null
          provider_invoice_id?: string | null
          tax_authority_code?: string | null
          lookup_code?: string | null
          qr_code?: string | null
          pdf_url?: string | null
          xml_content?: string | null
          status?: 'pending' | 'issued' | 'cancelled' | 'error'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string | null
          store_id?: string | null
          invoice_symbol?: string | null
          invoice_no?: string | null
          issue_date?: string | null
          provider?: 'misa' | 'viettel' | 'sapo' | 'vnpt' | null
          provider_invoice_id?: string | null
          tax_authority_code?: string | null
          lookup_code?: string | null
          qr_code?: string | null
          pdf_url?: string | null
          xml_content?: string | null
          status?: 'pending' | 'issued' | 'cancelled' | 'error'
          error_message?: string | null
          created_at?: string
        }
      }
      tax_obligations: {
        Row: {
          id: string
          store_id: string
          period_type: 'monthly' | 'quarterly'
          period_start: string
          period_end: string
          total_revenue: number
          vat_collected: number
          vat_deductible: number
          vat_payable: number
          pit_base: number
          pit_rate: number
          pit_payable: number
          total_tax: number
          status: 'draft' | 'declared' | 'paid'
          declared_at: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          period_type?: 'monthly' | 'quarterly'
          period_start: string
          period_end: string
          total_revenue?: number
          vat_collected?: number
          vat_deductible?: number
          vat_payable?: number
          pit_base?: number
          pit_rate?: number
          pit_payable?: number
          total_tax?: number
          status?: 'draft' | 'declared' | 'paid'
          declared_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          period_type?: 'monthly' | 'quarterly'
          period_start?: string
          period_end?: string
          total_revenue?: number
          vat_collected?: number
          vat_deductible?: number
          vat_payable?: number
          pit_base?: number
          pit_rate?: number
          pit_payable?: number
          total_tax?: number
          status?: 'draft' | 'declared' | 'paid'
          declared_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
      sync_queue: {
        Row: {
          id: string
          store_id: string | null
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          payload: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          store_id?: string | null
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          payload: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string | null
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          payload?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
