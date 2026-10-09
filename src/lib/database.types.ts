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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      circle_members: {
        Row: {
          circle_id: string
          joined_at: string
          role: Database["public"]["Enums"]["circle_role"]
          user_id: string
        }
        Insert: {
          circle_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role"]
          user_id: string
        }
        Update: {
          circle_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          code: string
          color: string
          created_at: string
          created_by: string
          description: string | null
          focus: string
          id: string
          leaderboard_enabled: boolean
          name: string
          nudges_enabled: boolean
          visibility: Database["public"]["Enums"]["circle_visibility"]
        }
        Insert: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          focus?: string
          id?: string
          leaderboard_enabled?: boolean
          name: string
          nudges_enabled?: boolean
          visibility?: Database["public"]["Enums"]["circle_visibility"]
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          focus?: string
          id?: string
          leaderboard_enabled?: boolean
          name?: string
          nudges_enabled?: boolean
          visibility?: Database["public"]["Enums"]["circle_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudges: {
        Row: {
          circle_id: string
          created_at: string
          from_user: string
          id: string
          kind: Database["public"]["Enums"]["nudge_kind"]
          message: string | null
          prayer: Database["public"]["Enums"]["prayer_name"]
          prayer_date: string
          responded_at: string | null
          response: string | null
          to_user: string
          voice_path: string | null
        }
        Insert: {
          circle_id: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: Database["public"]["Enums"]["nudge_kind"]
          message?: string | null
          prayer: Database["public"]["Enums"]["prayer_name"]
          prayer_date: string
          responded_at?: string | null
          response?: string | null
          to_user: string
          voice_path?: string | null
        }
        Update: {
          circle_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: Database["public"]["Enums"]["nudge_kind"]
          message?: string | null
          prayer?: Database["public"]["Enums"]["prayer_name"]
          prayer_date?: string
          responded_at?: string | null
          response?: string | null
          to_user?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nudges_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_logs: {
        Row: {
          at_masjid: boolean
          id: string
          in_jamaah: boolean
          logged_at: string
          prayed_on: string
          prayer: Database["public"]["Enums"]["prayer_name"]
          status: Database["public"]["Enums"]["prayer_status"]
          user_id: string
        }
        Insert: {
          at_masjid?: boolean
          id?: string
          in_jamaah?: boolean
          logged_at?: string
          prayed_on: string
          prayer: Database["public"]["Enums"]["prayer_name"]
          status: Database["public"]["Enums"]["prayer_status"]
          user_id?: string
        }
        Update: {
          at_masjid?: boolean
          id?: string
          in_jamaah?: boolean
          logged_at?: string
          prayed_on?: string
          prayer?: Database["public"]["Enums"]["prayer_name"]
          status?: Database["public"]["Enums"]["prayer_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_reminders: {
        Row: {
          enabled: boolean
          prayer: Database["public"]["Enums"]["prayer_name"]
          sound: Database["public"]["Enums"]["reminder_sound"]
          user_id: string
        }
        Insert: {
          enabled?: boolean
          prayer: Database["public"]["Enums"]["prayer_name"]
          sound?: Database["public"]["Enums"]["reminder_sound"]
          user_id: string
        }
        Update: {
          enabled?: boolean
          prayer?: Database["public"]["Enums"]["prayer_name"]
          sound?: Database["public"]["Enums"]["reminder_sound"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asr_method: Database["public"]["Enums"]["asr_method"]
          avatar_color: string
          calc_method: number
          city: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          friend_code: string
          id: string
          latitude: number | null
          longitude: number | null
          onboarded_at: string | null
          region: string | null
          timezone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          asr_method?: Database["public"]["Enums"]["asr_method"]
          avatar_color?: string
          calc_method?: number
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          friend_code?: string
          id: string
          latitude?: number | null
          longitude?: number | null
          onboarded_at?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          asr_method?: Database["public"]["Enums"]["asr_method"]
          avatar_color?: string
          calc_method?: number
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          friend_code?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          onboarded_at?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          allow_nudges: boolean
          heads_up_minutes: number
          quiet_end: string | null
          quiet_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_nudges?: boolean
          heads_up_minutes?: number
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_nudges?: boolean
          heads_up_minutes?: number
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_circle: { Args: { invite_code: string }; Returns: string }
      username_available: { Args: { name: string }; Returns: boolean }
    }
    Enums: {
      asr_method: "standard" | "hanafi"
      circle_role: "owner" | "member"
      circle_visibility: "private" | "public"
      nudge_kind: "nudge" | "dua" | "together" | "voice"
      prayer_name: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
      prayer_status: "on_time" | "late" | "missed"
      reminder_sound: "adhan" | "chime" | "silent"
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
  public: {
    Enums: {
      asr_method: ["standard", "hanafi"],
      circle_role: ["owner", "member"],
      circle_visibility: ["private", "public"],
      nudge_kind: ["nudge", "dua", "together", "voice"],
      prayer_name: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      prayer_status: ["on_time", "late", "missed"],
      reminder_sound: ["adhan", "chime", "silent"],
    },
  },
} as const
