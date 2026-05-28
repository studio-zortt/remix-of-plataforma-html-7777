import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Play, Users, AlertCircle, Star, Copy, CheckCircle, Key, BarChart3, Save, X, RefreshCw, UserMinus, UserPlus, MoreHorizontal, Download } from "lucide-react";
import { downloadTeamsImage } from "@/lib/teamsImageGenerator";
import { toast } from "sonner";
import { useBaba } from "@/contexts/BabaContext";
import { safeJsonParse } from "@/lib/utils";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import BallLoader from "@/components/BallLoader";
import logoHeader from "@/assets/logo-header-v2.svg";
import stadiumBg from "@/assets/stadium-background.webp";
import teamShield from "@/assets/team-shield.svg";
import ballIcon from "@/assets/ball-icon.svg";
import luvaGoleiro from "@/assets/luva-goleiro.svg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  name: string;
  isGoalkeeper: boolean;
  originalTeam: number;
  isBorrowed: boolean;
  isSeed: boolean;
  seedLevel?: number;
}

interface Team {
  id: number;
  players: Player[];
  goalkeeper: Player | null;
  isComplete: boolean;
}

interface ParsedPlayer {
  name: string;
  isSeed: boolean;
  seedLevel: number;
}

interface ParsedPlayers {
  main: ParsedPlayer[];
  goalkeepers: ParsedPlayer[];
  substitutes: ParsedPlayer[];
}

interface GameConfig {
  fieldType: string;
  playersPerTeam: number;
  gameDuration: number;
  winCriteria: string;
  team1ChoosesShirt: boolean;
}

