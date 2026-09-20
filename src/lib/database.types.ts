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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      attachments: {
        Row: {
          call_id: string
          content_type: string
          created_at: string
          filename: string
          id: string
          size: number
          storage_path: string
        }
        Insert: {
          call_id: string
          content_type: string
          created_at?: string
          filename: string
          id?: string
          size: number
          storage_path: string
        }
        Update: {
          call_id?: string
          content_type?: string
          created_at?: string
          filename?: string
          id?: string
          size?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_contacts: {
        Row: {
          call_id: string
          email: string
          name: string
          phone: string | null
        }
        Insert: {
          call_id: string
          email: string
          name: string
          phone?: string | null
        }
        Update: {
          call_id?: string
          email?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_contacts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          address: string | null
          call_at: string
          compensation_amount: number | null
          compensation_type: string
          currency: string | null
          description: string | null
          ensemble_id: string
          ensemble_name: string
          event_at: string | null
          filled_at: string | null
          id: string
          instrument: string
          organizer_id: string
          performance_at: string | null
          position: string | null
          published_at: string
          repertoire: string | null
          status: string
          timezone: string
          venue: string
        }
        Insert: {
          address?: string | null
          call_at: string
          compensation_amount?: number | null
          compensation_type: string
          currency?: string | null
          description?: string | null
          ensemble_id: string
          ensemble_name: string
          event_at?: string | null
          filled_at?: string | null
          id?: string
          instrument: string
          organizer_id: string
          performance_at?: string | null
          position?: string | null
          published_at?: string
          repertoire?: string | null
          status?: string
          timezone?: string
          venue: string
        }
        Update: {
          address?: string | null
          call_at?: string
          compensation_amount?: number | null
          compensation_type?: string
          currency?: string | null
          description?: string | null
          ensemble_id?: string
          ensemble_name?: string
          event_at?: string | null
          filled_at?: string | null
          id?: string
          instrument?: string
          organizer_id?: string
          performance_at?: string | null
          position?: string | null
          published_at?: string
          repertoire?: string | null
          status?: string
          timezone?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_invites: {
        Row: {
          ensemble_id: string
          expires_at: string
          token_hash: string
        }
        Insert: {
          ensemble_id: string
          expires_at?: string
          token_hash: string
        }
        Update: {
          ensemble_id?: string
          expires_at?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_invites_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: true
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_members: {
        Row: {
          ensemble_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          ensemble_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          ensemble_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_members_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensembles: {
        Row: {
          address: string
          compensation_amount: number | null
          compensation_type: string
          created_at: string
          currency: string | null
          description: string
          id: string
          name: string
          owner_id: string
          venue: string
        }
        Insert: {
          address?: string
          compensation_amount?: number | null
          compensation_type?: string
          created_at?: string
          currency?: string | null
          description?: string
          id?: string
          name: string
          owner_id: string
          venue: string
        }
        Update: {
          address?: string
          compensation_amount?: number | null
          compensation_type?: string
          created_at?: string
          currency?: string | null
          description?: string
          id?: string
          name?: string
          owner_id?: string
          venue?: string
        }
        Relationships: []
      }
      organizer_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      response_rate_limits: {
        Row: {
          created_at: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          ip_hash?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          availability: string
          call_id: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          selected: boolean
        }
        Insert: {
          availability: string
          call_id: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          selected?: boolean
        }
        Update: {
          availability?: string
          call_id?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          selected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "responses_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_ensemble_invite: { Args: { ensemble: string }; Returns: string }
      ensemble_roster: {
        Args: { ensemble: string }
        Returns: {
          joined_at: string
          name: string
          user_id: string
        }[]
      }
      is_ensemble_member: { Args: { ensemble: string }; Returns: boolean }
      join_ensemble: {
        Args: { member_name: string; member_phone?: string; token: string }
        Returns: string
      }
      publish_call: { Args: { files?: Json; payload: Json }; Returns: string }
      remove_ensemble_member: {
        Args: { ensemble: string; member: string }
        Returns: undefined
      }
      save_ensemble: {
        Args: { ensemble?: string; payload: Json }
        Returns: string
      }
      select_musician: {
        Args: { call_id: string; response_id: string }
        Returns: undefined
      }
      submit_response: {
        Args: { ip_hash: string; payload: Json }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
