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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      baba_players: {
        Row: {
          baba_id: string
          created_at: string
          id: string
          is_goalkeeper: boolean
          is_seed: boolean
          is_substitute: boolean
          name: string
          seed_level: number
        }
        Insert: {
          baba_id: string
          created_at?: string
          id?: string
          is_goalkeeper?: boolean
          is_seed?: boolean
          is_substitute?: boolean
          name: string
          seed_level?: number
        }
        Update: {
          baba_id?: string
          created_at?: string
          id?: string
          is_goalkeeper?: boolean
          is_seed?: boolean
          is_substitute?: boolean
          name?: string
          seed_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "baba_players_baba_id_fkey"
            columns: ["baba_id"]
            isOneToOne: false
            referencedRelation: "babas"
            referencedColumns: ["id"]
          },
        ]
      }
      baba_team_players: {
        Row: {
          created_at: string
          id: string
          is_added_manually: boolean
          is_borrowed: boolean
          player_id: string
          position: number
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_added_manually?: boolean
          is_borrowed?: boolean
          player_id: string
          position?: number
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_added_manually?: boolean
          is_borrowed?: boolean
          player_id?: string
          position?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baba_team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "baba_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "baba_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      baba_teams: {
        Row: {
          baba_id: string
          created_at: string
          goalkeeper_id: string | null
          id: string
          is_complete: boolean
          team_number: number
          total_wins: number
        }
        Insert: {
          baba_id: string
          created_at?: string
          goalkeeper_id?: string | null
          id?: string
          is_complete?: boolean
          team_number: number
          total_wins?: number
        }
        Update: {
          baba_id?: string
          created_at?: string
          goalkeeper_id?: string | null
          id?: string
          is_complete?: boolean
          team_number?: number
          total_wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "baba_teams_baba_id_fkey"
            columns: ["baba_id"]
            isOneToOne: false
            referencedRelation: "babas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_teams_goalkeeper_id_fkey"
            columns: ["goalkeeper_id"]
            isOneToOne: false
            referencedRelation: "baba_players"
            referencedColumns: ["id"]
          },
        ]
      }
      babas: {
        Row: {
          available_goalkeepers: Json
          created_at: string
          current_goalkeepers: Json
          current_team1_index: number
          current_team2_index: number
          field_type: string
          game_duration: number
          goal_history: Json
          id: string
          is_running: boolean
          match_cards: Json
          match_ended: boolean
          name: string
          player_assists: Json
          player_goals: Json
          players_per_team: number
          raw_player_list: string | null
          removed_teams: Json
          rotation_queue: Json
          setup_status: string | null
          show_tie_breaker: boolean
          status: string
          team_losses: Json
          team_ties: Json
          team_wins: Json
          team1_score: number
          team2_score: number
          tie_breaker_pair: Json | null
          tied_pairs: Json
          time_left: number | null
          total_games: number
          total_ties: number
          updated_at: string
          user_id: string
          waiting_winner: number | null
          win_criteria: string
        }
        Insert: {
          available_goalkeepers?: Json
          created_at?: string
          current_goalkeepers?: Json
          current_team1_index?: number
          current_team2_index?: number
          field_type: string
          game_duration?: number
          goal_history?: Json
          id?: string
          is_running?: boolean
          match_cards?: Json
          match_ended?: boolean
          name: string
          player_assists?: Json
          player_goals?: Json
          players_per_team?: number
          raw_player_list?: string | null
          removed_teams?: Json
          rotation_queue?: Json
          setup_status?: string | null
          show_tie_breaker?: boolean
          status?: string
          team_losses?: Json
          team_ties?: Json
          team_wins?: Json
          team1_score?: number
          team2_score?: number
          tie_breaker_pair?: Json | null
          tied_pairs?: Json
          time_left?: number | null
          total_games?: number
          total_ties?: number
          updated_at?: string
          user_id: string
          waiting_winner?: number | null
          win_criteria?: string
        }
        Update: {
          available_goalkeepers?: Json
          created_at?: string
          current_goalkeepers?: Json
          current_team1_index?: number
          current_team2_index?: number
          field_type?: string
          game_duration?: number
          goal_history?: Json
          id?: string
          is_running?: boolean
          match_cards?: Json
          match_ended?: boolean
          name?: string
          player_assists?: Json
          player_goals?: Json
          players_per_team?: number
          raw_player_list?: string | null
          removed_teams?: Json
          rotation_queue?: Json
          setup_status?: string | null
          show_tie_breaker?: boolean
          status?: string
          team_losses?: Json
          team_ties?: Json
          team_wins?: Json
          team1_score?: number
          team2_score?: number
          tie_breaker_pair?: Json | null
          tied_pairs?: Json
          time_left?: number | null
          total_games?: number
          total_ties?: number
          updated_at?: string
          user_id?: string
          waiting_winner?: number | null
          win_criteria?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutorials: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          show_on_home: boolean
          title: string
          updated_at: string
          video_url: string | null
          youtube_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          show_on_home?: boolean
          title: string
          updated_at?: string
          video_url?: string | null
          youtube_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          show_on_home?: boolean
          title?: string
          updated_at?: string
          video_url?: string | null
          youtube_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
