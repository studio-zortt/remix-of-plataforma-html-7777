import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Save, X, GripVertical, Eye, EyeOff, Home, Star, Upload, Youtube, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAppSetting } from '@/hooks/useAppSetting';
import AppMenu from '@/components/AppMenu';
import BallLoader from '@/components/BallLoader';
import logoHeader from '@/assets/logo-header-v2.svg';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  video_url: string | null;
  display_order: number;
  is_active: boolean;
  show_on_home: boolean;
  created_at: string;
  updated_at: string;
}

interface TutorialForm {
  title: string;
  description: string;
  youtube_id: string;
  video_url: string;
  is_active: boolean;
  show_on_home: boolean;
  videoSource: 'youtube' | 'upload';
}

const AdminTutorials = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { value: tutorialsMenuVisible, updateValue: setTutorialsMenuVisible } = useAppSetting<boolean>('tutorials_menu_visible', false);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [tutorialToDelete, setTutorialToDelete] = useState<Tutorial | null>(null);
  const [form, setForm] = useState<TutorialForm>({
    title: '',
    description: '',
    youtube_id: '',
    video_url: '',
    is_active: true,
    show_on_home: false,
    videoSource: 'youtube',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all tutorials (including inactive for admin)
  const fetchTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTutorials(data || []);
    } catch (err) {
      console.error('Error fetching tutorials:', err);
      toast.error('Erro ao carregar tutoriais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Acesso não autorizado');
      navigate('/');
      return;
    }
    if (!adminLoading && isAdmin) {
      fetchTutorials();
    }
  }, [isAdmin, adminLoading, navigate]);

  const openNewDialog = () => {
    setEditingTutorial(null);
    setForm({
      title: '',
      description: '',
      youtube_id: '',
      video_url: '',
      is_active: true,
      show_on_home: false,
      videoSource: 'youtube',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setForm({
      title: tutorial.title,
      description: tutorial.description || '',
      youtube_id: tutorial.youtube_id || '',
      video_url: tutorial.video_url || '',
      is_active: tutorial.is_active,
      show_on_home: tutorial.show_on_home ?? false,
      videoSource: tutorial.video_url ? 'upload' : 'youtube',
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Por favor, selecione um arquivo de vídeo');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('O vídeo deve ter no máximo 100MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('tutorial-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('tutorial-videos')
        .getPublicUrl(data.path);

      setForm({ ...form, video_url: urlData.publicUrl });
      toast.success('Vídeo enviado com sucesso!');
    } catch (err) {
      console.error('Error uploading video:', err);
      toast.error('Erro ao enviar vídeo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    // Validate based on source type
    if (form.videoSource === 'youtube' && !form.youtube_id.trim()) {
      toast.error('ID do YouTube é obrigatório');
      return;
    }
    if (form.videoSource === 'upload' && !form.video_url.trim()) {
      toast.error('Faça o upload de um vídeo');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        youtube_id: form.videoSource === 'youtube' ? form.youtube_id.trim() : '',
        video_url: form.videoSource === 'upload' ? form.video_url.trim() : null,
        is_active: form.is_active,
        show_on_home: form.show_on_home,
      };

      if (editingTutorial) {
        // Update existing
        const { error } = await supabase
          .from('tutorials')
          .update(saveData)
          .eq('id', editingTutorial.id);

        if (error) throw error;
        toast.success('Tutorial atualizado!');
      } else {
        // Create new
        const maxOrder = tutorials.length > 0 
          ? Math.max(...tutorials.map(t => t.display_order)) 
          : 0;
        
        const { error } = await supabase
          .from('tutorials')
          .insert({
            ...saveData,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Tutorial adicionado!');
      }
      
      setDialogOpen(false);
      fetchTutorials();
    } catch (err) {
      console.error('Error saving tutorial:', err);
      toast.error('Erro ao salvar tutorial');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tutorialToDelete) return;

    try {
      const { error } = await supabase
        .from('tutorials')
        .delete()
        .eq('id', tutorialToDelete.id);

      if (error) throw error;
      toast.success('Tutorial excluído!');
      setDeleteDialogOpen(false);
      setTutorialToDelete(null);
      fetchTutorials();
    } catch (err) {
      console.error('Error deleting tutorial:', err);
      toast.error('Erro ao excluir tutorial');
    }
  };

  const toggleActive = async (tutorial: Tutorial) => {
    try {
      const { error } = await supabase
        .from('tutorials')
        .update({ is_active: !tutorial.is_active })
        .eq('id', tutorial.id);

      if (error) throw error;
      toast.success(tutorial.is_active ? 'Tutorial desativado' : 'Tutorial ativado');
      fetchTutorials();
    } catch (err) {
      console.error('Error toggling tutorial:', err);
      toast.error('Erro ao atualizar tutorial');
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const current = tutorials[index];
    const previous = tutorials[index - 1];
    
    try {
      await supabase
        .from('tutorials')
        .update({ display_order: previous.display_order })
        .eq('id', current.id);
        
      await supabase
        .from('tutorials')
        .update({ display_order: current.display_order })
        .eq('id', previous.id);
        
      fetchTutorials();
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  const moveDown = async (index: number) => {
    if (index === tutorials.length - 1) return;
    
    const current = tutorials[index];
    const next = tutorials[index + 1];
    
    try {
      await supabase
        .from('tutorials')
        .update({ display_order: next.display_order })
        .eq('id', current.id);
        
      await supabase
        .from('tutorials')
        .update({ display_order: current.display_order })
        .eq('id', next.id);
        
      fetchTutorials();
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/lovable-uploads/stadium-background.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/95" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header - Fixed */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-muted/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoHeader} alt="Baba Play" className="h-7" />
          </div>
          <AppMenu />
        </header>

        {/* Main Content */}
        <main className="px-4 pb-8 pt-6">
          <div className="mb-6 mt-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Gerenciar Tutoriais</h1>
              <p className="text-muted-foreground">Adicione, edite ou remova vídeos tutoriais</p>
            </div>
            <Button onClick={openNewDialog} className="bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              Novo Tutorial
            </Button>
          </div>

          {/* Toggle: Menu Tutoriais visível para usuários */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/30 mb-6">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-foreground font-medium">Exibir menu "Tutoriais" para usuários</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando desativado, apenas administradores veem o atalho de tutoriais no menu lateral.
                </p>
              </div>
              <Switch
                checked={tutorialsMenuVisible}
                onCheckedChange={async (checked) => {
                  const ok = await setTutorialsMenuVisible(checked);
                  if (ok) toast.success(checked ? 'Menu de tutoriais ativado' : 'Menu de tutoriais desativado');
                  else toast.error('Erro ao atualizar configuração');
                }}
              />
            </CardContent>
          </Card>

          {/* Featured Tutorial for Home Page */}
          {(() => {
            const featuredTutorial = tutorials.find(t => t.is_active && t.show_on_home);
            return (
              <Card className="bg-primary/10 backdrop-blur-sm border-primary/30 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <Home className="w-4 h-4" />
                    Tutorial da Página Inicial
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {featuredTutorial ? (
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 border border-primary/20">
                        {featuredTutorial.video_url ? (
                          <video 
                            src={featuredTutorial.video_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img 
                            src={`https://img.youtube.com/vi/${featuredTutorial.youtube_id}/mqdefault.jpg`}
                            alt={featuredTutorial.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-medium text-foreground truncate">{featuredTutorial.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Este tutorial está sendo exibido na página inicial. Edite-o para desativar a exibição.
                        </p>
                      </div>
                      {/* Edit button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(featuredTutorial)}
                        className="border-primary/30 hover:bg-primary/10"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum tutorial está sendo exibido na página inicial. Edite um tutorial e ative a opção "Exibir na página inicial".
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Tutorials Page Section - excludes the featured tutorial */}
          {(() => {
            const featuredId = tutorials.find(t => t.is_active && t.show_on_home)?.id;
            const tutorialsForPage = tutorials.filter(t => t.id !== featuredId);
            
            return (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Tutoriais da Página de Tutoriais</h2>
                  <p className="text-sm text-muted-foreground">
                    Vídeos que aparecem na página /tutorials (dicas de futebol, técnicas, etc.)
                  </p>
                </div>

                {/* Tutorials List */}
                <div className="space-y-3">
                  {tutorialsForPage.length === 0 ? (
                    <Card className="bg-card/80 backdrop-blur-sm border-border/30">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Nenhum tutorial adicional cadastrado. Clique em "Novo Tutorial" para adicionar.
                      </CardContent>
                    </Card>
                  ) : (
                    tutorialsForPage.map((tutorial) => {
                      const originalIndex = tutorials.findIndex(t => t.id === tutorial.id);
                      return (
                        <Card 
                          key={tutorial.id}
                          className={`bg-card/80 backdrop-blur-sm border-border/30 ${!tutorial.is_active ? 'opacity-60' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveUp(originalIndex)}
                                  disabled={originalIndex === 0}
                                >
                                  <GripVertical className="w-4 h-4 rotate-90" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveDown(originalIndex)}
                                  disabled={originalIndex === tutorials.length - 1}
                                >
                                  <GripVertical className="w-4 h-4 rotate-90" />
                                </Button>
                              </div>

                              {/* Thumbnail */}
                              <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0">
                                {tutorial.video_url ? (
                                  <video 
                                    src={tutorial.video_url}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                ) : (
                                  <img 
                                    src={`https://img.youtube.com/vi/${tutorial.youtube_id}/mqdefault.jpg`}
                                    alt={tutorial.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-foreground truncate">{tutorial.title}</h3>
                                  {!tutorial.is_active && (
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">{tutorial.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {tutorial.video_url ? (
                                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                      <Upload className="w-3 h-3" /> Vídeo enviado
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                      <Youtube className="w-3 h-3" /> {tutorial.youtube_id}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleActive(tutorial)}
                                  title={tutorial.is_active ? 'Desativar' : 'Ativar'}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                >
                                  {tutorial.is_active ? (
                                    <Eye className="w-4 h-4" />
                                  ) : (
                                    <EyeOff className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(tutorial)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setTutorialToDelete(tutorial); setDeleteDialogOpen(true); }}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </main>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border/30">
          <DialogHeader>
            <DialogTitle>
              {editingTutorial ? 'Editar Tutorial' : 'Novo Tutorial'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Como criar seu primeiro Baba"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição do tutorial"
                rows={3}
              />
            </div>
            
            {/* Video Source Toggle */}
            <div className="space-y-3">
              <Label>Fonte do Vídeo *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.videoSource === 'youtube' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, videoSource: 'youtube' })}
                  className={form.videoSource === 'youtube' ? 'bg-primary' : ''}
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
                <Button
                  type="button"
                  variant={form.videoSource === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, videoSource: 'upload' })}
                  className={form.videoSource === 'upload' ? 'bg-primary' : ''}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>

            {/* YouTube ID Field */}
            {form.videoSource === 'youtube' && (
              <div className="space-y-2">
                <Label htmlFor="youtube_id">ID do YouTube *</Label>
                <Input
                  id="youtube_id"
                  value={form.youtube_id}
                  onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
                  placeholder="Ex: dQw4w9WgXcQ (parte final da URL)"
                />
                <p className="text-xs text-muted-foreground">
                  O ID é a parte final da URL do vídeo: youtube.com/watch?v=<strong>ID_AQUI</strong>
                </p>
              </div>
            )}

            {/* Video Upload Field */}
            {form.videoSource === 'upload' && (
              <div className="space-y-2">
                <Label>Upload de Vídeo *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {form.video_url ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/30">
                      <Video className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground flex-1 truncate">Vídeo enviado</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm({ ...form, video_url: '' })}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <video 
                      src={form.video_url} 
                      className="w-full aspect-video rounded-lg bg-black"
                      controls
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-20 border-dashed"
                  >
                    {uploading ? (
                      <BallLoader size="sm" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Clique para enviar (máx. 100MB)</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativo (visível para usuários)</Label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
              <Switch
                id="show_on_home"
                checked={form.show_on_home}
                onCheckedChange={(checked) => setForm({ ...form, show_on_home: checked })}
              />
              <Label htmlFor="show_on_home" className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-primary" />
                Exibir na página inicial
              </Label>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setDialogOpen(false)}
              className="hover:bg-muted/50"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-hover">
              {saving ? <BallLoader size="sm" /> : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tutorial</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{tutorialToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTutorials;
