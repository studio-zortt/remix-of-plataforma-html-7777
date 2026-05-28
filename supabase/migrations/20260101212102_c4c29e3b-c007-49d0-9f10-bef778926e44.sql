-- Add columns to persist tie-breaker state
ALTER TABLE public.babas
ADD COLUMN IF NOT EXISTS tied_pairs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_tie_breaker boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tie_breaker_pair jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS waiting_winner integer DEFAULT NULL;