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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attestations: {
        Row: {
          collector_id: string
          created_at: string
          hcs_sequence_number: number | null
          id: string
          operator_signature: string | null
          payout_hbar: number | null
          payout_tinybar: number | null
          photo_hash: string | null
          plastic_items: Json
          station_id: string
          station_nonce: number | null
          status: string
          total_weight_grams: number
          updated_at: string
          zone: string
        }
        Insert: {
          collector_id: string
          created_at?: string
          hcs_sequence_number?: number | null
          id?: string
          operator_signature?: string | null
          payout_hbar?: number | null
          payout_tinybar?: number | null
          photo_hash?: string | null
          plastic_items?: Json
          station_id: string
          station_nonce?: number | null
          status?: string
          total_weight_grams: number
          updated_at?: string
          zone: string
        }
        Update: {
          collector_id?: string
          created_at?: string
          hcs_sequence_number?: number | null
          id?: string
          operator_signature?: string | null
          payout_hbar?: number | null
          payout_tinybar?: number | null
          photo_hash?: string | null
          plastic_items?: Json
          station_id?: string
          station_nonce?: number | null
          status?: string
          total_weight_grams?: number
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestations_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "weighing_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_events: {
        Row: {
          collectors_participating: number
          created_at: string
          description: string | null
          end_date: string
          hcs_event_sequence: number | null
          id: string
          multiplier: number
          name: string
          organizer_user_id: string
          pool_amount: number
          sponsor_name: string | null
          start_date: string
          status: string
          target_kg: number | null
          total_kg_collected: number
          updated_at: string
          zones: string[]
        }
        Insert: {
          collectors_participating?: number
          created_at?: string
          description?: string | null
          end_date: string
          hcs_event_sequence?: number | null
          id?: string
          multiplier?: number
          name: string
          organizer_user_id: string
          pool_amount?: number
          sponsor_name?: string | null
          start_date: string
          status?: string
          target_kg?: number | null
          total_kg_collected?: number
          updated_at?: string
          zones?: string[]
        }
        Update: {
          collectors_participating?: number
          created_at?: string
          description?: string | null
          end_date?: string
          hcs_event_sequence?: number | null
          id?: string
          multiplier?: number
          name?: string
          organizer_user_id?: string
          pool_amount?: number
          sponsor_name?: string | null
          start_date?: string
          status?: string
          target_kg?: number | null
          total_kg_collected?: number
          updated_at?: string
          zones?: string[]
        }
        Relationships: []
      }
      collectors: {
        Row: {
          created_at: string
          days_active: number
          did_document: Json | null
          display_name: string
          hedera_account_id: string | null
          id: string
          phone_hash: string
          reputation_score: number
          reputation_tier: number
          status: string
          total_hbar_earned: number
          total_kg_recovered: number
          unique_stations: number
          updated_at: string
          user_id: string
          zone: string
        }
        Insert: {
          created_at?: string
          days_active?: number
          did_document?: Json | null
          display_name: string
          hedera_account_id?: string | null
          id?: string
          phone_hash: string
          reputation_score?: number
          reputation_tier?: number
          status?: string
          total_hbar_earned?: number
          total_kg_recovered?: number
          unique_stations?: number
          updated_at?: string
          user_id: string
          zone: string
        }
        Update: {
          created_at?: string
          days_active?: number
          did_document?: Json | null
          display_name?: string
          hedera_account_id?: string | null
          id?: string
          phone_hash?: string
          reputation_score?: number
          reputation_tier?: number
          status?: string
          total_hbar_earned?: number
          total_kg_recovered?: number
          unique_stations?: number
          updated_at?: string
          user_id?: string
          zone?: string
        }
        Relationships: []
      }
      corporate_buyers: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string
          hedera_account_id: string | null
          id: string
          industry: string
          registration_number: string | null
          status: string
          total_hbar_spent: number
          total_prcs_owned: number
          total_prcs_retired: number
          updated_at: string
          user_id: string
          wallet_type: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          created_at?: string
          hedera_account_id?: string | null
          id?: string
          industry: string
          registration_number?: string | null
          status?: string
          total_hbar_spent?: number
          total_prcs_owned?: number
          total_prcs_retired?: number
          updated_at?: string
          user_id: string
          wallet_type?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string
          hedera_account_id?: string | null
          id?: string
          industry?: string
          registration_number?: string | null
          status?: string
          total_hbar_spent?: number
          total_prcs_owned?: number
          total_prcs_retired?: number
          updated_at?: string
          user_id?: string
          wallet_type?: string | null
        }
        Relationships: []
      }
      disputes: {
        Row: {
          attestation_id: string
          created_at: string
          description: string | null
          dispute_type: string
          evidence: string | null
          id: string
          initiator: string
          resolution: string | null
          resolved_at: string | null
          station_consequence: string | null
          status: string
          updated_at: string
          validator_votes: Json | null
        }
        Insert: {
          attestation_id: string
          created_at?: string
          description?: string | null
          dispute_type: string
          evidence?: string | null
          id?: string
          initiator: string
          resolution?: string | null
          resolved_at?: string | null
          station_consequence?: string | null
          status?: string
          updated_at?: string
          validator_votes?: Json | null
        }
        Update: {
          attestation_id?: string
          created_at?: string
          description?: string | null
          dispute_type?: string
          evidence?: string | null
          id?: string
          initiator?: string
          resolution?: string | null
          resolved_at?: string | null
          station_consequence?: string | null
          status?: string
          updated_at?: string
          validator_votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_attestation_id_fkey"
            columns: ["attestation_id"]
            isOneToOne: false
            referencedRelation: "attestations"
            referencedColumns: ["id"]
          },
        ]
      }
      prc_retirements: {
        Row: {
          buyer_user_id: string
          cert_token_id: string | null
          company_name: string
          created_at: string
          hcs_retirement_sequence: number | null
          id: string
          prcs_retired: number
          provenance_summary: Json | null
          report_ref: string | null
        }
        Insert: {
          buyer_user_id: string
          cert_token_id?: string | null
          company_name: string
          created_at?: string
          hcs_retirement_sequence?: number | null
          id?: string
          prcs_retired: number
          provenance_summary?: Json | null
          report_ref?: string | null
        }
        Update: {
          buyer_user_id?: string
          cert_token_id?: string | null
          company_name?: string
          created_at?: string
          hcs_retirement_sequence?: number | null
          id?: string
          prcs_retired?: number
          provenance_summary?: Json | null
          report_ref?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weighing_stations: {
        Row: {
          accepted_types: string[]
          calibration_cert_hash: string | null
          calibration_expiry: string | null
          created_at: string
          facility_name: string
          facility_type: string
          gps_lat: number | null
          gps_lon: number | null
          hedera_account_id: string | null
          id: string
          operating_hours: string | null
          physical_address: string
          stake_amount: number
          stake_status: string
          status: string
          updated_at: string
          user_id: string
          zone: string
        }
        Insert: {
          accepted_types?: string[]
          calibration_cert_hash?: string | null
          calibration_expiry?: string | null
          created_at?: string
          facility_name: string
          facility_type: string
          gps_lat?: number | null
          gps_lon?: number | null
          hedera_account_id?: string | null
          id?: string
          operating_hours?: string | null
          physical_address: string
          stake_amount?: number
          stake_status?: string
          status?: string
          updated_at?: string
          user_id: string
          zone: string
        }
        Update: {
          accepted_types?: string[]
          calibration_cert_hash?: string | null
          calibration_expiry?: string | null
          created_at?: string
          facility_name?: string
          facility_type?: string
          gps_lat?: number | null
          gps_lon?: number | null
          hedera_account_id?: string | null
          id?: string
          operating_hours?: string | null
          physical_address?: string
          stake_amount?: number
          stake_status?: string
          status?: string
          updated_at?: string
          user_id?: string
          zone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
        | "admin"
        | "collector"
        | "station_operator"
        | "corporate_buyer"
        | "event_organizer"
        | "validator"
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
      app_role: [
        "admin",
        "collector",
        "station_operator",
        "corporate_buyer",
        "event_organizer",
        "validator",
      ],
    },
  },
} as const
