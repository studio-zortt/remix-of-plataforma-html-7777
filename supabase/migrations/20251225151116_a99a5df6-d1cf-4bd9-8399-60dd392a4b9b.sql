-- Add statistics columns to babas table
ALTER TABLE public.babas ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0;
ALTER TABLE public.babas ADD COLUMN IF NOT EXISTS total_ties INTEGER DEFAULT 0;
ALTER TABLE public.babas ADD COLUMN IF NOT EXISTS player_goals JSONB DEFAULT '{}';
ALTER TABLE public.babas ADD COLUMN IF NOT EXISTS team_wins JSONB DEFAULT '{}';