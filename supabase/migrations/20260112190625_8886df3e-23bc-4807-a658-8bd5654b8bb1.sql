-- Add position column to baba_team_players to preserve player order
ALTER TABLE public.baba_team_players 
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;