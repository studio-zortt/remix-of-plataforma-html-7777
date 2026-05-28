-- Add raw_player_list column to babas table for storing the original player list text
ALTER TABLE public.babas
ADD COLUMN raw_player_list TEXT;