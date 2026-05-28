-- Add team_ties column to babas table for tracking ties per team
ALTER TABLE public.babas 
ADD COLUMN IF NOT EXISTS team_ties jsonb DEFAULT '{}'::jsonb;