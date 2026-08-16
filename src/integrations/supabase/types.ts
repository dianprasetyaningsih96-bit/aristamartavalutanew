export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          company_name: string
          id: boolean
          prevent_oversell: boolean | null
          shift_pagi_end: string | null
          shift_pagi_start: string | null
          shift_siang_end: string | null
          shift_siang_start: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_name?: string
          id?: boolean
          prevent_oversell?: boolean | null
          shift_pagi_end?: string | null
          shift_pagi_start?: string | null
          shift_siang_end?: string | null
          shift_siang_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_name?: string
          id?: boolean
          prevent_oversell?: boolean | null
          shift_pagi_end?: string | null
          shift_pagi_start?: string | null
          shift_siang_end?: string | null
          shift_siang_start?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          action: string
          branch_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string | null
          id: string
          metadata: Json | null
          payload: Json | null
          reason: string
          reference_id: string | null
          reference_table: string | null
          request_no: string
          requested_at: string | null
          requested_by: string | null
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action: string
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json | null
          reason: string
          reference_id?: string | null
          reference_table?: string | null
          request_no: string
          requested_at?: string | null
          requested_by?: string | null
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action?: string
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json | null
          reason?: string
          reference_id?: string | null
          reference_table?: string | null
          request_no?: string
          requested_at?: string | null
          requested_by?: string | null
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      branch_transfers: {
        Row: {
          amount: number
          branch_id: string
          created_at: string | null
          currency_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          shift_id: string | null
          status: string
          target_branch_id: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string | null
          currency_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          shift_id?: string | null
          status?: string
          target_branch_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string | null
          currency_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          shift_id?: string | null
          status?: string
          target_branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_transfers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_transfers_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_transfers_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_transfers_target_branch_id_fkey"
            columns: ["target_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_head_office: boolean | null
          license_no: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_head_office?: boolean | null
          license_no?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_head_office?: boolean | null
          license_no?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_balances: {
        Row: {
          balance: number
          branch_id: string
          currency_id: string
          historical_idr_balance: number | null
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          branch_id: string
          currency_id: string
          historical_idr_balance?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          branch_id?: string
          currency_id?: string
          historical_idr_balance?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_balances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          balance_after: number | null
          branch_id: string
          created_at: string
          created_by: string | null
          currency_id: string
          id: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes: string | null
          reference_id: string | null
          reference_no: string | null
          reference_table: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          currency_id: string
          id?: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_table?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          country: string | null
          created_at: string
          decimals: number
          id: string
          is_active: boolean
          name: string
          symbol: string | null
          updated_at: string
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          name: string
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          name?: string
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_documents: {
        Row: {
          customer_id: string
          doc_type: string
          file_name: string | null
          file_path: string
          id: string
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          customer_id: string
          doc_type: string
          file_name?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          customer_id?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          blacklist_reason: string | null
          branch_id: string | null
          business_type: string | null
          city: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          customer_code: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          date_of_birth: string | null
          email: string | null
          employer: string | null
          full_name: string
          gender: string | null
          id: string
          id_expiry_date: string | null
          id_number: string
          id_type: Database["public"]["Enums"]["id_document_type"]
          is_blacklisted: boolean
          is_pep: boolean
          kyc_notes: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at: string | null
          kyc_verified_by: string | null
          monthly_income_range: string | null
          nationality: string | null
          npwp_number: string | null
          occupation: string | null
          pep_notes: string | null
          phone: string | null
          place_of_birth: string | null
          postal_code: string | null
          province: string | null
          purpose_of_transaction: string | null
          risk_rating: Database["public"]["Enums"]["risk_rating"]
          source_of_funds: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blacklist_reason?: string | null
          branch_id?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_code: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_expiry_date?: string | null
          id_number: string
          id_type?: Database["public"]["Enums"]["id_document_type"]
          is_blacklisted?: boolean
          is_pep?: boolean
          kyc_notes?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          monthly_income_range?: string | null
          nationality?: string | null
          npwp_number?: string | null
          occupation?: string | null
          pep_notes?: string | null
          phone?: string | null
          place_of_birth?: string | null
          postal_code?: string | null
          province?: string | null
          purpose_of_transaction?: string | null
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          source_of_funds?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blacklist_reason?: string | null
          branch_id?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_expiry_date?: string | null
          id_number?: string
          id_type?: Database["public"]["Enums"]["id_document_type"]
          is_blacklisted?: boolean
          is_pep?: boolean
          kyc_notes?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          monthly_income_range?: string | null
          nationality?: string | null
          npwp_number?: string | null
          occupation?: string | null
          pep_notes?: string | null
          phone?: string | null
          place_of_birth?: string | null
          postal_code?: string | null
          province?: string | null
          purpose_of_transaction?: string | null
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          source_of_funds?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      dttot_list: {
        Row: {
          address: string | null
          aliases: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          entity_type: string | null
          full_name: string
          id: string
          identity_number: string | null
          is_active: boolean
          listed_at: string | null
          nationality: string | null
          notes: string | null
          place_of_birth: string | null
          reference_code: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          aliases?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          entity_type?: string | null
          full_name: string
          id?: string
          identity_number?: string | null
          is_active?: boolean
          listed_at?: string | null
          nationality?: string | null
          notes?: string | null
          place_of_birth?: string | null
          reference_code?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          aliases?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          entity_type?: string | null
          full_name?: string
          id?: string
          identity_number?: string | null
          is_active?: boolean
          listed_at?: string | null
          nationality?: string | null
          notes?: string | null
          place_of_birth?: string | null
          reference_code?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rate_logs: {
        Row: {
          action_type: string
          branch_name: string | null
          changed_at: string | null
          changed_by: string | null
          currency_code: string | null
          id: string
          new_buy_rate: number | null
          new_sell_rate: number | null
          old_buy_rate: number | null
          old_sell_rate: number | null
          rate_id: string | null
        }
        Insert: {
          action_type: string
          branch_name?: string | null
          changed_at?: string | null
          changed_by?: string | null
          currency_code?: string | null
          id?: string
          new_buy_rate?: number | null
          new_sell_rate?: number | null
          old_buy_rate?: number | null
          old_sell_rate?: number | null
          rate_id?: string | null
        }
        Update: {
          action_type?: string
          branch_name?: string | null
          changed_at?: string | null
          changed_by?: string | null
          currency_code?: string | null
          id?: string
          new_buy_rate?: number | null
          new_sell_rate?: number | null
          old_buy_rate?: number | null
          old_sell_rate?: number | null
          rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          branch_id: string | null
          buy_rate: number
          created_at: string
          created_by: string | null
          currency_id: string
          effective_date: string
          id: string
          is_active: boolean
          note: string | null
          sell_rate: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          buy_rate: number
          created_at?: string
          created_by?: string | null
          currency_id: string
          effective_date?: string
          id?: string
          is_active?: boolean
          note?: string | null
          sell_rate: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          buy_rate?: number
          created_at?: string
          created_by?: string | null
          currency_id?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          note?: string | null
          sell_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      mid_rates: {
        Row: {
          created_at: string
          created_by: string | null
          currency_id: string
          id: string
          mid_rate: number
          note: string | null
          notes: string | null
          period_month: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_id: string
          id?: string
          mid_rate: number
          note?: string | null
          notes?: string | null
          period_month: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_id?: string
          id?: string
          mid_rate?: number
          note?: string | null
          notes?: string | null
          period_month?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mid_rates_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_balances: {
        Row: {
          branch_id: string
          created_at: string | null
          currency_id: string
          id: string
          opening_balance_foreign: number
          opening_balance_idr: number
          period_month: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          currency_id: string
          id?: string
          opening_balance_foreign?: number
          opening_balance_idr?: number
          period_month: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          currency_id?: string
          id?: string
          opening_balance_foreign?: number
          opening_balance_idr?: number
          period_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_balances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          branch_id: string | null
          created_at: string
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          report_month: string
          report_type: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_month: string
          report_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_month?: string
          report_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch_id: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read_by: string[]
          reference_id: string | null
          reference_table: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read_by?: string[]
          reference_id?: string | null
          reference_table?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read_by?: string[]
          reference_id?: string | null
          reference_table?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_reconciliations: {
        Row: {
          actual_amount: number
          created_at: string
          currency_id: string
          difference: number
          expected_amount: number
          id: string
          notes: string | null
          shift_id: string
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          currency_id: string
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          shift_id: string
        }
        Update: {
          actual_amount?: number
          created_at?: string
          currency_id?: string
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_reconciliations_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_reconciliations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string
          closed_at: string | null
          closed_by: string | null
          closing_cash_idr: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_cash_idr: number
          period: Database["public"]["Enums"]["shift_period"]
          shift_date: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_idr?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_cash_idr?: number
          period: Database["public"]["Enums"]["shift_period"]
          shift_date?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_idr?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash_idr?: number
          period?: Database["public"]["Enums"]["shift_period"]
          shift_date?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          branch_id: string | null
          created_at: string
          currency_id: string
          customer_id: string | null
          foreign_amount: number
          id: string
          idr_amount: number
          is_suspicious: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          rate: number
          status: Database["public"]["Enums"]["transaction_status"]
          teller_id: string | null
          transaction_date: string
          transaction_no: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          currency_id: string
          customer_id?: string | null
          foreign_amount: number
          id?: string
          idr_amount: number
          is_suspicious?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          rate: number
          status?: Database["public"]["Enums"]["transaction_status"]
          teller_id?: string | null
          transaction_date?: string
          transaction_no: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          currency_id?: string
          customer_id?: string | null
          foreign_amount?: number
          id?: string
          idr_amount?: number
          is_suspicious?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          rate?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          teller_id?: string | null
          transaction_date?: string
          transaction_no?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_teller_id_fkey"
            columns: ["teller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_ltkm_threshold_transactions: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          created_at: string | null
          currency_code: string | null
          currency_id: string | null
          customer_id: string | null
          customer_name: string | null
          foreign_amount: number | null
          id: string | null
          idr_amount: number | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          rate: number | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          teller_id: string | null
          transaction_date: string | null
          transaction_no: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_teller_id_fkey"
            columns: ["teller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_change_password: {
        Args: { _new_password: string; _user_id: string }
        Returns: boolean
      }
      admin_confirm_user: { Args: { _user_id: string }; Returns: undefined }
      calculate_monthly_opening: {
        Args: { p_branch_id: string; p_target_month: string }
        Returns: undefined
      }
      get_lkub_data: {
        Args: { p_branch_id: string; p_period_month: string }
        Returns: {
          currency_code: string
          currency_id: string
          mid_rate: number
          saldo_awal_idr: number
          saldo_awal_valas: number
          volume_beli_idr: number
          volume_beli_valas: number
          volume_jual_idr: number
          volume_jual_valas: number
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          roles: string[]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: { Args: { _id: string }; Returns: undefined }
      process_branch_transfer: {
        Args: { p_notes?: string; p_status: string; transfer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "branch_manager"
        | "teller"
        | "auditor"
        | "owner"
      approval_action:
        | "void_transaction"
        | "rate_override"
        | "threshold_override"
        | "other"
      approval_status: "pending" | "approved" | "rejected" | "cancelled"
      cash_movement_type:
        | "opening"
        | "buy"
        | "sell"
        | "deposit"
        | "withdrawal"
        | "adjustment"
        | "closing"
        | "transfer_in"
        | "transfer_out"
      customer_type: "individual" | "corporate"
      id_document_type: "ktp" | "passport" | "kitas" | "sim" | "npwp" | "other"
      kyc_status: "pending" | "verified" | "rejected" | "expired"
      notification_category:
        | "ltkt_threshold"
        | "ltkm_suspicious"
        | "dttot_attempt"
        | "low_cash"
        | "approval_request"
        | "approval_decision"
        | "system"
      notification_severity: "info" | "warning" | "critical"
      payment_method: "cash" | "transfer" | "other"
      risk_rating: "low" | "medium" | "high"
      shift_period: "pagi" | "siang"
      shift_status: "open" | "closed"
      transaction_status: "draft" | "completed" | "voided"
      transaction_type: "buy" | "sell"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "branch_manager", "teller", "auditor", "owner"],
      approval_action: [
        "void_transaction",
        "rate_override",
        "threshold_override",
        "other",
      ],
      approval_status: ["pending", "approved", "rejected", "cancelled"],
      cash_movement_type: [
        "opening",
        "buy",
        "sell",
        "deposit",
        "withdrawal",
        "adjustment",
        "closing",
        "transfer_in",
        "transfer_out",
      ],
      customer_type: ["individual", "corporate"],
      id_document_type: ["ktp", "passport", "kitas", "sim", "npwp", "other"],
      kyc_status: ["pending", "verified", "rejected", "expired"],
      notification_category: [
        "ltkt_threshold",
        "ltkm_suspicious",
        "dttot_attempt",
        "low_cash",
        "approval_request",
        "approval_decision",
        "system",
      ],
      notification_severity: ["info", "warning", "critical"],
      payment_method: ["cash", "transfer", "other"],
      risk_rating: ["low", "medium", "high"],
      shift_period: ["pagi", "siang"],
      shift_status: ["open", "closed"],
      transaction_status: ["draft", "completed", "voided"],
      transaction_type: ["buy", "sell"],
    },
  },
} as const
