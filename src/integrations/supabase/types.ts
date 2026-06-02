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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      carriers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          mc_number: string | null
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          mc_number?: string | null
          name?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          mc_number?: string | null
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          carrier_id: string | null
          created_at: string
          due: number
          due_date: string
          fee_amount: number
          fee_pct: number
          gross: number
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          pdf_url: string | null
          status: string
          template_id: string | null
          user_id: string
          xlsx_url: string | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string
          due?: number
          due_date?: string
          fee_amount?: number
          fee_pct?: number
          gross?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          pdf_url?: string | null
          status?: string
          template_id?: string | null
          user_id: string
          xlsx_url?: string | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string
          due?: number
          due_date?: string
          fee_amount?: number
          fee_pct?: number
          gross?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          pdf_url?: string | null
          status?: string
          template_id?: string | null
          user_id?: string
          xlsx_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          broker: string | null
          carrier_id: string | null
          created_at: string
          delivery_city: string | null
          delivery_state: string | null
          id: string
          invoice_id: string | null
          load_number: string | null
          pickup_city: string | null
          pickup_date: string | null
          pickup_state: string | null
          rate: number
          raw_extraction: Json | null
          source_file_url: string | null
          user_id: string
        }
        Insert: {
          broker?: string | null
          carrier_id?: string | null
          created_at?: string
          delivery_city?: string | null
          delivery_state?: string | null
          id?: string
          invoice_id?: string | null
          load_number?: string | null
          pickup_city?: string | null
          pickup_date?: string | null
          pickup_state?: string | null
          rate?: number
          raw_extraction?: Json | null
          source_file_url?: string | null
          user_id: string
        }
        Update: {
          broker?: string | null
          carrier_id?: string | null
          created_at?: string
          delivery_city?: string | null
          delivery_state?: string | null
          id?: string
          invoice_id?: string | null
          load_number?: string | null
          pickup_city?: string | null
          pickup_date?: string | null
          pickup_state?: string | null
          rate?: number
          raw_extraction?: Json | null
          source_file_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loads_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          bank_transfer: string | null
          cashapp: string | null
          company_name: string | null
          created_at: string
          default_fee_pct: number
          default_template_id: string | null
          email: string | null
          invoice_counter: number
          logo_url: string | null
          phone: string | null
          sender_name: string | null
          updated_at: string
          user_id: string
          zelle: string | null
        }
        Insert: {
          address?: string | null
          bank_transfer?: string | null
          cashapp?: string | null
          company_name?: string | null
          created_at?: string
          default_fee_pct?: number
          default_template_id?: string | null
          email?: string | null
          invoice_counter?: number
          logo_url?: string | null
          phone?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id: string
          zelle?: string | null
        }
        Update: {
          address?: string | null
          bank_transfer?: string | null
          cashapp?: string | null
          company_name?: string | null
          created_at?: string
          default_fee_pct?: number
          default_template_id?: string | null
          email?: string | null
          invoice_counter?: number
          logo_url?: string | null
          phone?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id?: string
          zelle?: string | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const
