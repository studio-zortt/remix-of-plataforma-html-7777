import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, History, Plus, Trash2, Play, Edit, FileText, Settings, Users, PlayCircle, Cog, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useBaba } from '@/contexts/BabaContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useAppSetting } from '@/hooks/useAppSetting';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import BallLoader from '@/components/BallLoader';
import menuIcon from '@/assets/menu-icon.svg';
import logoBabaPlayHorizontal from '@/assets/logo-baba-play-horizontal-v2.svg';

const AppMenu = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { babas, loadBaba, deleteBaba, startNewBabaDraft, loading, currentBaba, clearCurrentBaba } = useBaba();
  const { isAdmin } = useAdmin();
  const { value: tutorialsMenuVisible } = useAppSetting<boolean>('tutorials_menu_visible', false);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [babaToDelete, setBabaToDelete] = useState<string | null>(null);
  const [isNavigatingBaba, setIsNavigatingBaba] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/auth');
    toast.success('Você saiu da sua conta');
  };

  const handleNewBaba = async () => {
    setOpen(false);
    navigate('/import-list');
    await startNewBabaDraft();
  };

  const handleContinueBaba = async (babaId: string) => {
    // Close menu immediately and show full-screen loader
    setOpen(false);
    setIsNavigatingBaba(true);
    
    try {
      const result = await loadBaba(babaId);
      
      if (!result) {
        navigate('/');
        return;
      }
      
      // Determine destination based on REAL data (priority) or setupStatus (fallback)
      const hasTeams = result.teams && result.teams.length > 0;
      const hasPlayers = result.parsedPlayers && 
        (result.parsedPlayers.main?.length > 0 || result.parsedPlayers.goalkeepers?.length > 0);
      const setupStatus = result.baba.setupStatus ?? 'import';
      
      let destination = '/import-list';
      
      if (hasTeams) {
        // If has teams, go to game page
        destination = '/game';
      } else if (setupStatus === 'teams') {
        // Status says teams but no teams found - go to teams page to generate
        destination = '/teams';
      } else if (hasPlayers) {
        // Has players but no teams - go to config
        destination = '/configure-game';
      } else if (setupStatus === 'config') {
        destination = '/configure-game';
      }
      // If nothing, stays at /import-list
      
      navigate(destination);
    } finally {
      setIsNavigatingBaba(false);
    }
  };

  const handleEditBaba = async (babaId: string) => {
    // Close menu immediately and show full-screen loader
    setOpen(false);
    setIsNavigatingBaba(true);
    
    try {
      const result = await loadBaba(babaId);
      
      if (!result) {
        navigate('/');
        return;
      }
      
      // Edit always goes to earliest possible step based on real data
      const hasTeams = result.teams && result.teams.length > 0;
      const hasPlayers = result.parsedPlayers && 
        (result.parsedPlayers.main?.length > 0 || result.parsedPlayers.goalkeepers?.length > 0);
      
      let destination = '/import-list';
      
      if (hasTeams) {
        // Has teams - edit goes to teams page
        destination = '/teams';
      } else if (hasPlayers) {
        // Has players but no teams - go to config
        destination = '/configure-game';
      }
      // If nothing, stays at /import-list
      
      navigate(destination);
    } finally {
      setIsNavigatingBaba(false);
    }
  };

  const handleDeleteClick = (babaId: string) => {
    setBabaToDelete(babaId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (babaToDelete) {
      const result = await deleteBaba(babaToDelete);
      setBabaToDelete(null);
      setDeleteDialogOpen(false);
      
      // If deleted baba was active, close menu and go home
      if (result.wasActive) {
        setOpen(false);
        navigate('/');
      } else {
        // Force menu to stay open after AlertDialog closes
        // This counteracts the event propagation from AlertDialog -> Sheet
        requestAnimationFrame(() => {
          setOpen(true);
        });
      }
    } else {
      setDeleteDialogOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setBabaToDelete(null);
    setDeleteDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (babaId: string, status: string) => {
    // Only show "Ativo" badge for the currently selected baba
    const isCurrentlyActive = babaId === currentBaba?.id;
    
    if (isCurrentlyActive) {
      return <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">Ativo</span>;
    }
    
    // For non-active babas, only show badge if completed
    if (status === 'completed') {
      return <span className="px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground">Finalizado</span>;
    }
    
    return null;
  };

  if (!user) return null;

  return (
    <>
      {/* Full-screen loader overlay during baba navigation - Portal to body */}
      {isNavigatingBaba && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
          <BallLoader />
        </div>,
        document.body
      )}
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50">
            <img src={menuIcon} alt="Menu" className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] sm:w-[400px] bg-card/80 backdrop-blur-2xl border-border/30 pt-12">
          <SheetHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between w-full">
              <SheetTitle className="text-foreground flex items-center gap-2">
                <img src={logoBabaPlayHorizontal} alt="Baba Play" className="h-8" loading="eager" decoding="sync" />
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="rounded-2xl border border-border/40 bg-muted/40 text-foreground hover:bg-destructive/15 hover:text-white hover:border-destructive/60 [&:hover_svg]:text-white h-7 px-2.5 text-xs gap-1"
              >
                <LogOut className="w-3 h-3 mr-0.5" />
                Sair
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1 text-left">{user.email}</p>
          </SheetHeader>

          <div className="py-4">
            {/* Quick Shortcuts - Always visible: Home, tutorials. Others only when baba exists */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 pb-4 border-b border-border/30 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => { clearCurrentBaba(); navigate('/'); setOpen(false); }}
                    className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-primary hover:bg-primary/10 rounded-lg"
                  >
                    <Home className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Início</p>
                </TooltipContent>
              </Tooltip>
              {currentBaba && (
                <>
                  <div className="w-px h-6 bg-border/50" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        onClick={() => { navigate('/import-list'); setOpen(false); }}
                        className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <FileText className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Editar Lista</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        onClick={() => { navigate('/configure-game'); setOpen(false); }}
                        className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <Settings className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Configurações</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        onClick={() => { navigate('/teams'); setOpen(false); }}
                        className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <Users className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Editar Times</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <div className="w-px h-6 bg-border/50" />
              {(tutorialsMenuVisible || isAdmin) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => { navigate('/tutorials'); setOpen(false); }}
                      className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <PlayCircle className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Tutoriais{!tutorialsMenuVisible && isAdmin ? ' (oculto)' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => { navigate('/admin/tutorials'); setOpen(false); }}
                      className="p-2.5 sm:p-3 text-muted-foreground bg-muted/30 hover:text-foreground hover:bg-muted/50 rounded-lg"
                    >
                      <Cog className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Admin</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Button
              onClick={handleNewBaba}
              className="group btn-cta-green w-full mb-4 py-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Baba
            </Button>

        <ScrollArea className="h-[calc(100vh-280px)] pb-4">
          {loading && !isNavigatingBaba ? (
                <div className="flex justify-center py-8">
                  <BallLoader size="sm" />
                </div>
              ) : babas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum baba criado ainda</p>
                </div>
              ) : (
                <div className="space-y-3 pb-12">
                  {babas.map((baba) => {
                    const isCurrentBaba = baba.id === currentBaba?.id;
                    return (
                    <div
                      key={baba.id}
                      className={`p-4 rounded-xl transition-colors ${
                        isCurrentBaba 
                          ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20' 
                          : 'bg-muted/20 border border-border/20 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{baba.name}</h3>
                          <p className="text-xs text-muted-foreground">{formatDate(baba.updatedAt)}</p>
                        </div>
                        {getStatusBadge(baba.id, baba.status)}
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        {baba.fieldType.charAt(0).toUpperCase() + baba.fieldType.slice(1)} • {baba.playersPerTeam} jogadores/time
                      </div>

                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          onClick={() => handleContinueBaba(baba.id)}
                          className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50"
                        >
                          Continuar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditBaba(baba.id)}
                          className="text-muted-foreground hover:text-primary hover:bg-transparent"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(baba.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCancelDelete()}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Baba?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os times, partidas e estatísticas deste baba serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} className="border-border/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppMenu;
