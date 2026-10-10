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
      blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string
        }
        Insert: {
          blocked: string
          blocker?: string
          created_at?: string
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_fkey"
            columns: ["blocked"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_fkey"
            columns: ["blocker"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      excused_periods: {
        Row: {
          created_at: string
          ended_on: string | null
          id: string
          kind: Database["public"]["Enums"]["excuse_kind"]
          started_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["excuse_kind"]
          started_on: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["excuse_kind"]
          started_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "excused_periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fast_logs: {
        Row: {
          created_at: string
          fasted_on: string
          kind: Database["public"]["Enums"]["fast_kind"]
          user_id: string
        }
        Insert: {
          created_at?: string
          fasted_on: string
          kind: Database["public"]["Enums"]["fast_kind"]
          user_id?: string
        }
        Update: {
          created_at?: string
          fasted_on?: string
          kind?: Database["public"]["Enums"]["fast_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fast_logs_user_id_fkey"
            columns: ["user_id"]
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
      prayer_log_details: {
        Row: {
          at_masjid: boolean
          in_jamaah: boolean
          log_id: string
          user_id: string
        }
        Insert: {
          at_masjid?: boolean
          in_jamaah?: boolean
          log_id: string
          user_id?: string
        }
        Update: {
          at_masjid?: boolean
          in_jamaah?: boolean
          log_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_log_details_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: true
            referencedRelation: "prayer_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_log_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_logs: {
        Row: {
          id: string
          logged_at: string
          prayed_on: string
          prayer: Database["public"]["Enums"]["prayer_name"]
          status: Database["public"]["Enums"]["prayer_status"]
          user_id: string
        }
        Insert: {
          id?: string
          logged_at?: string
          prayed_on: string
          prayer: Database["public"]["Enums"]["prayer_name"]
          status: Database["public"]["Enums"]["prayer_status"]
          user_id?: string
        }
        Update: {
          id?: string
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
          avatar_seed: string | null
          calc_method: number
          city: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          distance_unit: string | null
          friend_code: string
          hijri_offset: number
          id: string
          latitude: number | null
          longitude: number | null
          onboarded_at: string | null
          paused_since: string | null
          region: string | null
          timezone: string | null
          track_excused: boolean
          track_sunnah: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          asr_method?: Database["public"]["Enums"]["asr_method"]
          avatar_color?: string
          avatar_seed?: string | null
          calc_method?: number
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          distance_unit?: string | null
          friend_code?: string
          hijri_offset?: number
          id: string
          latitude?: number | null
          longitude?: number | null
          onboarded_at?: string | null
          paused_since?: string | null
          region?: string | null
          timezone?: string | null
          track_excused?: boolean
          track_sunnah?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          asr_method?: Database["public"]["Enums"]["asr_method"]
          avatar_color?: string
          avatar_seed?: string | null
          calc_method?: number
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          distance_unit?: string | null
          friend_code?: string
          hijri_offset?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          onboarded_at?: string | null
          paused_since?: string | null
          region?: string | null
          timezone?: string | null
          track_excused?: boolean
          track_sunnah?: boolean
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
      qada_counts: {
        Row: {
          item: Database["public"]["Enums"]["qada_item"]
          made_up: number
          owed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          item: Database["public"]["Enums"]["qada_item"]
          made_up?: number
          owed?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          item?: Database["public"]["Enums"]["qada_item"]
          made_up?: number
          owed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qada_counts_user_id_fkey"
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
          fasting_reminders: boolean
          heads_up_minutes: number
          jumuah_reminder: boolean
          quiet_end: string | null
          quiet_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_nudges?: boolean
          fasting_reminders?: boolean
          heads_up_minutes?: number
          jumuah_reminder?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_nudges?: boolean
          fasting_reminders?: boolean
          heads_up_minutes?: number
          jumuah_reminder?: boolean
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
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          nudge_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter: string
          status: Database["public"]["Enums"]["report_status"]
          target_circle: string | null
          target_user: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          nudge_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_circle?: string | null
          target_user?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          nudge_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_circle?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_nudge_id_fkey"
            columns: ["nudge_id"]
            isOneToOne: false
            referencedRelation: "nudges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_fkey"
            columns: ["reporter"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_circle_fkey"
            columns: ["target_circle"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_pushes: {
        Row: {
          body: string
          data: Json
          key: string
          kind: string
          send_at: string
          sent_at: string | null
          silent: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json
          key: string
          kind: string
          send_at: string
          sent_at?: string | null
          silent?: boolean
          title: string
          user_id?: string
        }
        Update: {
          body?: string
          data?: Json
          key?: string
          kind?: string
          send_at?: string
          sent_at?: string | null
          silent?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sunnah_logs: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["sunnah_kind"]
          prayed_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: Database["public"]["Enums"]["sunnah_kind"]
          prayed_on: string
          user_id?: string
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["sunnah_kind"]
          prayed_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunnah_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      circle_board: {
        Args: { cid: string; since: string }
        Returns: {
          jamaah: number
          late: number
          on_time: number
          points: number
          user_id: string
        }[]
      }
      claim_due_pushes: {
        Args: { max_rows?: number }
        Returns: {
          body: string
          data: Json
          key: string
          kind: string
          send_at: string
          sent_at: string | null
          silent: boolean
          title: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_pushes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      join_circle: { Args: { invite_code: string }; Returns: string }
      member_streaks: {
        Args: { uids: string[] }
        Returns: {
          streak: number
          user_id: string
        }[]
      }
      public_circles: {
        Args: never
        Returns: {
          code: string
          color: string
          created_at: string
          description: string
          focus: string
          id: string
          joined: boolean
          member_count: number
          name: string
        }[]
      }
      reset_circle_code: { Args: { cid: string }; Returns: string }
      username_available: { Args: { name: string }; Returns: boolean }
      voice_notes_older_than: { Args: { days: number }; Returns: string[] }
      week_recap: {
        Args: { since: string; uid: string }
        Returns: {
          jamaah: number
          on_time: number
          prayed: number
        }[]
      }
    }
    Enums: {
      asr_method: "standard" | "hanafi"
      circle_role: "owner" | "member"
      circle_visibility: "private" | "public"
      excuse_kind: "hayd" | "nifas"
      fast_kind: "ramadan" | "qada" | "sunnah" | "nafl"
      nudge_kind: "nudge" | "dua" | "together" | "voice"
      prayer_name: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
      prayer_status: "on_time" | "late" | "missed"
      qada_item: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "fast"
      reminder_sound: "adhan" | "chime" | "silent"
      report_reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "impersonation"
        | "other"
      report_status: "open" | "actioned" | "dismissed"
      sunnah_kind:
        | "fajr_before"
        | "dhuhr_before"
        | "dhuhr_after"
        | "maghrib_after"
        | "isha_after"
        | "witr"
        | "duha"
        | "tahajjud"
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
    Enums: {
      asr_method: ["standard", "hanafi"],
      circle_role: ["owner", "member"],
      circle_visibility: ["private", "public"],
      excuse_kind: ["hayd", "nifas"],
      fast_kind: ["ramadan", "qada", "sunnah", "nafl"],
      nudge_kind: ["nudge", "dua", "together", "voice"],
      prayer_name: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      prayer_status: ["on_time", "late", "missed"],
      qada_item: ["fajr", "dhuhr", "asr", "maghrib", "isha", "fast"],
      reminder_sound: ["adhan", "chime", "silent"],
      report_reason: [
        "spam",
        "harassment",
        "inappropriate",
        "impersonation",
        "other",
      ],
      report_status: ["open", "actioned", "dismissed"],
      sunnah_kind: [
        "fajr_before",
        "dhuhr_before",
        "dhuhr_after",
        "maghrib_after",
        "isha_after",
        "witr",
        "duha",
        "tahajjud",
      ],
    },
  },
} as const
