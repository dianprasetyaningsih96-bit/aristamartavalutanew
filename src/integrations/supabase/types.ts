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
      [_ in never]: never
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
      customer_type: "individual" | "corporate"
      id_document_type: "ktp" | "passport" | "kitas" | "sim" | "npwp" | "other"
      kyc_status: "pending" | "verified" | "rejected" | "expired"
      risk_rating: "low" | "medium" | "high"
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
      customer_type: ["individual", "corporate"],
      id_document_type: ["ktp", "passport", "kitas", "sim", "npwp", "other"],
      kyc_status: ["pending", "verified", "rejected", "expired"],
      risk_rating: ["low", "medium", "high"],
    },
  },
} as const
