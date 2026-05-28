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
      baba_goals: {
        Row: {
          assist_player_id: string | null
          assist_player_name: string | null
          created_at: string
          id: string
          match_id: string
          player_id: string | null
          scorer_name: string | null
          scorer_type: string
          team_id: string
        }
        Insert: {
          assist_player_id?: string | null
          assist_player_name?: string | null
          created_at?: string
          id?: string
          match_id: string
          player_id?: string | null
          scorer_name?: string | null
          scorer_type?: string
          team_id: string
        }
        Update: {
          assist_player_id?: string | null
          assist_player_name?: string | null
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string | null
          scorer_name?: string | null
          scorer_type?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baba_goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "baba_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "baba_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "baba_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      baba_matches: {
        Row: {
          baba_id: string
          created_at: string
          id: string
          is_tie: boolean | null
          match_number: number
          team1_id: string
          team1_score: number | null
          team2_id: string
          team2_score: number | null
          winner_team_id: string | null
        }
        Insert: {
          baba_id: string
          created_at?: string
          id?: string
          is_tie?: boolean | null
          match_number?: number
          team1_id: string
          team1_score?: number | null
          team2_id: string
          team2_score?: number | null
          winner_team_id?: string | null
        }
        Update: {
          baba_id?: string
          created_at?: string
          id?: string
          is_tie?: boolean | null
          match_number?: number
          team1_id?: string
          team1_score?: number | null
          team2_id?: string
          team2_score?: number | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baba_matches_baba_id_fkey"
            columns: ["baba_id"]
            isOneToOne: false
            referencedRelation: "babas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "baba_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "baba_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baba_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "baba_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      baba_players: {
        Row: {
          baba_id: string
          created_at: string
          id: string
          is_goalkeeper: boolean | null
          is_seed: boolean | null
          is_substitute: boolean | null
          name: string
          seed_level: number | null
          total_goals: number | null
        }
        Insert: {
          baba_id: string
          created_at?: string
          id?: string
          is_goalkeeper?: boolean | null
          is_seed?: boolean | null
          is_substitute?: boolean | null
          name: string
          seed_level?: number | null
          total_goals?: number | null
        }
        Update: {
          baba_id?: string
          created_at?: string
          id?: string
          is_goalkeeper?: boolean | null
          is_seed?: boolean | null
          is_substitute?: boolean | null
          name?: string
          seed_level?: number | null
          total_goals?: number | null
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
          is_added_manually: boolean | null
          is_borrowed: boolean | null
          player_id: string
          position: number | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_added_manually?: boolean | null
          is_borrowed?: boolean | null
          player_id: string
          position?: number | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_added_manually?: boolean | null
          is_borrowed?: boolean | null
          player_id?: string
          position?: number | null
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
          is_complete: boolean | null
          is_removed_from_rotation: boolean | null
          removal_type: string | null
          team_number: number
          total_wins: number | null
        }
        Insert: {
          baba_id: string
          created_at?: string
          goalkeeper_id?: string | null
          id?: string
          is_complete?: boolean | null
          is_removed_from_rotation?: boolean | null
          removal_type?: string | null
          team_number: number
          total_wins?: number | null
        }
        Update: {
          baba_id?: string
          created_at?: string
          goalkeeper_id?: string | null
          id?: string
          is_complete?: boolean | null
          is_removed_from_rotation?: boolean | null
          removal_type?: string | null
          team_number?: number
          total_wins?: number | null
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
          available_goalkeepers: Json | null
          created_at: string
          current_goalkeepers: Json | null
          current_match_id: string | null
          current_team1_index: number | null
          current_team2_index: number | null
          field_type: string
          game_duration: number
          goal_history: Json | null
          id: string
          is_running: boolean | null
          match_cards: Json | null
          match_ended: boolean | null
          name: string
          player_assists: Json | null
          player_goals: Json | null
          players_per_team: number
          raw_player_list: string | null
          removed_teams: Json | null
          rotation_queue: Json | null
          setup_status: string
          show_tie_breaker: boolean | null
          status: string
          team_losses: Json | null
          team_ties: Json | null
          team_wins: Json | null
          team1_score: number | null
          team2_score: number | null
          tie_breaker_pair: Json | null
          tied_pairs: Json | null
          time_left: number | null
          total_games: number | null
          total_ties: number | null
          updated_at: string
          user_id: string
          waiting_winner: number | null
          win_criteria: string
        }
        Insert: {
          available_goalkeepers?: Json | null
          created_at?: string
          current_goalkeepers?: Json | null
          current_match_id?: string | null
          current_team1_index?: number | null
          current_team2_index?: number | null
          field_type?: string
          game_duration?: number
          goal_history?: Json | null
          id?: string
          is_running?: boolean | null
          match_cards?: Json | null
          match_ended?: boolean | null
          name?: string
          player_assists?: Json | null
          player_goals?: Json | null
          players_per_team?: number
          raw_player_list?: string | null
          removed_teams?: Json | null
          rotation_queue?: Json | null
          setup_status?: string
          show_tie_breaker?: boolean | null
          status?: string
          team_losses?: Json | null
          team_ties?: Json | null
          team_wins?: Json | null
          team1_score?: number | null
          team2_score?: number | null
          tie_breaker_pair?: Json | null
          tied_pairs?: Json | null
          time_left?: number | null
          total_games?: number | null
          total_ties?: number | null
          updated_at?: string
          user_id: string
          waiting_winner?: number | null
          win_criteria?: string
        }
        Update: {
          available_goalkeepers?: Json | null
          created_at?: string
          current_goalkeepers?: Json | null
          current_match_id?: string | null
          current_team1_index?: number | null
          current_team2_index?: number | null
          field_type?: string
          game_duration?: number
          goal_history?: Json | null
          id?: string
          is_running?: boolean | null
          match_cards?: Json | null
          match_ended?: boolean | null
          name?: string
          player_assists?: Json | null
          player_goals?: Json | null
          players_per_team?: number
          raw_player_list?: string | null
          removed_teams?: Json | null
          rotation_queue?: Json | null
          setup_status?: string
          show_tie_breaker?: boolean | null
          status?: string
          team_losses?: Json | null
          team_ties?: Json | null
          team_wins?: Json | null
          team1_score?: number | null
          team2_score?: number | null
          tie_breaker_pair?: Json | null
          tied_pairs?: Json | null
          time_left?: number | null
          total_games?: number | null
          total_ties?: number | null
          updated_at?: string
          user_id?: string
          waiting_winner?: number | null
          win_criteria?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutorials: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          show_on_home: boolean
          title: string
          updated_at: string | null
          video_url: string | null
          youtube_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          show_on_home?: boolean
          title: string
          updated_at?: string | null
          video_url?: string | null
          youtube_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          show_on_home?: boolean
          title?: string
          updated_at?: string | null
          video_url?: string | null
          youtube_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
