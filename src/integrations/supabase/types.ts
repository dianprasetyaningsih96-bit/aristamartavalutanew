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
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_name?: string
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_name?: string
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          reference_id: string | null
          reference_table: string | null
          request_no: string
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          reference_id?: string | null
          reference_table?: string | null
          request_no: string
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          reference_id?: string | null
          reference_table?: string | null
          request_no?: string
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
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
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          branch_id: string
          currency_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          branch_id?: string
          currency_id?: string
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
          balance_after: number
          branch_id: string
          created_at: string
          created_by: string | null
          currency_id: string
          id: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes: string | null
          reference_id: string | null
          reference_table: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          currency_id: string
          id?: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          reference_id?: string | null
          reference_table?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          reference_id?: string | null
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
      transactions: {
        Row: {
          branch_id: string | null
          created_at: string
          currency_id: string
          customer_id: string | null
          foreign_amount: number
          id: string
          idr_amount: number
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
        ]
      }
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      customer_type: "individual" | "corporate"
      id_document_type: "ktp" | "passport" | "kitas" | "sim" | "npwp" | "other"
      kyc_status: "pending" | "verified" | "rejected" | "expired"
      payment_method: "cash" | "transfer" | "other"
      risk_rating: "low" | "medium" | "high"
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
      ],
      customer_type: ["individual", "corporate"],
      id_document_type: ["ktp", "passport", "kitas", "sim", "npwp", "other"],
      kyc_status: ["pending", "verified", "rejected", "expired"],
      payment_method: ["cash", "transfer", "other"],
      risk_rating: ["low", "medium", "high"],
      transaction_status: ["draft", "completed", "voided"],
      transaction_type: ["buy", "sell"],
    },
  },
} as const