const Teams = () => {
  const navigate = useNavigate();
  const {
    parsedPlayers: contextPlayers, 
    config: contextConfig, 
    currentBaba, 
    saveTeams, 
    savePlayers,
    updateBaba,
    rawPlayerList,
    teams: contextTeams,
    setTeams: setContextTeams,
    setQueue: setContextQueue,
    loading: contextLoading,
    hydrated: contextHydrated
  } = useBaba();
  const [teams, setTeams] = useState<Team[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [showSeedBadge, setShowSeedBadge] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{ teamId: number; playerIndex: number; player: Player } | null>(null);
  const [editingGoalkeeper, setEditingGoalkeeper] = useState<{ teamId: number; goalkeeper: Player } | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeedLevel, setEditSeedLevel] = useState("0");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isCreatingNewPlayer, setIsCreatingNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addPlayerModal, setAddPlayerModal] = useState<{ teamId: number } | null>(null);
  const [addGoalkeeperModal, setAddGoalkeeperModal] = useState<{ teamId: number } | null>(null);
  const [isCreatingNewGoalkeeper, setIsCreatingNewGoalkeeper] = useState(false);
  const [newGoalkeeperName, setNewGoalkeeperName] = useState("");

  // Use ref to track if this baba has been initialized
  const initializedBabaId = useRef<string | null>(null);
  // Use ref to prevent multiple concurrent generateTeams calls
  const isGeneratingRef = useRef(false);

  const savedBabaId = localStorage.getItem('currentBabaId');
  
  // Track if we should show loading state (determined after all hooks)
  const isLoading = contextLoading || !contextHydrated || (savedBabaId && !currentBaba);

  useEffect(() => {
    // Wait for hydration before proceeding
    if (!contextHydrated) return;
    
    // Se ainda está aguardando o baba carregar do localStorage, não redirecionar
    if (savedBabaId && !currentBaba) {
      return; // Aguardar o baba ser carregado
    }
    
    // Prevent re-entry if already generating
    if (isGeneratingRef.current) return;
    // Priorizar config do context (fonte mais atualizada) sobre localStorage
    const savedConfig = contextConfig || safeJsonParse<GameConfig | null>(localStorage.getItem('babaConfig'), null);
    const players = contextPlayers || safeJsonParse<ParsedPlayers | null>(localStorage.getItem('babaPlayers'), null);
    const shouldGenerateTeams = localStorage.getItem('shouldGenerateTeams') === '1';

    // Só redirecionar se realmente não houver configuração APÓS hidratação completa
    if (!savedConfig || !players) {
      // Verificar se há times já gerados no banco (baba existente)
      if (currentBaba && contextTeams && contextTeams.length > 0) {
        // Baba existe com times, não redirecionar - usar config do baba
        const gameConfig: GameConfig = {
          fieldType: currentBaba.fieldType,
          playersPerTeam: currentBaba.playersPerTeam,
          gameDuration: currentBaba.gameDuration,
          winCriteria: currentBaba.winCriteria,
          team1ChoosesShirt: true,
        };
        setConfig(gameConfig);
      } else {
        toast.error("Configuração incompleta!");
        navigate('/import-list');
        return;
      }
    }

    // IMPORTANTE: Para novo baba, SEMPRE usar contextConfig que foi setado em ConfigureGame
    // O currentBaba também tem a config atualizada do banco
    const gameConfig: GameConfig = contextConfig || savedConfig;
    if (gameConfig) {
      setConfig(gameConfig);
    }

    // 1) Preferir times vindos do banco (context) quando baba atual existe E NÃO estamos gerando novos times
    if (currentBaba && contextTeams && contextTeams.length > 0 && !shouldGenerateTeams) {
      // Get the line player limit from config
      const linePlayersLimit = (contextConfig?.playersPerTeam ?? currentBaba.playersPerTeam ?? 5) - 1;
      
      // Safely map teams with protection against incomplete data
      const loadedTeams: Team[] = contextTeams.map(t => {
        const safePlayers = Array.isArray(t.players) ? t.players.filter(p => p && p.name) : [];
        
        // Deduplicate players by name (keep first occurrence, prefer non-manually added)
        const seenNames = new Set<string>();
        const deduplicatedPlayers = safePlayers
          .sort((a, b) => {
            // Prioritize original players (is_added_manually = false) over substitutes
            const aManual = (a as any).isAddedManually ?? false;
            const bManual = (b as any).isAddedManually ?? false;
            if (aManual !== bManual) return aManual ? 1 : -1;
            return 0;
          })
          .filter(p => {
            const normalized = p.name.trim().toLowerCase();
            if (seenNames.has(normalized)) return false;
            seenNames.add(normalized);
            return true;
          })
          // Truncate to the team limit
          .slice(0, linePlayersLimit);
        
        return {
          id: t.teamNumber,
          players: deduplicatedPlayers.map(p => ({
            name: p.name || '',
            isGoalkeeper: p.isGoalkeeper ?? false,
            originalTeam: p.originalTeam ?? t.teamNumber,
            isBorrowed: p.isBorrowed ?? false,
            isSeed: p.isSeed ?? false,
            seedLevel: p.seedLevel ?? 0,
          })),
          goalkeeper: t.goalkeeper && t.goalkeeper.name ? {
            name: t.goalkeeper.name,
            isGoalkeeper: true,
            originalTeam: t.teamNumber,
            isBorrowed: false,
            isSeed: false,
          } : null,
          isComplete: deduplicatedPlayers.length === linePlayersLimit,
        };
      });

      setTeams(loadedTeams);
      localStorage.setItem('babaTeams', JSON.stringify(loadedTeams));

      const savedQueue = safeJsonParse<string[]>(localStorage.getItem('babaQueue'), []);
      if (savedQueue.length > 0) setQueue(savedQueue);

      initializedBabaId.current = currentBaba.id;
      return;
    }

    // 2) Se já existe babaTeams no localStorage E pertence ao baba atual E NÃO estamos gerando novos times
    const savedTeamsRaw = localStorage.getItem('babaTeams');
    if (savedTeamsRaw && currentBaba && savedBabaId === currentBaba.id && !shouldGenerateTeams) {
      const loadedTeams = safeJsonParse<Team[]>(savedTeamsRaw, []);
      if (Array.isArray(loadedTeams) && loadedTeams.length > 0) {
        setTeams(loadedTeams);
        const savedQueue = safeJsonParse<string[]>(localStorage.getItem('babaQueue'), []);
        if (savedQueue.length > 0) setQueue(savedQueue);
        initializedBabaId.current = currentBaba.id;
        return;
      }
    }

    // 3) Gerar automaticamente APENAS quando o usuário acabou de clicar em "Gerar Times" na tela anterior
    // IMPORTANTE: NÃO remover a flag aqui - só remover após salvar com sucesso em generateTeams()
    if (shouldGenerateTeams && !isGeneratingRef.current) {
      // SEMPRE usar gameConfig atualizado (contextConfig priorizado)
      isGeneratingRef.current = true;
      generateTeams(players, gameConfig).finally(() => {
        isGeneratingRef.current = false;
      });
      if (currentBaba?.id) initializedBabaId.current = currentBaba.id;
      return;
    }

    // Caso contrário: não re-sorteia ao entrar/voltar para /teams.
  }, [navigate, contextPlayers, contextConfig, currentBaba?.id, contextTeams, contextHydrated, savedBabaId]);

  const generateTeams = async (players: ParsedPlayers, config: GameConfig) => {
    const generatedTeams: Team[] = [];
    const playersPerTeam = config.playersPerTeam;
    const linePlayersPerTeam = playersPerTeam - 1;

    // Group seeds by level
    const seedsByLevel: Record<number, ParsedPlayer[]> = {};
    const regularPlayers = players.main.filter(p => !p.isSeed);
    players.main.filter(p => p.isSeed).forEach(player => {
      const level = player.seedLevel || 1;
      if (!seedsByLevel[level]) {
        seedsByLevel[level] = [];
      }
      seedsByLevel[level].push(player);
    });

    // Shuffle each level group
    Object.keys(seedsByLevel).forEach(level => {
      seedsByLevel[parseInt(level)] = seedsByLevel[parseInt(level)].sort(() => Math.random() - 0.5);
    });
    const shuffledRegulars = [...regularPlayers].sort(() => Math.random() - 0.5);
    const totalPlayers = players.main.length;
    const numberOfTeams = Math.ceil(totalPlayers / linePlayersPerTeam);
    
    for (let i = 0; i < numberOfTeams; i++) {
      generatedTeams.push({
        id: i + 1,
        players: [],
        goalkeeper: null,
        isComplete: false
      });
    }

    // Distribute seeds by level - one per team per level, circular distribution
    const sortedLevels = Object.keys(seedsByLevel).map(Number).sort((a, b) => a - b);
    sortedLevels.forEach(level => {
      const seedsAtLevel = seedsByLevel[level];
      
      // All levels use circular distribution - if more seeds than teams, some teams get 2+
      seedsAtLevel.forEach((seedPlayer, index) => {
        const targetTeamIndex = index % generatedTeams.length;
        generatedTeams[targetTeamIndex].players.push({
          name: seedPlayer.name,
          isGoalkeeper: false,
          originalTeam: targetTeamIndex + 1,
          isBorrowed: false,
          isSeed: true,
          seedLevel: level
        });
      });
    });

    // Fill remaining slots with regular players - complete teams in order (only last team can be incomplete)
    let regularIndex = 0;
    for (let teamIdx = 0; teamIdx < generatedTeams.length; teamIdx++) {
      const team = generatedTeams[teamIdx];
      while (team.players.length < linePlayersPerTeam && regularIndex < shuffledRegulars.length) {
        team.players.push({
          name: shuffledRegulars[regularIndex].name,
          isGoalkeeper: false,
          originalTeam: team.id,
          isBorrowed: false,
          isSeed: false
        });
        regularIndex++;
      }
    }

    // Mark complete/incomplete status
    generatedTeams.forEach(team => {
      team.isComplete = team.players.length === linePlayersPerTeam;
    });
    
    let gkIndex = 0;
    for (let i = 0; i < generatedTeams.length && gkIndex < players.goalkeepers.length; i++) {
      generatedTeams[i].goalkeeper = {
        name: players.goalkeepers[gkIndex].name,
        isGoalkeeper: true,
        originalTeam: generatedTeams[i].id,
        isBorrowed: false,
        isSeed: false
      };
      gkIndex++;
    }
    
    const allSubstitutes = players.substitutes.map(p => p.name);
    let subIndex = 0;
    for (const team of generatedTeams) {
      while (team.players.length < linePlayersPerTeam && subIndex < allSubstitutes.length) {
        team.players.push({
          name: allSubstitutes[subIndex],
          isGoalkeeper: false,
          originalTeam: team.id,
          isBorrowed: true,
          isSeed: false
        });
        subIndex++;
      }
    }

    // Se faltarem jogadores, concentrar a falta apenas no último time
    const totalSlots = generatedTeams.length * linePlayersPerTeam;
    const totalLinePlayers = generatedTeams.reduce((acc, t) => acc + t.players.length, 0);
    if (generatedTeams.length > 1 && totalLinePlayers < totalSlots) {
      const flatPlayers = generatedTeams.flatMap(t => t.players);
      let cursor = 0;
      for (let i = 0; i < generatedTeams.length - 1; i++) {
        const slice = flatPlayers.slice(cursor, cursor + linePlayersPerTeam);
        generatedTeams[i].players = slice.map(p => ({
          ...p,
          originalTeam: generatedTeams[i].id
        }));
        cursor += linePlayersPerTeam;
      }
      const lastIdx = generatedTeams.length - 1;
      generatedTeams[lastIdx].players = flatPlayers.slice(cursor).map(p => ({
        ...p,
        originalTeam: generatedTeams[lastIdx].id
      }));
    }

    // Sort players within each team: seeds first (level 1 first, then by ascending level), then regular players
    const sortTeamPlayers = (players: Player[]): Player[] => {
      return [...players].sort((a, b) => {
        // Seeds come first
        if (a.isSeed && !b.isSeed) return -1;
        if (!a.isSeed && b.isSeed) return 1;
        // Among seeds, sort by level (level 1 first, then 2, 3, etc.)
        if (a.isSeed && b.isSeed) {
          return (a.seedLevel || 1) - (b.seedLevel || 1);
        }
        // Regular players maintain their order
        return 0;
      });
    };

    // Apply sorting to each team
    generatedTeams.forEach(team => {
      team.players = sortTeamPlayers(team.players);
    });

    // Mark complete/incomplete status
    generatedTeams.forEach(team => {
      team.isComplete = team.players.length === linePlayersPerTeam;
    });
    
    const queuePlayers = allSubstitutes.slice(subIndex);
    setQueue(queuePlayers);
    setTeams(generatedTeams);

    // Keep context in sync
    const teamsForDb = generatedTeams.map(t => ({
      teamNumber: t.id,
      players: t.players,
      goalkeeper: t.goalkeeper,
      isComplete: t.isComplete,
      totalWins: 0,
    }));
    setContextTeams(teamsForDb);
    setContextQueue(queuePlayers);

    // Save to localStorage for backward compatibility
    localStorage.setItem('babaTeams', JSON.stringify(generatedTeams));
    localStorage.setItem('babaQueue', JSON.stringify(queuePlayers));

    // Save teams to database - use currentBaba.id or fallback to localStorage
    const babaId = currentBaba?.id ?? localStorage.getItem('currentBabaId');
    
    if (babaId) {
      try {
        await saveTeams(babaId, teamsForDb);
        // Só limpar a flag após salvar com sucesso
        localStorage.removeItem('shouldGenerateTeams');
        toast.success(`${generatedTeams.length} times gerados e salvos!`);
      } catch (error) {
        console.error('Error saving teams to database:', error);
        // NÃO remover a flag - permitir tentar novamente
        toast.error('Erro ao salvar times. Tente gerar novamente.');
      }
    } else {
      console.error('generateTeams: Nenhum babaId disponível para salvar times!');
      toast.error('Erro: sessão não encontrada. Volte para a lista de importação.');
    }
  };

  const handleStartGame = async () => {
    if (teams.length < 2) {
      toast.error("Necessário pelo menos 2 times!");
      return;
    }

    // Ensure context + localStorage are aligned with the latest state
    const teamsForDb = teams.map(t => ({
      teamNumber: t.id,
      players: t.players,
      goalkeeper: t.goalkeeper,
      isComplete: t.isComplete,
      totalWins: 0,
    }));
    setContextTeams(teamsForDb);
    setContextQueue(queue);

    localStorage.setItem('babaTeams', JSON.stringify(teams));
    localStorage.setItem('babaQueue', JSON.stringify(queue));
    
    // Update setup_status to 'game'
    await updateBaba({ setupStatus: 'game' } as any);
    
    navigate('/game');
  };

  const handleCopyTeams = () => {
    let teamsText = `⚽ *Times do Baba de hoje*\n\n`;
    teams.forEach(team => {
      teamsText += `📋 *Time ${team.id}*\n`;
      team.players.forEach((player, idx) => {
        let playerLine = `   ${idx + 1}. ${player.name}`;
        if (showSeedBadge && player.isSeed) {
          if (!player.seedLevel || player.seedLevel === 1) {
            playerLine += " 🔑";
          } else {
            playerLine += ` ${player.seedLevel}`;
          }
        }
        teamsText += playerLine + "\n";
      });
      if (team.goalkeeper) {
        teamsText += `🥅 Goleiro: ${team.goalkeeper.name}\n\n`;
      } else {
        teamsText += `🥅 Goleiro: Sem goleiro\n\n`;
      }
    });
    if (queue.length > 0) {
      teamsText += `⏳ *FILA DE ESPERA*\n`;
      queue.forEach((player, idx) => {
        teamsText += `   ${idx + 1}. ${player}\n`;
      });
    }
    navigator.clipboard.writeText(teamsText);
    toast.success("Times copiados para o WhatsApp!");
  };

  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const handleDownloadImage = async () => {
    if (isDownloadingImage) return;
    setIsDownloadingImage(true);
    try {
      await downloadTeamsImage({
        teams: teams.map(t => ({
          id: t.id,
          players: t.players.map(p => ({ name: p.name, isSeed: p.isSeed, seedLevel: p.seedLevel })),
          goalkeeper: t.goalkeeper ? { name: t.goalkeeper.name } : null,
          isComplete: t.isComplete,
        })),
        queue,
        showSeedBadge,
      });
      toast.success("Imagem dos times baixada!");
    } catch (err) {
      console.error('Error generating teams image:', err);
      toast.error("Erro ao gerar imagem");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleEditPlayer = (teamId: number, playerIndex: number, player: Player) => {
    setEditingPlayer({ teamId, playerIndex, player });
    setEditName(player.name);
    setEditSeedLevel(player.seedLevel?.toString() || "0");
  };

  // When opening goalkeeper edit dialog, set the name
  useEffect(() => {
    if (editingGoalkeeper) {
      setEditName(editingGoalkeeper.goalkeeper.name);
    }
  }, [editingGoalkeeper]);

  const handleSavePlayerEdit = async () => {
    if (!editingPlayer) return;

    const updatedTeams = teams.map(team => {
      if (team.id === editingPlayer.teamId) {
        const updatedPlayers = [...team.players];
        updatedPlayers[editingPlayer.playerIndex] = {
          ...updatedPlayers[editingPlayer.playerIndex],
          name: editName,
          isSeed: parseInt(editSeedLevel) > 0,
          seedLevel: parseInt(editSeedLevel),
        };
        return { ...team, players: updatedPlayers };
      }
      return team;
    });

    // OPTIMISTIC UPDATE: Close modal immediately, then save in background
    setTeams(updatedTeams);
    setEditingPlayer(null);
    toast.success("Jogador atualizado!");
    
    localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

    const teamsForDb = updatedTeams.map(t => ({
      teamNumber: t.id,
      players: t.players,
      goalkeeper: t.goalkeeper,
      isComplete: t.isComplete,
      totalWins: 0,
    }));
    setContextTeams(teamsForDb);

    // Save to database in background (non-blocking)
    if (currentBaba?.id) {
      saveTeams(currentBaba.id, teamsForDb).catch(error => {
        console.error('Error saving teams:', error);
        toast.error("Erro ao sincronizar alterações");
      });
    }
  };

  const handleSwapWithQueue = async (teamId: number, playerIndex: number, queuePlayerName: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const removedPlayer = team.players[playerIndex];

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        const updatedPlayers = [...t.players];
        updatedPlayers[playerIndex] = {
          name: queuePlayerName,
          isGoalkeeper: false,
          originalTeam: teamId,
          isBorrowed: true,
          isSeed: false,
        };
        return { ...t, players: updatedPlayers };
      }
      return t;
    });

    const updatedQueue = queue.filter(p => p !== queuePlayerName);
    updatedQueue.push(removedPlayer.name);

    setTeams(updatedTeams);
    setQueue(updatedQueue);
    localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));
    localStorage.setItem('babaQueue', JSON.stringify(updatedQueue));

    const teamsForDb = updatedTeams.map(t => ({
      teamNumber: t.id,
      players: t.players,
      goalkeeper: t.goalkeeper,
      isComplete: t.isComplete,
      totalWins: 0,
    }));
    setContextTeams(teamsForDb);
    setContextQueue(updatedQueue);

    // Save to database
    if (currentBaba?.id) {
      try {
        await saveTeams(currentBaba.id, teamsForDb);
        toast.success(`${removedPlayer.name} substituído por ${queuePlayerName}`);
      } catch (error) {
        console.error('Error saving teams:', error);
        toast.error("Erro ao salvar alterações");
      }
    } else {
      toast.success(`${removedPlayer.name} substituído por ${queuePlayerName}`);
    }
  };

  const handleRegenerateTeams = async () => {
    const players = contextPlayers || safeJsonParse<ParsedPlayers | null>(localStorage.getItem('babaPlayers'), null);
    if (!players || !config) {
      toast.error("Dados insuficientes para gerar times!");
      return;
    }
    
    // Fechar o dialog imediatamente para feedback visual
    setShowRegenerateDialog(false);
    
    // Reset the initialized tracker so we can regenerate
    initializedBabaId.current = null;
    
    await generateTeams(players, config);
  };

  // Show loading while hydrating (AFTER all hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Background Image - Fixed */}
      <div className="fixed-bg" style={{ backgroundImage: `url(${stadiumBg})` }} />
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-background/40 z-10" />

      {/* Audio Controls - Fixed Bottom Right */}
      <AudioControls />

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col">
        {/* Header - Fixed */}
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/configure-game')} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">Times Gerados</h1>
                <p className="text-sm text-muted-foreground">
                  {config && `${teams.length} times • ${config.playersPerTeam} jogadores/time`}
                </p>
              </div>
              {/* Desktop action buttons only */}
              <Button 
                variant="outline" 
                onClick={() => setShowRegenerateDialog(true)} 
                className="hidden sm:flex border-warning-yellow/50 text-warning-yellow bg-warning-yellow/10 hover:bg-warning-yellow/20 hover:text-warning-yellow/90 hover:border-warning-yellow/70"
                title="Sortear Novamente"
              >
                <RefreshCw className="w-4 h-4 lg:mr-1.5" />
                <span className="hidden lg:inline">Sortear Novamente</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyTeams}
                className="hidden sm:flex border-primary text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary-hover hover:border-primary-hover backdrop-blur-sm"
                title="Copiar Times"
              >
                <Copy className="w-4 h-4 lg:mr-1.5" />
                <span className="hidden lg:inline">Copiar Times</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadImage}
                disabled={isDownloadingImage}
                className="hidden sm:flex border-primary text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary-hover hover:border-primary-hover backdrop-blur-sm"
                title="Baixar Imagem"
              >
                <Download className="w-4 h-4 lg:mr-1.5" />
                <span className="hidden lg:inline">{isDownloadingImage ? 'Gerando...' : 'Baixar Imagem'}</span>
              </Button>
              <Button onClick={handleStartGame} className="group btn-cta-green hidden sm:flex">
                <img src={ballIcon} alt="" className="w-4 h-4 md:mr-1.5 animate-spin-ball" />
                <span className="hidden md:inline">Iniciar Partida</span>
              </Button>
              <AppMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 pb-28 sm:pb-8 flex-1">
          {/* Teams Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {teams.map(team => (
              <Card key={team.id} className={`bg-card/60 backdrop-blur-xl shadow-card border transition-all hover:shadow-elevated rounded-3xl ${team.isComplete ? 'border-border/30 hover:border-primary/30' : 'border-destructive/50'}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20">
                      <img src={teamShield} alt="" className="w-6 h-6" />
                      <span className="font-bold text-[hsl(142_70%_60%)] text-base">Time {team.id}</span>
                    </span>
                    {!team.isComplete && (
                      <Badge variant="destructive" className="text-xs mx-0 my-0 py-[4px] px-[12px]">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Incompleto
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Goleiro */}
                  {team.goalkeeper ? (
                    <div 
                      className="group p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => setEditingGoalkeeper({ teamId: team.id, goalkeeper: team.goalkeeper! })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1.5"><img src={luvaGoleiro} alt="" className="w-3 h-3" />GOLEIRO</div>
                          <div className="font-semibold text-foreground">
                            {team.goalkeeper.name}
                          </div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddGoalkeeperModal({ teamId: team.id })}
                      className="w-full p-3 rounded-xl bg-primary/5 border border-dashed border-primary/30 hover:bg-primary/15 hover:border-primary/50 transition-colors"
                    >
                      <div className="text-xs text-primary font-semibold mb-1 flex items-center justify-center gap-1.5"><img src={luvaGoleiro} alt="" className="w-3 h-3" />GOLEIRO</div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <UserPlus className="w-4 h-4" />
                        <span>Adicionar goleiro</span>
                      </div>
                    </button>
                  )}
                  
                  {/* Jogadores de linha */}
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold mb-2">JOGADORES DE LINHA ({team.players.length})</div>
                    <div className="space-y-1">
                      {team.players.map((player, idx) => {
                        const isLevel1Seed = player.isSeed && (!player.seedLevel || player.seedLevel === 1);
                        const isOtherLevelSeed = player.isSeed && player.seedLevel && player.seedLevel > 1;
                        
                        const getSeedIcon = (level?: number) => {
                          if (!level || level === 1) return <Key className="w-3 h-3 text-star-gold" />;
                          return <span className="text-xs font-bold text-white">{level}</span>;
                        };
                        
                        // Determine background and text colors based on seed level
                        let cardClasses = 'bg-muted/50';
                        let textClasses = 'text-foreground';
                        
                        if (showSeedBadge && isLevel1Seed) {
                          cardClasses = 'bg-star-gold/15 border border-star-gold/30';
                          textClasses = 'text-star-gold font-medium';
                        } else if (showSeedBadge && isOtherLevelSeed) {
                          cardClasses = 'bg-[hsl(222_47%_18%)] border border-[hsl(222_47%_25%)]';
                          textClasses = 'text-white font-medium';
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            className={`group text-sm py-2 px-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer hover:bg-muted/70 ${cardClasses}`}
                            onClick={() => handleEditPlayer(team.id, idx, player)}
                          >
                            <span className={textClasses}>
                              {player.name}
                            </span>
                            <div className="flex gap-1 items-center">
                              {showSeedBadge && player.isSeed && (
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isLevel1Seed ? 'bg-star-gold/20' : 'bg-white/10'}`}>
                                  {getSeedIcon(player.seedLevel)}
                                </div>
                              )}
                              <MoreHorizontal className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Slots vazios para times incompletos */}
                      {config && team.players.length < config.playersPerTeam - 1 && (
                        Array.from({ length: config.playersPerTeam - 1 - team.players.length }).map((_, idx) => (
                          <button
                            key={`empty-${idx}`}
                            onClick={() => setAddPlayerModal({ teamId: team.id })}
                            className="w-full text-sm py-2 px-3 rounded-xl text-center font-medium bg-muted/30 border border-dashed border-muted-foreground/40 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                          >
                            <span className="text-muted-foreground flex items-center justify-center gap-1">
                              <UserPlus className="w-4 h-4" />
                              Adicionar jogador
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Fila de Espera */}
          {queue.length > 0 && (
            <Card className="bg-card/60 backdrop-blur-xl border border-border/30 shadow-card mb-6 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  Fila de Espera ({queue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {queue.map((player, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm bg-muted/50">
                      {player}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opções e Informações */}
          <Card className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl">
            <CardContent className="pt-6">
              {/* Toggle para mostrar níveis de jogadores */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-star-gold/20 flex items-center justify-center">
                    <BarChart3 className="text-star-gold w-[20px] h-[20px]" />
                  </div>
                  <Label htmlFor="show-seed" className="text-foreground font-medium">
                    Mostrar níveis de jogadores
                  </Label>
                </div>
                <Switch id="show-seed" checked={showSeedBadge} onCheckedChange={setShowSeedBadge} className="data-[state=unchecked]:bg-[hsl(45_30%_30%)] data-[state=checked]:bg-warning-yellow [&>span]:bg-[hsl(222_47%_15%)]" />
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="gap-3 flex items-start justify-start">
                  <CheckCircle className="text-[#3DC563] flex-shrink-0 mt-0.5 w-[18px] h-[18px]" />
                  <p className="text-slate-200">Times distribuídos de forma aleatória.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-[#3DC563] flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                  <p className="text-slate-200">Se você definiu níveis, os jogadores foram separados em times diferentes.</p>
                </div>
                <div className="flex items-start gap-3">
                  <MoreHorizontal className="text-[hsl(214_15%_82%)] flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                  <p className="text-slate-200">Clique em um jogador para editar ou substituir.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Copy className="text-[#3DC563] flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                  <p className="text-slate-200">Clique em "Copiar Times" para enviar no WhatsApp.</p>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="text-warning-yellow flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                  <p className="text-slate-200">Clique em "Sortear Novamente" para gerar novos times.</p>
                </div>
                {queue.length > 0 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-hover flex-shrink-0 mt-0.5" />
                    <p className="text-primary-hover/90">{queue.length} jogadores na fila aguardando para entrar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Fixed Start Game Button - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 pt-16 px-4 pb-10 z-30 sm:hidden bg-gradient-to-t from-background via-background/90 to-transparent">
          {/* Mobile action buttons */}
          <div className="flex gap-1.5 mb-3">
            <Button 
              variant="outline" 
              onClick={() => setShowRegenerateDialog(true)}
              className="flex-1 px-2 gap-1 border-warning-yellow/50 text-warning-yellow bg-warning-yellow/10 hover:bg-warning-yellow/20"
            >
              <RefreshCw className="w-4 h-4" />
              Sortear
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyTeams}
              className="flex-1 px-2 gap-1 border-primary text-primary bg-primary/10 hover:bg-primary/20"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="flex-1 px-2 gap-1 border-primary text-primary bg-primary/10 hover:bg-primary/20"
            >
              <Download className="w-4 h-4" />
              Imagem
            </Button>
          </div>
          <Button onClick={handleStartGame} className="group btn-cta-green w-full text-base py-6 px-8">
            <span>Iniciar Partida</span>
            <ArrowRight className="w-5 h-5 ml-1.5 arrow-nudge" />
          </Button>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Jogador</DialogTitle>
            <DialogDescription>
              Altere o nome ou nível do jogador, ou substitua por alguém da fila.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Nome</Label>
              <Input
                id="playerName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-input/50 border-border/50"
                onFocus={(e) => {
                  // Move cursor to end instead of selecting all
                  const val = e.target.value;
                  e.target.value = '';
                  e.target.value = val;
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seedLevel">Nível do jogador</Label>
              <Select value={editSeedLevel} onValueChange={setEditSeedLevel}>
                <SelectTrigger className="bg-input/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: Math.max(1, (config?.playersPerTeam ?? 5) - 1) },
                    (_, i) => i + 1
                  ).map((level) => (
                    <SelectItem key={level} value={String(level)}>
                      {level === 1 ? "Cabeça de chave" : `Nível ${level}`}
                    </SelectItem>
                  ))}
                  <SelectItem value="0">Sem nível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {queue.length > 0 && editingPlayer && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label>Substituir por jogador da fila</Label>
                <div className="flex flex-wrap gap-2">
                  {queue.map((queuePlayer, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSwapWithQueue(editingPlayer.teamId, editingPlayer.playerIndex, queuePlayer);
                        setEditingPlayer(null);
                      }}
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      {queuePlayer}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Criar novo jogador e substituir */}
            {editingPlayer && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label>Criar novo jogador</Label>
                {!isCreatingNewPlayer ? (
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setIsCreatingNewPlayer(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Criar e substituir por novo jogador
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do novo jogador"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="bg-input/50 border-border/50"
                      autoFocus
                      onFocus={(e) => {
                        const val = e.target.value;
                        e.target.value = '';
                        e.target.value = val;
                      }}
                    />
                    <div className="flex gap-2 pt-3">
                      <Button 
                        variant="ghost" 
                        onClick={() => { 
                          setIsCreatingNewPlayer(false); 
                          setNewPlayerName(""); 
                        }}
                        className="flex-1 bg-muted/40 hover:bg-muted/60"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        disabled={!newPlayerName.trim()}
                        className="flex-1 bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
                        onClick={async () => {
                          if (!editingPlayer) return;
                          
                          const updatedTeams = teams.map(team => {
                            if (team.id === editingPlayer.teamId) {
                              const updatedPlayers = [...team.players];
                              updatedPlayers[editingPlayer.playerIndex] = {
                                name: newPlayerName.trim(),
                                isGoalkeeper: false,
                                originalTeam: team.id,
                                isBorrowed: true,
                                isSeed: false,
                              };
                              return { ...team, players: updatedPlayers };
                            }
                            return team;
                          });

                          // OPTIMISTIC UPDATE
                          setTeams(updatedTeams);
                          setEditingPlayer(null);
                          setIsCreatingNewPlayer(false);
                          setNewPlayerName("");
                          toast.success("Jogador criado e adicionado!");
                          
                          localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                          const teamsForDb = updatedTeams.map(t => ({
                            teamNumber: t.id,
                            players: t.players,
                            goalkeeper: t.goalkeeper,
                            isComplete: t.isComplete,
                            totalWins: 0,
                          }));
                          setContextTeams(teamsForDb);

                          if (currentBaba?.id) {
                            saveTeams(currentBaba.id, teamsForDb).catch(error => {
                              console.error('Error saving teams:', error);
                              toast.error("Erro ao sincronizar alterações");
                            });
                          }
                        }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingPlayer(null)}
              className="w-full sm:w-auto border-border/50 text-muted-foreground hover:bg-muted/30 hover:text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePlayerEdit} className="w-full sm:w-auto bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground">
              <Save className="w-4 h-4 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goalkeeper Dialog */}
      <Dialog open={!!editingGoalkeeper} onOpenChange={(open) => { 
        if (!open) {
          setEditingGoalkeeper(null);
          setIsCreatingNewGoalkeeper(false);
          setNewGoalkeeperName("");
        }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Goleiro</DialogTitle>
            <DialogDescription>
              Altere o nome do goleiro ou substitua por outro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goalkeeperName">Nome</Label>
              <Input
                id="goalkeeperName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-input/50 border-border/50"
              />
            </div>

            {/* Substituir por outro goleiro registrado */}
            {contextPlayers?.goalkeepers && contextPlayers.goalkeepers.length > 1 && editingGoalkeeper && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label>Substituir por outro goleiro</Label>
                <div className="flex flex-wrap gap-2">
                  {contextPlayers.goalkeepers
                    .filter(gk => gk.name !== editingGoalkeeper.goalkeeper.name)
                    .map((gk, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const gkPlayer = contextPlayers.goalkeepers?.find(g => g.name === gk.name);
                          
                          // Remove goleiro do time atual dele (se estiver em outro)
                          const updatedTeams = teams.map(team => {
                            // Se este time já tem o goleiro, remove
                            if (team.goalkeeper?.name === gk.name && team.id !== editingGoalkeeper.teamId) {
                              toast.info(`${gk.name} removido do Time ${team.id}`);
                              return { ...team, goalkeeper: null };
                            }
                            // Se é o time destino, atribui o goleiro
                            if (team.id === editingGoalkeeper.teamId) {
                              return { 
                                ...team, 
                                goalkeeper: {
                                  name: gk.name,
                                  isGoalkeeper: true,
                                  originalTeam: team.id,
                                  isBorrowed: false,
                                  isSeed: gkPlayer?.isSeed || false,
                                  seedLevel: gkPlayer?.seedLevel
                                }
                              };
                            }
                            return team;
                          });

                          setTeams(updatedTeams);
                          localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                          const teamsForDb = updatedTeams.map(t => ({
                            teamNumber: t.id,
                            players: t.players,
                            goalkeeper: t.goalkeeper,
                            isComplete: t.isComplete,
                            totalWins: 0,
                          }));
                          setContextTeams(teamsForDb);

                          if (currentBaba?.id) {
                            saveTeams(currentBaba.id, teamsForDb).catch(error => {
                              console.error('Error saving teams:', error);
                            });
                          }

                          toast.success(`${gk.name} agora é goleiro do Time ${editingGoalkeeper.teamId}`);
                          setEditingGoalkeeper(null);
                        }}
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      >
                        {gk.name}
                      </Button>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Criar novo goleiro */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label>Criar novo goleiro</Label>
              {!isCreatingNewGoalkeeper ? (
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setIsCreatingNewGoalkeeper(true)}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Criar e substituir por novo goleiro
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do novo goleiro"
                    value={newGoalkeeperName}
                    onChange={(e) => setNewGoalkeeperName(e.target.value)}
                    className="bg-input/50 border-border/50"
                    autoFocus
                  />
                  <div className="flex gap-2 pt-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => { 
                        setIsCreatingNewGoalkeeper(false); 
                        setNewGoalkeeperName(""); 
                      }}
                      className="flex-1 bg-muted/40 hover:bg-muted/60"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      disabled={!newGoalkeeperName.trim()}
                      className="flex-1 bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
                      onClick={async () => {
                        if (!editingGoalkeeper) return;
                        
                        const updatedTeams = teams.map(team => {
                          if (team.id === editingGoalkeeper.teamId) {
                            return { 
                              ...team, 
                              goalkeeper: {
                                name: newGoalkeeperName.trim(),
                                isGoalkeeper: true,
                                originalTeam: team.id,
                                isBorrowed: true,
                                isSeed: false,
                              }
                            };
                          }
                          return team;
                        });

                        setTeams(updatedTeams);
                        localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                        const teamsForDb = updatedTeams.map(t => ({
                          teamNumber: t.id,
                          players: t.players,
                          goalkeeper: t.goalkeeper,
                          isComplete: t.isComplete,
                          totalWins: 0,
                        }));
                        setContextTeams(teamsForDb);

                        if (currentBaba?.id) {
                          saveTeams(currentBaba.id, teamsForDb).catch(error => {
                            console.error('Error saving teams:', error);
                          });
                        }

                        toast.success("Goleiro criado e adicionado!");
                        setEditingGoalkeeper(null);
                        setIsCreatingNewGoalkeeper(false);
                        setNewGoalkeeperName("");
                      }}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setEditingGoalkeeper(null);
                setIsCreatingNewGoalkeeper(false);
                setNewGoalkeeperName("");
              }}
              className="w-full sm:w-auto border-border/50 text-muted-foreground hover:bg-muted/30 hover:text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!editingGoalkeeper) return;
                
                const updatedTeams = teams.map(team => {
                  if (team.id === editingGoalkeeper.teamId && team.goalkeeper) {
                    return { ...team, goalkeeper: { ...team.goalkeeper, name: editName } };
                  }
                  return team;
                });

                setTeams(updatedTeams);
                localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                const teamsForDb = updatedTeams.map(t => ({
                  teamNumber: t.id,
                  players: t.players,
                  goalkeeper: t.goalkeeper,
                  isComplete: t.isComplete,
                  totalWins: 0,
                }));
                setContextTeams(teamsForDb);

                if (currentBaba?.id) {
                  try {
                    await saveTeams(currentBaba.id, teamsForDb);
                    toast.success("Goleiro atualizado!");
                  } catch (error) {
                    console.error('Error saving teams:', error);
                    toast.error("Erro ao salvar alterações");
                  }
                } else {
                  toast.success("Goleiro atualizado!");
                }

                setEditingGoalkeeper(null);
              }} 
              className="w-full sm:w-auto bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Teams Confirmation Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Sortear Novamente?</DialogTitle>
            <DialogDescription>
              Isso irá gerar novos times aleatórios. As edições feitas nos times atuais serão perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <Button variant="ghost" onClick={() => setShowRegenerateDialog(false)} className="text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
            <Button onClick={handleRegenerateTeams} className="bg-warning-yellow hover:bg-warning-yellow/90 text-background">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Sortear Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Modal for incomplete teams */}
      <Dialog open={!!addPlayerModal} onOpenChange={(open) => !open && setAddPlayerModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Jogador</DialogTitle>
            <DialogDescription>
              Crie um novo jogador para completar o time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addPlayerName">Nome do jogador</Label>
              <Input
                id="addPlayerName"
                placeholder="Digite o nome do jogador"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="bg-input/50 border-border/50"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setAddPlayerModal(null);
                setNewPlayerName("");
              }}
              className="w-full sm:w-auto text-muted-foreground hover:bg-muted/30"
            >
              Cancelar
            </Button>
            <Button 
              disabled={!newPlayerName.trim()}
              onClick={async () => {
                if (!addPlayerModal || !config) return;
                
                const team = teams.find(t => t.id === addPlayerModal.teamId);
                if (!team) return;

                const newPlayer: Player = {
                  name: newPlayerName.trim(),
                  isGoalkeeper: false,
                  originalTeam: addPlayerModal.teamId,
                  isBorrowed: true,
                  isSeed: false,
                };

                const updatedTeams = teams.map(t => {
                  if (t.id === addPlayerModal.teamId) {
                    const updatedPlayers = [...t.players, newPlayer];
                    return { 
                      ...t, 
                      players: updatedPlayers,
                      isComplete: updatedPlayers.length >= config.playersPerTeam - 1 
                    };
                  }
                  return t;
                });

                // OPTIMISTIC UPDATE
                setTeams(updatedTeams);
                setAddPlayerModal(null);
                setNewPlayerName("");
                toast.success("Jogador adicionado ao time!");
                
                localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                const teamsForDb = updatedTeams.map(t => ({
                  teamNumber: t.id,
                  players: t.players,
                  goalkeeper: t.goalkeeper,
                  isComplete: t.isComplete,
                  totalWins: 0,
                }));
                setContextTeams(teamsForDb);

                if (currentBaba?.id) {
                  saveTeams(currentBaba.id, teamsForDb).catch(error => {
                    console.error('Error saving teams:', error);
                    toast.error("Erro ao sincronizar alterações");
                  });
                }
              }}
              className="w-full sm:w-auto bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goalkeeper Modal for teams without goalkeeper */}
      <Dialog open={!!addGoalkeeperModal} onOpenChange={(open) => {
        if (!open) {
          setAddGoalkeeperModal(null);
          setNewGoalkeeperName("");
        }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Goleiro</DialogTitle>
            <DialogDescription>
              Escolha um goleiro registrado ou crie um novo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Lista de goleiros registrados */}
            {contextPlayers?.goalkeepers && contextPlayers.goalkeepers.length > 0 && (
              <div className="space-y-2">
                <Label>Goleiros registrados</Label>
                <div className="flex flex-wrap gap-2">
                  {contextPlayers.goalkeepers.map((gk, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!addGoalkeeperModal) return;
                        
                        const gkPlayer = contextPlayers.goalkeepers?.find(g => g.name === gk.name);
                        
                        // Remove goleiro do time atual dele (se estiver em outro)
                        const updatedTeams = teams.map(team => {
                          // Se este time já tem o goleiro, remove
                          if (team.goalkeeper?.name === gk.name && team.id !== addGoalkeeperModal.teamId) {
                            toast.info(`${gk.name} removido do Time ${team.id}`);
                            return { ...team, goalkeeper: null };
                          }
                          // Se é o time destino, atribui o goleiro
                          if (team.id === addGoalkeeperModal.teamId) {
                            return { 
                              ...team, 
                              goalkeeper: {
                                name: gk.name,
                                isGoalkeeper: true,
                                originalTeam: team.id,
                                isBorrowed: false,
                                isSeed: gkPlayer?.isSeed || false,
                                seedLevel: gkPlayer?.seedLevel
                              }
                            };
                          }
                          return team;
                        });

                        setTeams(updatedTeams);
                        localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                        const teamsForDb = updatedTeams.map(t => ({
                          teamNumber: t.id,
                          players: t.players,
                          goalkeeper: t.goalkeeper,
                          isComplete: t.isComplete,
                          totalWins: 0,
                        }));
                        setContextTeams(teamsForDb);

                        if (currentBaba?.id) {
                          saveTeams(currentBaba.id, teamsForDb).catch(error => {
                            console.error('Error saving teams:', error);
                          });
                        }

                        toast.success(`${gk.name} agora é goleiro do Time ${addGoalkeeperModal.teamId}`);
                        setAddGoalkeeperModal(null);
                        setNewGoalkeeperName("");
                      }}
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {gk.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Criar novo goleiro */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label>Ou crie um novo goleiro</Label>
              <Input
                placeholder="Nome do goleiro"
                value={newGoalkeeperName}
                onChange={(e) => setNewGoalkeeperName(e.target.value)}
                className="bg-input/50 border-border/50"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setAddGoalkeeperModal(null);
                setNewGoalkeeperName("");
              }}
              className="w-full sm:w-auto bg-muted/40 hover:bg-muted/60 text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button 
              disabled={!newGoalkeeperName.trim()}
              onClick={async () => {
                if (!addGoalkeeperModal) return;
                
                const updatedTeams = teams.map(team => {
                  if (team.id === addGoalkeeperModal.teamId) {
                    return { 
                      ...team, 
                      goalkeeper: {
                        name: newGoalkeeperName.trim(),
                        isGoalkeeper: true,
                        originalTeam: team.id,
                        isBorrowed: true,
                        isSeed: false,
                      }
                    };
                  }
                  return team;
                });

                setTeams(updatedTeams);
                localStorage.setItem('babaTeams', JSON.stringify(updatedTeams));

                const teamsForDb = updatedTeams.map(t => ({
                  teamNumber: t.id,
                  players: t.players,
                  goalkeeper: t.goalkeeper,
                  isComplete: t.isComplete,
                  totalWins: 0,
                }));
                setContextTeams(teamsForDb);

                if (currentBaba?.id) {
                  saveTeams(currentBaba.id, teamsForDb).catch(error => {
                    console.error('Error saving teams:', error);
                  });
                }

                toast.success("Goleiro criado e adicionado!");
                setAddGoalkeeperModal(null);
                setNewGoalkeeperName("");
              }}
              className="w-full sm:w-auto bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;
