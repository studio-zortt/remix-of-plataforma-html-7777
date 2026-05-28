-- 1. Add current_match_id to babas table for tracking active match
ALTER TABLE public.babas
ADD COLUMN IF NOT EXISTS current_match_id uuid NULL;

-- 2. Make player_id nullable in baba_goals (for GK without registered player)
ALTER TABLE public.baba_goals
ALTER COLUMN player_id DROP NOT NULL;

-- 3. Add scorer_type to identify if goal was by player or goalkeeper
ALTER TABLE public.baba_goals
ADD COLUMN IF NOT EXISTS scorer_type text NOT NULL DEFAULT 'player';

-- 4. Add scorer_name to store the name of who scored (for display after refresh)
ALTER TABLE public.baba_goals
ADD COLUMN IF NOT EXISTS scorer_name text NULL;

-- 5. Add goal_history jsonb to babas for persisting current match goal history
ALTER TABLE public.babas
ADD COLUMN IF NOT EXISTS goal_history jsonb NULL DEFAULT '{"team1":[],"team2":[]}'::jsonb;