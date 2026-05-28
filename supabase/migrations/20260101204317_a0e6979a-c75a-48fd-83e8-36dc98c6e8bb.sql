-- Add setup_status column to track baba creation progress
ALTER TABLE public.babas 
ADD COLUMN IF NOT EXISTS setup_status text NOT NULL DEFAULT 'import';

-- Add comment for documentation
COMMENT ON COLUMN public.babas.setup_status IS 'Tracks setup progress: import, config, teams, game';