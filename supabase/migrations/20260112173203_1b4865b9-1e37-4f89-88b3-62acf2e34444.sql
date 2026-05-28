-- Add team_losses column to babas table for tracking real losses
ALTER TABLE public.babas 
ADD COLUMN IF NOT EXISTS team_losses jsonb DEFAULT '{}'::jsonb;