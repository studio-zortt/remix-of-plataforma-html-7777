-- Add player_assists column to babas table (same format as player_goals)
ALTER TABLE public.babas 
ADD COLUMN IF NOT EXISTS player_assists jsonb DEFAULT '{}'::jsonb;

-- Add assist columns to baba_goals table
ALTER TABLE public.baba_goals 
ADD COLUMN IF NOT EXISTS assist_player_id uuid,
ADD COLUMN IF NOT EXISTS assist_player_name text;