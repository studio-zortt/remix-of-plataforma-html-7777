-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create babas (games/sessions) table
CREATE TABLE public.babas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Baba',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  field_type TEXT NOT NULL DEFAULT 'quadra',
  players_per_team INTEGER NOT NULL DEFAULT 5,
  game_duration INTEGER NOT NULL DEFAULT 7,
  win_criteria TEXT NOT NULL DEFAULT 'time-or-2',
  current_team1_index INTEGER DEFAULT 0,
  current_team2_index INTEGER DEFAULT 1,
  rotation_queue JSONB DEFAULT '[]',
  time_left INTEGER,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  match_ended BOOLEAN DEFAULT false,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.babas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own babas"
ON public.babas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own babas"
ON public.babas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own babas"
ON public.babas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own babas"
ON public.babas FOR DELETE
USING (auth.uid() = user_id);

-- Create baba_players table
CREATE TABLE public.baba_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baba_id UUID NOT NULL REFERENCES public.babas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_seed BOOLEAN DEFAULT false,
  seed_level INTEGER DEFAULT 0,
  is_goalkeeper BOOLEAN DEFAULT false,
  is_substitute BOOLEAN DEFAULT false,
  total_goals INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baba_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view players of their babas"
ON public.baba_players FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_players.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create players for their babas"
ON public.baba_players FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_players.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update players of their babas"
ON public.baba_players FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_players.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete players of their babas"
ON public.baba_players FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_players.baba_id 
    AND babas.user_id = auth.uid()
  )
);

-- Create baba_teams table
CREATE TABLE public.baba_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baba_id UUID NOT NULL REFERENCES public.babas(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL,
  goalkeeper_id UUID REFERENCES public.baba_players(id) ON DELETE SET NULL,
  is_complete BOOLEAN DEFAULT false,
  total_wins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baba_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams of their babas"
ON public.baba_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_teams.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create teams for their babas"
ON public.baba_teams FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_teams.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update teams of their babas"
ON public.baba_teams FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_teams.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete teams of their babas"
ON public.baba_teams FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_teams.baba_id 
    AND babas.user_id = auth.uid()
  )
);

-- Create baba_team_players (join table for players in teams)
CREATE TABLE public.baba_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.baba_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.baba_players(id) ON DELETE CASCADE,
  is_borrowed BOOLEAN DEFAULT false,
  is_added_manually BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baba_team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team players of their babas"
ON public.baba_team_players FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.baba_teams 
    JOIN public.babas ON babas.id = baba_teams.baba_id
    WHERE baba_teams.id = baba_team_players.team_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create team players for their babas"
ON public.baba_team_players FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.baba_teams 
    JOIN public.babas ON babas.id = baba_teams.baba_id
    WHERE baba_teams.id = baba_team_players.team_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update team players of their babas"
ON public.baba_team_players FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.baba_teams 
    JOIN public.babas ON babas.id = baba_teams.baba_id
    WHERE baba_teams.id = baba_team_players.team_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete team players of their babas"
ON public.baba_team_players FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.baba_teams 
    JOIN public.babas ON babas.id = baba_teams.baba_id
    WHERE baba_teams.id = baba_team_players.team_id 
    AND babas.user_id = auth.uid()
  )
);

-- Create baba_matches table
CREATE TABLE public.baba_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baba_id UUID NOT NULL REFERENCES public.babas(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL REFERENCES public.baba_teams(id) ON DELETE CASCADE,
  team2_id UUID NOT NULL REFERENCES public.baba_teams(id) ON DELETE CASCADE,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_team_id UUID REFERENCES public.baba_teams(id) ON DELETE SET NULL,
  is_tie BOOLEAN DEFAULT false,
  match_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baba_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matches of their babas"
ON public.baba_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_matches.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create matches for their babas"
ON public.baba_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_matches.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update matches of their babas"
ON public.baba_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_matches.baba_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete matches of their babas"
ON public.baba_matches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.babas 
    WHERE babas.id = baba_matches.baba_id 
    AND babas.user_id = auth.uid()
  )
);

-- Create baba_goals table
CREATE TABLE public.baba_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.baba_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.baba_players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.baba_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baba_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view goals of their babas"
ON public.baba_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.baba_matches 
    JOIN public.babas ON babas.id = baba_matches.baba_id
    WHERE baba_matches.id = baba_goals.match_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create goals for their babas"
ON public.baba_goals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.baba_matches 
    JOIN public.babas ON babas.id = baba_matches.baba_id
    WHERE baba_matches.id = baba_goals.match_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update goals of their babas"
ON public.baba_goals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.baba_matches 
    JOIN public.babas ON babas.id = baba_matches.baba_id
    WHERE baba_matches.id = baba_goals.match_id 
    AND babas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete goals of their babas"
ON public.baba_goals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.baba_matches 
    JOIN public.babas ON babas.id = baba_matches.baba_id
    WHERE baba_matches.id = baba_goals.match_id 
    AND babas.user_id = auth.uid()
  )
);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_babas_updated_at
  BEFORE UPDATE ON public.babas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();