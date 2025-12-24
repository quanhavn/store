export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          note: string | null
          status: string | null
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          note?: string | null
          status?: string | null
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          note?: string | null
          status?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          balance: number | null
          bank_name: string
          branch: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          store_id: string | null
        }
        Insert: {
          account_name?: string | null
          account_number: string
          balance?: number | null
          bank_name: string
          branch?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          store_id?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string
          balance?: number | null
          bank_name?: string
          branch?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_book: {
        Row: {
          balance: number | null
          bank_account_id: string | null
          bank_ref: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          transaction_date: string
          voucher_no: string | null
        }
        Insert: {
          balance?: number | null
          bank_account_id?: string | null
          bank_ref?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
        }
        Update: {
          balance?: number | null
          bank_account_id?: string | null
          bank_ref?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_book_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_book_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_book: {
        Row: {
          balance: number | null
          created_at: string | null
          created_by: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          transaction_date: string
          voucher_no: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          voucher_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_book_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_book_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      e_invoices: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          invoice_no: string | null
          invoice_symbol: string | null
          issue_date: string | null
          lookup_code: string | null
          pdf_url: string | null
          provider: string | null
          provider_invoice_id: string | null
          qr_code: string | null
          sale_id: string | null
          status: string | null
          store_id: string | null
          tax_authority_code: string | null
          xml_content: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_no?: string | null
          invoice_symbol?: string | null
          issue_date?: string | null
          lookup_code?: string | null
          pdf_url?: string | null
          provider?: string | null
          provider_invoice_id?: string | null
          qr_code?: string | null
          sale_id?: string | null
          status?: string | null
          store_id?: string | null
          tax_authority_code?: string | null
          xml_content?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_no?: string | null
          invoice_symbol?: string | null
          issue_date?: string | null
          lookup_code?: string | null
          pdf_url?: string | null
          provider?: string | null
          provider_invoice_id?: string | null
          qr_code?: string | null
          sale_id?: string | null
          status?: string | null
          store_id?: string | null
          tax_authority_code?: string | null
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "e_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          allowances: number | null
          base_salary: number | null
          created_at: string | null
          dependents: number | null
          hire_date: string | null
          id: string
          id_card: string | null
          name: string
          phone: string | null
          position: string | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          dependents?: number | null
          hire_date?: string | null
          id?: string
          id_card?: string | null
          name: string
          phone?: string | null
          position?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          dependents?: number | null
          hire_date?: string | null
          id?: string
          id_card?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_deductible: boolean | null
          name: string
          store_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_deductible?: boolean | null
          name: string
          store_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_deductible?: boolean | null
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string | null
          id: string
          invoice_no: string | null
          payment_method: string | null
          store_id: string | null
          supplier_name: string | null
          supplier_tax_code: string | null
          vat_amount: number | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_no?: string | null
          payment_method?: string | null
          store_id?: string | null
          supplier_name?: string | null
          supplier_tax_code?: string | null
          vat_amount?: number | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_no?: string | null
          payment_method?: string | null
          store_id?: string | null
          supplier_name?: string | null
          supplier_tax_code?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          total_value: number | null
          type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          total_value?: number | null
          type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          total_value?: number | null
          type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_ref: string | null
          id: string
          method: string
          paid_at: string | null
          sale_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_ref?: string | null
          id?: string
          method: string
          paid_at?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_ref?: string | null
          id?: string
          method?: string
          paid_at?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          image_url: string | null
          min_stock: number | null
          name: string
          quantity: number | null
          sell_price: number
          sku: string | null
          store_id: string | null
          unit: string | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number | null
          name: string
          quantity?: number | null
          sell_price: number
          sku?: string | null
          store_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number | null
          name?: string
          quantity?: number | null
          sell_price?: number
          sku?: string | null
          store_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          allowances: number | null
          base_salary: number | null
          created_at: string | null
          deductions: number | null
          employee_id: string | null
          gross_salary: number | null
          health_insurance: number | null
          id: string
          net_salary: number | null
          overtime_pay: number | null
          paid_date: string | null
          payment_method: string | null
          period_month: number
          period_year: number
          pit: number | null
          social_insurance: number | null
          status: string | null
          unemployment_insurance: number | null
          working_days: number | null
        }
        Insert: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string | null
          gross_salary?: number | null
          health_insurance?: number | null
          id?: string
          net_salary?: number | null
          overtime_pay?: number | null
          paid_date?: string | null
          payment_method?: string | null
          period_month: number
          period_year: number
          pit?: number | null
          social_insurance?: number | null
          status?: string | null
          unemployment_insurance?: number | null
          working_days?: number | null
        }
        Update: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string | null
          gross_salary?: number | null
          health_insurance?: number | null
          id?: string
          net_salary?: number | null
          overtime_pay?: number | null
          paid_date?: string | null
          payment_method?: string | null
          period_month?: number
          period_year?: number
          pit?: number | null
          social_insurance?: number | null
          status?: string | null
          unemployment_insurance?: number | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount: number | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string | null
          total: number
          unit_price: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          discount?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id?: string | null
          total: number
          unit_price: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          discount?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string | null
          total?: number
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_tax_code: string | null
          discount: number | null
          id: string
          invoice_no: string | null
          note: string | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          total: number | null
          user_id: string | null
          vat_amount: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_tax_code?: string | null
          discount?: number | null
          id?: string
          invoice_no?: string | null
          note?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
          vat_amount?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_tax_code?: string | null
          discount?: number | null
          id?: string
          invoice_no?: string | null
          note?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string | null
          e_invoice_config: Json | null
          e_invoice_provider: string | null
          e_invoice_required: boolean | null
          email: string | null
          id: string
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          revenue_tier: string | null
          tax_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          e_invoice_config?: Json | null
          e_invoice_provider?: string | null
          e_invoice_required?: boolean | null
          email?: string | null
          id?: string
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          revenue_tier?: string | null
          tax_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          e_invoice_config?: Json | null
          e_invoice_provider?: string | null
          e_invoice_required?: boolean | null
          email?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          revenue_tier?: string | null
          tax_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          processed_at: string | null
          record_id: string | null
          status: string | null
          store_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          record_id?: string | null
          status?: string | null
          store_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          record_id?: string | null
          status?: string | null
          store_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_obligations: {
        Row: {
          created_at: string | null
          declared_at: string | null
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          period_type: string | null
          pit_base: number | null
          pit_payable: number | null
          pit_rate: number | null
          status: string | null
          store_id: string | null
          total_revenue: number | null
          total_tax: number | null
          vat_collected: number | null
          vat_deductible: number | null
          vat_payable: number | null
        }
        Insert: {
          created_at?: string | null
          declared_at?: string | null
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          period_type?: string | null
          pit_base?: number | null
          pit_payable?: number | null
          pit_rate?: number | null
          status?: string | null
          store_id?: string | null
          total_revenue?: number | null
          total_tax?: number | null
          vat_collected?: number | null
          vat_deductible?: number | null
          vat_payable?: number | null
        }
        Update: {
          created_at?: string | null
          declared_at?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          period_type?: string | null
          pit_base?: number | null
          pit_payable?: number | null
          pit_rate?: number | null
          status?: string | null
          store_id?: string | null
          total_revenue?: number | null
          total_tax?: number | null
          vat_collected?: number | null
          vat_deductible?: number | null
          vat_payable?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_obligations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          store_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
          store_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_no: {
        Args: {
          store_id: string
        }
        Returns: string
      }
      register_store_and_user: {
        Args: {
          p_store_name: string
          p_phone: string
        }
        Returns: {
          success: boolean
          store_id: string
          user_id: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Custom types for new tables (product variants and units)
// These extend the auto-generated types until Supabase CLI regenerates them

export interface ProductUnit {
  id: string
  product_id: string
  unit_name: string
  conversion_rate: number
  barcode: string | null
  sell_price: number | null
  cost_price: number | null
  is_base_unit: boolean
  is_default: boolean
  active: boolean
  created_at: string
}

export interface ProductAttribute {
  id: string
  store_id: string
  name: string
  display_order: number
  created_at: string
  values?: ProductAttributeValue[]
}

export interface ProductAttributeValue {
  id: string
  attribute_id: string
  value: string
  display_order: number
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string | null
  quantity: number
  min_stock: number | null
  image_url: string | null
  active: boolean
  created_at: string
  updated_at: string
  attributes?: ProductVariantAttribute[]
  variant_units?: VariantUnit[]
  // Optional fields populated by backend when joining with variant_units
  sell_price?: number | null
  cost_price?: number | null
  sku?: string | null
  barcode?: string | null
}

export interface VariantUnit {
  id: string
  variant_id: string
  unit_id: string
  sell_price: number | null
  cost_price: number | null
  barcode: string | null
  sku: string | null
  active: boolean
  created_at: string
  unit?: ProductUnit
}

export interface VariantUnitCombination {
  product_id: string
  product_name: string
  variant_id: string
  variant_name: string
  variant_quantity: number
  variant_sell_price: number | null
  variant_cost_price: number | null
  unit_id: string
  unit_name: string
  conversion_rate: number
  is_base_unit: boolean
  variant_unit_id: string | null
  effective_sell_price: number
  effective_cost_price: number
  effective_barcode: string | null
  effective_sku?: string | null
  display_name: string
}

export interface ProductVariantAttribute {
  id: string
  variant_id: string
  attribute_id: string
  attribute_value_id: string
  attribute?: ProductAttribute
  attribute_value?: ProductAttributeValue
}

// Extended product type with variants and units
export interface ProductWithVariants {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  cost_price: number | null
  sell_price: number
  vat_rate: number | null
  quantity: number | null
  min_stock: number | null
  unit: string | null
  image_url: string | null
  active: boolean | null
  has_variants: boolean
  has_units: boolean
  store_id: string | null
  created_at: string | null
  updated_at: string | null
  categories?: { id: string; name: string }
  variants?: ProductVariant[]
  units?: ProductUnit[]
  variant_unit_combinations?: VariantUnitCombination[]
}

// Stock check types
export interface StockCheck {
  id: string
  store_id: string
  status: 'in_progress' | 'completed' | 'cancelled'
  started_at: string
  completed_at: string | null
  created_by: string
  note: string | null
}

export interface StockCheckItem {
  id: string
  stock_check_id: string
  product_id: string
  variant_id: string | null
  system_quantity: number
  actual_quantity: number | null
  difference: number
  note: string | null
  checked_at: string | null
  product?: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    unit: string | null
  }
  variant?: ProductVariant
}

