-- Adicionar coluna para rastrear cartões da partida atual
ALTER TABLE public.babas
ADD COLUMN IF NOT EXISTS match_cards jsonb NULL DEFAULT '{}'::jsonb;

-- Comentário: Estrutura do JSON:
-- {
--   "0-2": { "yellow": 1, "red": false },  -- teamIndex-playerIndex
--   "1-GK": { "yellow": 2, "red": true }   -- goleiro do time 1
-- }