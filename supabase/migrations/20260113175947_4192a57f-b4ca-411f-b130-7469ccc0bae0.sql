-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Política: usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar tabela de tutoriais
CREATE TABLE public.tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver tutoriais ativos
CREATE POLICY "Anyone can view active tutorials"
  ON public.tutorials FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins podem ver TODOS os tutoriais (incluindo inativos)
CREATE POLICY "Admins can view all tutorials"
  ON public.tutorials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem inserir tutoriais
CREATE POLICY "Admins can insert tutorials"
  ON public.tutorials FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar tutoriais
CREATE POLICY "Admins can update tutorials"
  ON public.tutorials FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem deletar tutoriais
CREATE POLICY "Admins can delete tutorials"
  ON public.tutorials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_tutorials_updated_at
BEFORE UPDATE ON public.tutorials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir tutoriais iniciais
INSERT INTO public.tutorials (title, description, youtube_id, display_order) VALUES
  ('Como criar seu primeiro Baba', 'Aprenda a importar a lista do WhatsApp e configurar o jogo do zero', 'dQw4w9WgXcQ', 1),
  ('Gerenciando times durante a partida', 'Substituições, rotação de times e controle de placar', 'dQw4w9WgXcQ', 2),
  ('Registrando gols e assistências', 'Como marcar gols e atribuir assistências aos jogadores', 'dQw4w9WgXcQ', 3),
  ('Estatísticas e rankings', 'Entenda o ranking de artilharia, vitórias e empates', 'dQw4w9WgXcQ', 4),
  ('Dicas avançadas', 'Recursos avançados para organizar seu baba como um profissional', 'dQw4w9WgXcQ', 5),
  ('Perguntas frequentes', 'Respostas para as dúvidas mais comuns dos usuários', 'dQw4w9WgXcQ', 6);