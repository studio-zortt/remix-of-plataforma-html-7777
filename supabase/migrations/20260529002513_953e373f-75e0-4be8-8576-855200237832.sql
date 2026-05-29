
-- =====================================================
-- ENUM + ROLES SYSTEM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- =====================================================
-- TIMESTAMP HELPER
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- USER ROLES
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- BABAS (main game session)
-- =====================================================
CREATE TABLE public.babas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  setup_status TEXT DEFAULT 'import',
  field_type TEXT NOT NULL,
  players_per_team INTEGER NOT NULL DEFAULT 5,
  game_duration INTEGER NOT NULL DEFAULT 7,
  win_criteria TEXT NOT NULL DEFAULT 'time-or-2',
  current_team1_index INTEGER NOT NULL DEFAULT 0,
  current_team2_index INTEGER NOT NULL DEFAULT 1,
  rotation_queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_left INTEGER,
  team1_score INTEGER NOT NULL DEFAULT 0,
  team2_score INTEGER NOT NULL DEFAULT 0,
  match_ended BOOLEAN NOT NULL DEFAULT false,
  is_running BOOLEAN NOT NULL DEFAULT false,
  raw_player_list TEXT,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_ties INTEGER NOT NULL DEFAULT 0,
  player_goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  player_assists JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_wins JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_ties JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_losses JSONB NOT NULL DEFAULT '{}'::jsonb,
  goal_history JSONB NOT NULL DEFAULT '{"team1":[],"team2":[]}'::jsonb,
  tied_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  show_tie_breaker BOOLEAN NOT NULL DEFAULT false,
  tie_breaker_pair JSONB,
  waiting_winner INTEGER,
  match_cards JSONB NOT NULL DEFAULT '{}'::jsonb,
  removed_teams JSONB NOT NULL DEFAULT '[]'::jsonb,
  available_goalkeepers JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_goalkeepers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.babas TO authenticated;
GRANT ALL ON public.babas TO service_role;

ALTER TABLE public.babas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own babas"
  ON public.babas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create babas"
  ON public.babas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own babas"
  ON public.babas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own babas"
  ON public.babas FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_babas_user_id ON public.babas(user_id);
CREATE INDEX idx_babas_updated_at ON public.babas(updated_at DESC);

CREATE TRIGGER babas_set_updated_at
  BEFORE UPDATE ON public.babas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- BABA PLAYERS
-- =====================================================
CREATE TABLE public.baba_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baba_id UUID NOT NULL REFERENCES public.babas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  seed_level INTEGER NOT NULL DEFAULT 0,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT false,
  is_substitute BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.baba_players TO authenticated;
GRANT ALL ON public.baba_players TO service_role;

ALTER TABLE public.baba_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own baba players"
  ON public.baba_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can insert baba players"
  ON public.baba_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can update baba players"
  ON public.baba_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can delete baba players"
  ON public.baba_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE INDEX idx_baba_players_baba_id ON public.baba_players(baba_id);

-- =====================================================
-- BABA TEAMS
-- =====================================================
CREATE TABLE public.baba_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baba_id UUID NOT NULL REFERENCES public.babas(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL,
  goalkeeper_id UUID REFERENCES public.baba_players(id) ON DELETE SET NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  total_wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.baba_teams TO authenticated;
GRANT ALL ON public.baba_teams TO service_role;

ALTER TABLE public.baba_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own baba teams"
  ON public.baba_teams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can insert baba teams"
  ON public.baba_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can update baba teams"
  ON public.baba_teams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners can delete baba teams"
  ON public.baba_teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babas b WHERE b.id = baba_id AND b.user_id = auth.uid()));

CREATE INDEX idx_baba_teams_baba_id ON public.baba_teams(baba_id);

-- =====================================================
-- BABA TEAM PLAYERS (join)
-- =====================================================
CREATE TABLE public.baba_team_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.baba_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.baba_players(id) ON DELETE CASCADE,
  is_borrowed BOOLEAN NOT NULL DEFAULT false,
  is_added_manually BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.baba_team_players TO authenticated;
GRANT ALL ON public.baba_team_players TO service_role;

ALTER TABLE public.baba_team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own team players"
  ON public.baba_team_players FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.baba_teams t
    JOIN public.babas b ON b.id = t.baba_id
    WHERE t.id = team_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Owners can insert team players"
  ON public.baba_team_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.baba_teams t
    JOIN public.babas b ON b.id = t.baba_id
    WHERE t.id = team_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Owners can update team players"
  ON public.baba_team_players FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.baba_teams t
    JOIN public.babas b ON b.id = t.baba_id
    WHERE t.id = team_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete team players"
  ON public.baba_team_players FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.baba_teams t
    JOIN public.babas b ON b.id = t.baba_id
    WHERE t.id = team_id AND b.user_id = auth.uid()
  ));

CREATE INDEX idx_baba_team_players_team_id ON public.baba_team_players(team_id);
CREATE INDEX idx_baba_team_players_player_id ON public.baba_team_players(player_id);

-- =====================================================
-- TUTORIALS
-- =====================================================
CREATE TABLE public.tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_home BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tutorials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorials TO authenticated;
GRANT ALL ON public.tutorials TO service_role;

ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tutorials"
  ON public.tutorials FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tutorials"
  ON public.tutorials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tutorials"
  ON public.tutorials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tutorials"
  ON public.tutorials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tutorials_set_updated_at
  BEFORE UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- APP SETTINGS (global key/value)
-- =====================================================
CREATE TABLE public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app settings"
  ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- STORAGE: tutorial-videos
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read tutorial videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutorial-videos');

CREATE POLICY "Admins can upload tutorial videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tutorial-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tutorial videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tutorial-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tutorial videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tutorial-videos' AND public.has_role(auth.uid(), 'admin'));
