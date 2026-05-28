-- Adicionar colunas para controle de rotação nos times
ALTER TABLE baba_teams ADD COLUMN IF NOT EXISTS is_removed_from_rotation boolean DEFAULT false;
ALTER TABLE baba_teams ADD COLUMN IF NOT EXISTS removal_type text DEFAULT null;

-- Adicionar campo para armazenar times removidos da rotação no baba
ALTER TABLE babas ADD COLUMN IF NOT EXISTS removed_teams jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo para armazenar goleiros disponíveis
ALTER TABLE babas ADD COLUMN IF NOT EXISTS available_goalkeepers jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo para armazenar goleiro atual de cada time em campo
ALTER TABLE babas ADD COLUMN IF NOT EXISTS current_goalkeepers jsonb DEFAULT '{}'::jsonb;