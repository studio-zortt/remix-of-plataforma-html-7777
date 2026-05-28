import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, AlertCircle, ChevronRight, Trophy, RefreshCw, HelpCircle, TrendingUp, Settings, Users, Copy, UsersRound, Dices, UserPlus, MoreVertical, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useBaba } from "@/contexts/BabaContext";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import BallLoader from "@/components/BallLoader";
import whistleSound from "@/assets/whistle-sound.mp3";
import goalSound from "@/assets/goal-sound.mp3";
import ballIcon from "@/assets/ball-icon.svg";
import bolaVerde from "@/assets/bola_verde.svg";
import assistenciaVerde from "@/assets/assistencia-verde.svg";
import assistenciaBranco from "@/assets/assistencia-branco.svg";
import teamShield from "@/assets/team-shield.svg";
import teamShieldWhite from "@/assets/team-shield-white.svg";
import chuteiraIcon from "@/assets/chuteira-icon.svg";
import trofeuIcon from "@/assets/trofeu-icon.svg";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { AddPlayerModal } from "@/components/game/AddPlayerModal";
import { TeamActionsMenu } from "@/components/game/TeamActionsMenu";
import { GoalkeeperModal } from "@/components/game/GoalkeeperModal";
import { RemovedTeamsCard } from "@/components/game/RemovedTeamsCard";
import { ReplacePlayerModal } from "@/components/game/ReplacePlayerModal";
import VSCinematicAnimation from "@/components/game/VSCinematicAnimation";
import { Switch } from "@/components/ui/switch";

interface Player {
  id?: string;
  name: string;
  isGoalkeeper: boolean;
  originalTeam: number;
  isBorrowed: boolean;
  isSeed?: boolean;
  seedLevel?: number;
  goals?: number;
  assists?: number;
}

interface Team {
  id: number;
  players: Player[];
  goalkeeper: Player | null;
  isComplete: boolean;
  score?: number;
}

interface GameConfig {
  fieldType: string;
  playersPerTeam: number;
  gameDuration: number;
  winCriteria: string;
  team1ChoosesShirt: boolean;
}

interface TiedPair {
  team1Index: number;
  team2Index: number;
}

interface GoalRecord {
  teamIndex: number;
  playerIndex: number;
  scorerName: string;
  scorerType: 'player' | 'gk';
  assistPlayerName?: string;
}

interface PendingGoal {
  team: 'team1' | 'team2';
  teamIndex: number;
  playerIndex: number;
  scorerName: string;
  scorerType: 'player' | 'gk';
}

const Game = () => {
  const navigate = useNavigate();
  const { currentBaba, updateBaba, config: contextConfig, teams: contextTeams, loading: contextLoading, hydrated: contextHydrated, parsedPlayers: contextParsedPlayers, addGoalkeeperToState } = useBaba();
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  const whistleAudioRef = useRef<HTMLAudioElement | null>(null);
  const goalAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTeam1Index, setCurrentTeam1Index] = useState(0);
  const [currentTeam2Index, setCurrentTeam2Index] = useState(1);
  const [rotationQueue, setRotationQueue] = useState<number[]>([]);
  const [tiedPairs, setTiedPairs] = useState<TiedPair[]>([]);
  const [showTieBreaker, setShowTieBreaker] = useState(false);
  const [tieBreakerPair, setTieBreakerPair] = useState<TiedPair | null>(null);
  const [tieBreakerFromRemoval, setTieBreakerFromRemoval] = useState(false);
  const [waitingWinner, setWaitingWinner] = useState<number | null>(null);
  const [playerGoals, setPlayerGoals] = useState<Record<string, number>>({});
  const [goalHistory, setGoalHistory] = useState<{
    team1: GoalRecord[];
    team2: GoalRecord[];
  }>({
    team1: [],
    team2: []
  });
  const [showGoalModal, setShowGoalModal] = useState<'team1' | 'team2' | null>(null);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<PendingGoal | null>(null);
  const [celebratingTeam, setCelebratingTeam] = useState<'team1' | 'team2' | null>(null);
  
  // Estatísticas acumuladas do baba
  const [totalPlayerGoals, setTotalPlayerGoals] = useState<Record<string, number>>({});
  const [totalPlayerAssists, setTotalPlayerAssists] = useState<Record<string, number>>({});
  const [teamWins, setTeamWins] = useState<Record<number, number>>({});
  const [teamTies, setTeamTies] = useState<Record<number, number>>({});
  const [teamLosses, setTeamLosses] = useState<Record<number, number>>({});
  const [totalGames, setTotalGames] = useState(0);
  const [totalTies, setTotalTies] = useState(0);
  const [showPoints, setShowPoints] = useState(false);
  
  // Estados para cancelar empate manual e acréscimo
  const [wasManualTieEnd, setWasManualTieEnd] = useState(false);
  const [savedTimeOnManualEnd, setSavedTimeOnManualEnd] = useState<number | null>(null);
  const [addedStoppageTime, setAddedStoppageTime] = useState(0); // Em segundos agora
  const [hasReachedFinalMinute, setHasReachedFinalMinute] = useState(false);
  const [showStoppagePopover, setShowStoppagePopover] = useState(false);
  const [customStoppageInput, setCustomStoppageInput] = useState('');
  const [originalTimeElapsed, setOriginalTimeElapsed] = useState(0); // Tempo original decorrido (sem acréscimos)
  
  // Sistema de cartões - key: "teamIndex-playerIndex" para jogadores, "gk:nome_normalizado" para goleiros
  const [matchCards, setMatchCards] = useState<Record<string, { yellow: number; red: boolean }>>({});

  // ========== HELPER FUNCTIONS FOR GOALKEEPER IDENTITY ==========
  // Normalize goalkeeper name for consistent keys
  const normalizeGkName = useCallback((name: string): string => {
    return name.trim().toLowerCase();
  }, []);

  // Generate key for goalkeeper cards (by person, not by team slot)
  const gkCardKey = useCallback((name: string): string => {
    return `gk:${normalizeGkName(name)}`;
  }, [normalizeGkName]);

  // Generate key for goalkeeper goals in current match (by person)
  const gkGoalsKey = useCallback((name: string): string => {
    return `gk_goals:${normalizeGkName(name)}`;
  }, [normalizeGkName]);

  // Modal states for team management
  const [showAddPlayerModal, setShowAddPlayerModal] = useState<{ teamIndex: number; teamId: number } | null>(null);
  const [showGoalkeeperModal, setShowGoalkeeperModal] = useState<{ teamIndex: number; teamId: number } | null>(null);
  const [showReplacePlayerModal, setShowReplacePlayerModal] = useState<{ 
    teamIndex: number; 
    teamId: number; 
    playerIndex: number; 
    playerName: string 
  } | null>(null);

  // Track initialization per baba to prevent leaking state between babas
  const initializedBabaId = useRef<string | null>(null);
  const lastConfigRef = useRef<{ duration: number; playersPerTeam: number } | null>(null);

  // ========== REFS FOR ACCURATE SAVES ==========
  // These refs always contain the latest values, solving the stale closure problem
  const timeLeftRef = useRef(0);
  const team1ScoreRef = useRef(0);
  const team2ScoreRef = useRef(0);
  const currentTeam1IndexRef = useRef(0);
  const currentTeam2IndexRef = useRef(1);
  const rotationQueueRef = useRef<number[]>([]);
  const matchEndedRef = useRef(false);
  const totalGamesRef = useRef(0);
  const totalTiesRef = useRef(0);
  const totalPlayerGoalsRef = useRef<Record<string, number>>({});
  const totalPlayerAssistsRef = useRef<Record<string, number>>({});
  const teamWinsRef = useRef<Record<number, number>>({});
  const teamTiesRef = useRef<Record<number, number>>({});
  const teamLossesRef = useRef<Record<number, number>>({});
  const goalHistoryRef = useRef<{ team1: GoalRecord[]; team2: GoalRecord[] }>({ team1: [], team2: [] });
  
  // Refs for tie-breaker state persistence
  const tiedPairsRef = useRef<TiedPair[]>([]);
  const showTieBreakerRef = useRef(false);
  const tieBreakerPairRef = useRef<TiedPair | null>(null);
  const waitingWinnerRef = useRef<number | null>(null);
  
  // Ref for match cards persistence
  const matchCardsRef = useRef<Record<string, { yellow: number; red: boolean }>>({});
  
  // Debounce timer for save requests
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { team1ScoreRef.current = team1Score; }, [team1Score]);
  useEffect(() => { team2ScoreRef.current = team2Score; }, [team2Score]);
  useEffect(() => { currentTeam1IndexRef.current = currentTeam1Index; }, [currentTeam1Index]);
  useEffect(() => { currentTeam2IndexRef.current = currentTeam2Index; }, [currentTeam2Index]);
  useEffect(() => { rotationQueueRef.current = rotationQueue; }, [rotationQueue]);
  useEffect(() => { matchEndedRef.current = matchEnded; }, [matchEnded]);
  useEffect(() => { totalGamesRef.current = totalGames; }, [totalGames]);
  useEffect(() => { totalTiesRef.current = totalTies; }, [totalTies]);
  useEffect(() => { totalPlayerGoalsRef.current = totalPlayerGoals; }, [totalPlayerGoals]);
  useEffect(() => { totalPlayerAssistsRef.current = totalPlayerAssists; }, [totalPlayerAssists]);
  useEffect(() => { teamWinsRef.current = teamWins; }, [teamWins]);
  useEffect(() => { teamTiesRef.current = teamTies; }, [teamTies]);
  useEffect(() => { teamLossesRef.current = teamLosses; }, [teamLosses]);
  useEffect(() => { goalHistoryRef.current = goalHistory; }, [goalHistory]);
  useEffect(() => { tiedPairsRef.current = tiedPairs; }, [tiedPairs]);
  useEffect(() => { showTieBreakerRef.current = showTieBreaker; }, [showTieBreaker]);
  useEffect(() => { tieBreakerPairRef.current = tieBreakerPair; }, [tieBreakerPair]);
  useEffect(() => { waitingWinnerRef.current = waitingWinner; }, [waitingWinner]);
  useEffect(() => { matchCardsRef.current = matchCards; }, [matchCards]);

  // Team management hook needs access to the *real* requestSave.
  // We wire it via a ref to avoid hook-order refactors.
  const requestSaveRef = useRef<(immediate?: boolean) => void>(() => {});

  // Team management hook
  const teamManagement = useTeamManagement(
    allTeams,
    setAllTeams,
    currentBaba?.id || null,
    contextParsedPlayers,
    (immediate?: boolean) => requestSaveRef.current(immediate)
  );

  // Refs for team management state persistence
  const removedTeamsRef = useRef<{ teamIndex: number; removalType: 'temporary' | 'permanent' }[]>([]);
  const availableGoalkeepersRef = useRef<{ name: string; originalTeamIndex: number; playerId?: string }[]>([]);
  const currentGoalkeepersRef = useRef<Record<number, string>>({});

  useEffect(() => { removedTeamsRef.current = teamManagement.removedTeams; }, [teamManagement.removedTeams]);
  useEffect(() => { availableGoalkeepersRef.current = teamManagement.availableGoalkeepers; }, [teamManagement.availableGoalkeepers]);
  useEffect(() => { currentGoalkeepersRef.current = teamManagement.currentGoalkeepers; }, [teamManagement.currentGoalkeepers]);

  // Initialize from BabaContext (database) - NO REDIRECTS
  useEffect(() => {
    // Wait for context to finish loading
    if (contextLoading) return;

    // If no currentBaba at all after loading, just show UI prompts (no redirect)
    if (!currentBaba) return;

    // If config or teams are missing, just show UI prompts (no redirect)
    if (!contextConfig || contextTeams.length < 2) return;

    const babaChanged = currentBaba.id !== initializedBabaId.current;
    
    // Check if config changed (for reflecting updates without refresh)
    const configChanged = lastConfigRef.current && (
      lastConfigRef.current.duration !== contextConfig.gameDuration ||
      lastConfigRef.current.playersPerTeam !== contextConfig.playersPerTeam
    );

    // Update config tracking
    lastConfigRef.current = {
      duration: contextConfig.gameDuration,
      playersPerTeam: contextConfig.playersPerTeam
    };

    // Only skip if same baba and config hasn't changed
    if (!babaChanged && !configChanged && initializedBabaId.current) return;

    // Reset local state when switching babas
    if (babaChanged) {
      setPlayerGoals({});
      setGoalHistory({ team1: [], team2: [] });
      setTiedPairs([]);
      setShowTieBreaker(false);
      setTieBreakerPair(null);
      setWaitingWinner(null);
      setMatchCards({}); // Reset cards on baba change
    }

    setConfig(contextConfig);
    
    // Convert context teams to Game format - PRESERVE player.id and metadata
    const loadedTeams: Team[] = contextTeams.map(t => ({
      id: t.teamNumber,
      players: t.players.map(p => ({
        id: p.id,
        name: p.name,
        isGoalkeeper: p.isGoalkeeper,
        originalTeam: p.originalTeam,
        isBorrowed: p.isBorrowed,
        isSeed: p.isSeed,
        seedLevel: p.seedLevel,
      })),
      goalkeeper: t.goalkeeper ? {
        id: t.goalkeeper.id,
        name: t.goalkeeper.name,
        isGoalkeeper: true,
        originalTeam: t.goalkeeper.originalTeam,
        isBorrowed: t.goalkeeper.isBorrowed,
        isSeed: t.goalkeeper.isSeed,
        seedLevel: t.goalkeeper.seedLevel,
      } : null,
      isComplete: t.isComplete,
      score: 0
    }));
    
    setAllTeams(loadedTeams);

    // Restore state from database
    const newTimeLeft = configChanged 
      ? contextConfig.gameDuration * 60 
      : (currentBaba.timeLeft ?? contextConfig.gameDuration * 60);
    
    setTimeLeft(newTimeLeft);
    setTeam1Score(currentBaba.team1Score);
    setTeam2Score(currentBaba.team2Score);
    setCurrentTeam1Index(currentBaba.currentTeam1Index);
    setCurrentTeam2Index(currentBaba.currentTeam2Index);
    setMatchEnded(currentBaba.matchEnded);
    setIsRunning(false); // Always start paused on reload
    
    // Restore statistics from database
    setTotalGames(currentBaba.totalGames ?? 0);
    setTotalTies(currentBaba.totalTies ?? 0);
    setTotalPlayerGoals(currentBaba.playerGoals ?? {});
    setTotalPlayerAssists(currentBaba.playerAssists ?? {});
    setTeamWins(currentBaba.teamWins ?? {});
    setTeamLosses(currentBaba.teamLosses ?? {});
    setTeamTies(currentBaba.teamTies ?? {});

    // Restore goal history from database if available
    if (currentBaba.goalHistory) {
      setGoalHistory(currentBaba.goalHistory as { team1: GoalRecord[]; team2: GoalRecord[] });
      
      // Rebuild playerGoals from goal history
      const restoredPlayerGoals: Record<string, number> = {};
      const history = currentBaba.goalHistory as { team1: GoalRecord[]; team2: GoalRecord[] };
      [...history.team1, ...history.team2].forEach(goal => {
        const key = `${goal.teamIndex}-${goal.playerIndex}`;
        restoredPlayerGoals[key] = (restoredPlayerGoals[key] || 0) + 1;
      });
      setPlayerGoals(restoredPlayerGoals);
    }

    // Restore tie-breaker state from database
    if (currentBaba.tiedPairs && Array.isArray(currentBaba.tiedPairs)) {
      setTiedPairs(currentBaba.tiedPairs as TiedPair[]);
    }
    if (currentBaba.showTieBreaker !== undefined) {
      setShowTieBreaker(currentBaba.showTieBreaker);
    }
    if (currentBaba.tieBreakerPair) {
      setTieBreakerPair(currentBaba.tieBreakerPair as TiedPair);
    }
    if (currentBaba.waitingWinner !== undefined && currentBaba.waitingWinner !== null) {
      setWaitingWinner(currentBaba.waitingWinner);
    }

    // Initialize rotation queue: use from DB if valid, otherwise create fresh
    const dbQueue = currentBaba.rotationQueue;
    if (dbQueue && dbQueue.length > 0) {
      setRotationQueue(dbQueue);
    } else if (loadedTeams.length > 2) {
      const initialQueue: number[] = [];
      for (let i = 2; i < loadedTeams.length; i++) {
        initialQueue.push(i);
      }
      setRotationQueue(initialQueue);
    }

    // Restore match cards from database if available
    if ((currentBaba as any).matchCards) {
      setMatchCards((currentBaba as any).matchCards);
    } else {
      setMatchCards({});
    }

    // Restore team management state from database
    const removedTeamsData = (currentBaba as any).removedTeams;
    const availableGoalkeepersData = (currentBaba as any).availableGoalkeepers;
    const currentGoalkeepersData = (currentBaba as any).currentGoalkeepers;
    
    if (removedTeamsData || availableGoalkeepersData || currentGoalkeepersData) {
      teamManagement.initializeFromBaba({
        removedTeams: removedTeamsData ?? [],
        availableGoalkeepers: availableGoalkeepersData ?? [],
        currentGoalkeepers: currentGoalkeepersData ?? {},
      });
    }

    initializedBabaId.current = currentBaba.id;
  }, [contextConfig, currentBaba, contextTeams, contextLoading]);

  // Sanitize rotation state after initialization to ensure consistency
  useEffect(() => {
    // Only run sanitization after proper initialization
    if (!initializedBabaId.current || allTeams.length < 2) return;
    
    // Debounce sanitization to avoid running during rapid state changes
    const timer = setTimeout(() => {
      const activeIndices = allTeams
        .map((_, i) => i)
        .filter(i => !teamManagement.removedTeams.some(rt => rt.teamIndex === i));
      
      if (activeIndices.length < 2) return;

      // Check if current teams are valid
      const team1Valid = activeIndices.includes(currentTeam1Index);
      const team2Valid = activeIndices.includes(currentTeam2Index);
      const teamsDifferent = currentTeam1Index !== currentTeam2Index;

      if (!team1Valid || !team2Valid || !teamsDifferent) {
        console.warn('[Sanitize] Invalid team state detected, fixing...');
        // Fix by selecting first two active teams
        if (activeIndices.length >= 2) {
          setCurrentTeam1Index(activeIndices[0]);
          setCurrentTeam2Index(activeIndices[1]);
          setRotationQueue(prev => {
            const newQueue = activeIndices.slice(2).filter(i => !prev.includes(i));
            return [...new Set([...prev.filter(i => activeIndices.includes(i)), ...newQueue])];
          });
        }
      }

      // Prune invalid tiedPairs
      setTiedPairs(prev => prev.filter(p => 
        activeIndices.includes(p.team1Index) && activeIndices.includes(p.team2Index)
      ));

      // Clear invalid waitingWinner
      if (waitingWinner !== null && !activeIndices.includes(waitingWinner)) {
        setWaitingWinner(null);
      }

      // Clear invalid tieBreakerPair
      if (tieBreakerPair && 
          (!activeIndices.includes(tieBreakerPair.team1Index) || 
           !activeIndices.includes(tieBreakerPair.team2Index))) {
        setTieBreakerPair(null);
        setShowTieBreaker(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [allTeams, teamManagement.removedTeams, currentTeam1Index, currentTeam2Index, 
      waitingWinner, tieBreakerPair]);

  // Save state to database - reads from REFS for accurate values
  const saveToDatabase = useCallback(async () => {
    if (!currentBaba || !config) return;
    if (isSavingRef.current) return; // Prevent concurrent saves
    
    isSavingRef.current = true;
    try {
      await updateBaba({
        timeLeft: timeLeftRef.current,
        team1Score: team1ScoreRef.current,
        team2Score: team2ScoreRef.current,
        currentTeam1Index: currentTeam1IndexRef.current,
        currentTeam2Index: currentTeam2IndexRef.current,
        rotationQueue: rotationQueueRef.current,
        matchEnded: matchEndedRef.current,
        isRunning: false,
        totalGames: totalGamesRef.current,
        totalTies: totalTiesRef.current,
        playerGoals: totalPlayerGoalsRef.current,
        playerAssists: totalPlayerAssistsRef.current,
        teamWins: teamWinsRef.current,
        teamTies: teamTiesRef.current,
        teamLosses: teamLossesRef.current,
        goalHistory: goalHistoryRef.current,
        tiedPairs: tiedPairsRef.current,
        showTieBreaker: showTieBreakerRef.current,
        tieBreakerPair: tieBreakerPairRef.current,
        waitingWinner: waitingWinnerRef.current,
        matchCards: matchCardsRef.current as any,
        removedTeams: removedTeamsRef.current as any,
        availableGoalkeepers: availableGoalkeepersRef.current as any,
        currentGoalkeepers: currentGoalkeepersRef.current as any,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [currentBaba, config, updateBaba]);

  // Debounced save request - prevents spam while ensuring latest values are saved
  const requestSave = useCallback((immediate = false) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (immediate) {
      saveToDatabase();
    } else {
      // Debounce by 300ms to batch rapid changes (e.g., multiple goals)
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase();
        saveTimeoutRef.current = null;
      }, 300);
    }
  }, [saveToDatabase]);

  // Make the latest requestSave available to hooks created earlier.
  useEffect(() => {
    requestSaveRef.current = requestSave;
  }, [requestSave]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save on visibility change (tab hidden/minimize) and pagehide (mobile)
  // CRITICAL: Flush any pending debounced saves before saving
  useEffect(() => {
    if (!currentBaba || !config) return;
    
    const flushAndSave = () => {
      // Cancel any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Save immediately with latest ref values
      saveToDatabase();
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushAndSave();
      }
    };
    
    const handlePageHide = () => {
      flushAndSave();
    };

    const handleBeforeUnload = () => {
      flushAndSave();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentBaba, config, saveToDatabase]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            handleTimeEnd();
            return 0;
          }
          return prev - 1;
        });
        
        // Incrementar tempo original decorrido (só conta até o tempo original configurado)
        setOriginalTimeElapsed(prev => {
          const originalDuration = config ? config.gameDuration * 60 : 0;
          if (prev < originalDuration) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, config]);

  // Marcar quando atingir o minuto final do tempo ORIGINAL (para manter botão de acréscimo visível)
  useEffect(() => {
    if (!config) return;
    const originalDuration = config.gameDuration * 60;
    // Atingiu minuto final quando falta 60 segundos ou menos do tempo original pré-configurado
    if (originalTimeElapsed >= (originalDuration - 60) && !hasReachedFinalMinute) {
      setHasReachedFinalMinute(true);
    }
  }, [originalTimeElapsed, hasReachedFinalMinute, config]);

  const handleTimeEnd = () => {
    if (whistleAudioRef.current) {
      whistleAudioRef.current.currentTime = 0;
      whistleAudioRef.current.play().catch(console.error);
    }
    setMatchEnded(true);
    if (team1Score > team2Score) {
      toast.success(`Time ${allTeams[currentTeam1Index].id} venceu!`);
      triggerConfetti();
    } else if (team2Score > team1Score) {
      toast.success(`Time ${allTeams[currentTeam2Index].id} venceu!`);
      triggerConfetti();
    } else {
      const activeTeamsCount = getActiveTeamIndices().length;
      if (activeTeamsCount === 2) {
        toast.info(`Empate!`);
      } else if (activeTeamsCount === 3) {
        toast.info(`Empate! Sorteio para definir quem joga com o próximo time.`);
      } else {
        toast.info(`Empate! Times ${allTeams[currentTeam1Index].id} e ${allTeams[currentTeam2Index].id} saem.`);
      }
    }
    // Immediate save on match end
    saveToDatabase();
  };

  const handleStartPause = () => {
    if (matchEnded) return;
    const newRunning = !isRunning;
    setIsRunning(newRunning);
    // Mark that the timer has been started at least once
    if (newRunning && !hasStartedOnce) {
      setHasStartedOnce(true);
    }
    // Save when pausing
    if (!newRunning) {
      saveToDatabase();
    }
  };

  const handleReset = () => {
    if (!config) return;
    setTimeLeft(config.gameDuration * 60);
    setIsRunning(false);
    setHasStartedOnce(false);
    setTeam1Score(0);
    setTeam2Score(0);
    setMatchEnded(false);
    setShowTieBreaker(false);
    setTieBreakerPair(null);
    setPlayerGoals({});
    setGoalHistory({
      team1: [],
      team2: []
    });
    // Save after reset - refs will be updated via useEffect
    requestSave();
  };

  const handleGoal = (team: 'team1' | 'team2', increment: boolean) => {
    // Permitir gols mesmo após matchEnded para registrar gols tardios (último segundo)
    
    if (increment) {
      setShowGoalModal(team);
    } else {
      const history = goalHistory[team];
      if (history.length > 0) {
        const lastGoal = history[history.length - 1];
        
        // Use name-based key for goalkeeper goals, slot-based for players
        const playerGoalsKey = lastGoal.scorerType === 'gk' 
          ? gkGoalsKey(lastGoal.scorerName)
          : `${lastGoal.teamIndex}-${lastGoal.playerIndex}`;
        
        setPlayerGoals(prev => ({
          ...prev,
          [playerGoalsKey]: Math.max(0, (prev[playerGoalsKey] || 0) - 1)
        }));
        
        // Update total player goals using display name (with GK prefix for goalkeepers)
        const displayName = lastGoal.scorerType === 'gk' 
          ? `GK ${lastGoal.scorerName}` 
          : lastGoal.scorerName;
        if (displayName) {
          setTotalPlayerGoals(prev => ({
            ...prev,
            [displayName]: Math.max(0, (prev[displayName] || 0) - 1)
          }));
        }
        
        setGoalHistory(prev => ({
          ...prev,
          [team]: prev[team].slice(0, -1)
        }));
        
        const newScore1 = team === 'team1' ? Math.max(0, team1Score - 1) : team1Score;
        const newScore2 = team === 'team2' ? Math.max(0, team2Score - 1) : team2Score;
        
        if (team === 'team1') {
          setTeam1Score(newScore1);
        } else {
          setTeam2Score(newScore2);
        }
        
        if (matchEnded && config) {
          const criteria = config.winCriteria;
          let goalLimit = 0;
          if (criteria === '2goals' || criteria === 'time-or-2') goalLimit = 2;
          else if (criteria === '3goals' || criteria === 'time-or-3') goalLimit = 3;
          else if (criteria.startsWith('custom-')) {
            const parsed = parseInt(criteria.replace('custom-', ''), 10);
            if (!isNaN(parsed)) goalLimit = parsed;
          } else if (criteria.startsWith('time-or-custom-')) {
            const parsed = parseInt(criteria.replace('time-or-custom-', ''), 10);
            if (!isNaN(parsed)) goalLimit = parsed;
          }
          
          if (goalLimit > 0 && newScore1 < goalLimit && newScore2 < goalLimit) {
            setMatchEnded(false);
          }
        }
        
        // Save after decrement - refs will be updated via useEffect
        requestSave();
      }
    }
  };

  // Step 1: Select goal scorer - opens assist modal
  const handlePlayerGoalStep1 = (teamIndex: number, playerIndex: number, scorerName: string, scorerType: 'player' | 'gk') => {
    // Permitir gols mesmo após matchEnded para registrar gols tardios (último segundo)

    // Jogador expulso não pode marcar gol
    if (scorerType === 'player') {
      const cards = matchCards[`${teamIndex}-${playerIndex}`];
      if (cards?.red) return;
    }
    
    // Goleiro expulso não pode marcar gol
    if (scorerType === 'gk') {
      if (isGoalkeeperExpelled(scorerName)) return;
    }

    const teamKey = teamIndex === currentTeam1Index ? 'team1' : 'team2';
    
    // Store pending goal and open assist modal
    setPendingGoal({
      team: teamKey,
      teamIndex,
      playerIndex,
      scorerName,
      scorerType
    });
    setShowGoalModal(null);
    setShowAssistModal(true);
  };

  // Step 2: Select assist player (or individual play)
  const handleAssistSelection = (assistPlayerName: string | null) => {
    if (!pendingGoal) return;

    const { teamIndex, playerIndex, scorerName, scorerType, team: teamKey } = pendingGoal;

    // Tocar som de gol
    if (goalAudioRef.current) {
      goalAudioRef.current.currentTime = 0;
      goalAudioRef.current.play().catch(console.error);
    }

    // Ativar animação de celebração no card (9 segundos = 6 repetições de 1.5s)
    setCelebratingTeam(teamKey);
    setTimeout(() => {
      setCelebratingTeam(null);
    }, 9000);

    // Use name-based key for goalkeeper goals, slot-based for players
    const playerGoalsKey = scorerType === 'gk' 
      ? gkGoalsKey(scorerName)
      : `${teamIndex}-${playerIndex}`;
    
    setPlayerGoals(prev => ({
      ...prev,
      [playerGoalsKey]: (prev[playerGoalsKey] || 0) + 1
    }));
    
    // Update total player goals using scorer name (with GK prefix for goalkeepers)
    const displayName = scorerType === 'gk' ? `GK ${scorerName}` : scorerName;
    setTotalPlayerGoals(prev => ({
      ...prev,
      [displayName]: (prev[displayName] || 0) + 1
    }));

    // Update assists if there was an assist
    if (assistPlayerName) {
      setTotalPlayerAssists(prev => ({
        ...prev,
        [assistPlayerName]: (prev[assistPlayerName] || 0) + 1
      }));
    }
    
    const goalRecord: GoalRecord = {
      teamIndex,
      playerIndex,
      scorerName,
      scorerType,
      assistPlayerName: assistPlayerName || undefined
    };
    
    setGoalHistory(prev => ({
      ...prev,
      [teamKey]: [...prev[teamKey], goalRecord]
    }));
    
    if (teamIndex === currentTeam1Index) {
      const newScore = team1Score + 1;
      setTeam1Score(newScore);
      checkGoalWin(newScore, team2Score);
      // Recalcular resultado se partida já encerrou (gol tardio)
      recalculateMatchResult(newScore, team2Score);
    } else {
      const newScore = team2Score + 1;
      setTeam2Score(newScore);
      checkGoalWin(team1Score, newScore);
      // Recalcular resultado se partida já encerrou (gol tardio)
      recalculateMatchResult(team1Score, newScore);
    }
    
    // Clear modals and pending goal
    setShowAssistModal(false);
    setPendingGoal(null);
    
    // Save after goal - refs will be updated via useEffect
    requestSave();
  };

  const checkGoalWin = (score1: number, score2: number) => {
    if (!config) return;
    const criteria = config.winCriteria;
    let goalLimit = 0;
    
    if (criteria === '2goals' || criteria === 'time-or-2') goalLimit = 2;
    else if (criteria === '3goals' || criteria === 'time-or-3') goalLimit = 3;
    else if (criteria.startsWith('custom-')) {
      const parsed = parseInt(criteria.replace('custom-', ''), 10);
      if (!isNaN(parsed)) goalLimit = parsed;
    } else if (criteria.startsWith('time-or-custom-')) {
      const parsed = parseInt(criteria.replace('time-or-custom-', ''), 10);
      if (!isNaN(parsed)) goalLimit = parsed;
    }
    
    if (goalLimit > 0 && (score1 >= goalLimit || score2 >= goalLimit)) {
      setIsRunning(false);
      setMatchEnded(true);
      const winner = score1 >= goalLimit ? allTeams[currentTeam1Index] : allTeams[currentTeam2Index];
      toast.success(`Time ${winner.id} venceu por gols!`);
      triggerConfetti();
      // Immediate save
      saveToDatabase();
    }
  };

  // Recalcula o resultado da partida quando um gol tardio é marcado após o encerramento
  const recalculateMatchResult = (newScore1: number, newScore2: number) => {
    // Só recalcula se a partida já encerrou (gol tardio)
    if (!matchEnded) return;
    
    if (newScore1 > newScore2) {
      toast.success(`Time ${allTeams[currentTeam1Index].id} venceu!`, { id: 'match-result-update' });
      triggerConfetti();
    } else if (newScore2 > newScore1) {
      toast.success(`Time ${allTeams[currentTeam2Index].id} venceu!`, { id: 'match-result-update' });
      triggerConfetti();
    } else {
      const activeTeamsCount = getActiveTeamIndices().length;
      if (activeTeamsCount === 2) {
        toast.info(`Empate!`, { id: 'match-result-update' });
      } else if (activeTeamsCount === 3) {
        toast.info(`Empate! Sorteio para definir quem joga com o próximo time.`, { id: 'match-result-update' });
      } else {
        toast.info(`Empate! Times ${allTeams[currentTeam1Index].id} e ${allTeams[currentTeam2Index].id} saem.`, { id: 'match-result-update' });
      }
    }
  };

  const findTiedPair = (idx1: number, idx2: number): TiedPair | null => {
    return tiedPairs.find(pair => pair.team1Index === idx1 && pair.team2Index === idx2 || pair.team1Index === idx2 && pair.team2Index === idx1) || null;
  };

  const removeTiedPair = (pair: TiedPair) => {
    setTiedPairs(prev => prev.filter(p => !(p.team1Index === pair.team1Index && p.team2Index === pair.team2Index || p.team1Index === pair.team2Index && p.team2Index === pair.team1Index)));
  };

  // ========== ACTIVE TEAMS HELPERS ==========
  // Helper to check if a team is removed from rotation
  const isTeamRemovedFromRotation = (teamIndex: number): boolean => {
    return teamManagement.removedTeams.some(rt => rt.teamIndex === teamIndex);
  };

  // Get indices of all active teams (not removed)
  const getActiveTeamIndices = (): number[] => {
    return allTeams.map((_, i) => i).filter(i => !isTeamRemovedFromRotation(i));
  };

  // Get count of active teams
  const getActiveTeamsCount = (): number => {
    return getActiveTeamIndices().length;
  };

  // Normalize queue: remove removed teams, duplicates, and invalid indices
  const normalizeQueue = useCallback((queue: number[]): number[] => {
    const activeIndices = new Set(getActiveTeamIndices());
    const seen = new Set<number>();
    return queue.filter(idx => {
      if (!activeIndices.has(idx)) return false;
      if (seen.has(idx)) return false;
      seen.add(idx);
      return true;
    });
  }, [teamManagement.removedTeams, allTeams]);

  // Normalize queue EXCLUDING current teams (for rotation logic)
  const normalizeQueueExcludingCurrent = useCallback((
    queue: number[], 
    team1: number, 
    team2: number
  ): number[] => {
    const activeIndices = new Set(getActiveTeamIndices());
    const currentTeams = new Set([team1, team2]);
    const seen = new Set<number>();
    return queue.filter(idx => {
      if (!activeIndices.has(idx)) return false;
      if (currentTeams.has(idx)) return false; // EXCLUI TIMES ATUAIS
      if (seen.has(idx)) return false;
      seen.add(idx);
      return true;
    });
  }, [teamManagement.removedTeams, allTeams]);

  // Prune tiedPairs: remove pairs with invalid or removed teams
  const pruneTiedPairs = useCallback((pairs: TiedPair[], activeIndices: number[]): TiedPair[] => {
    const activeSet = new Set(activeIndices);
    return pairs.filter(p => activeSet.has(p.team1Index) && activeSet.has(p.team2Index));
  }, []);

  // Sanitize rotation state: ensure consistency after loading or critical changes
  const sanitizeRotationState = useCallback(() => {
    const activeIndices = getActiveTeamIndices();
    if (activeIndices.length < 2) return; // Not enough teams to play

    // 1. Prune invalid tiedPairs
    const validTiedPairs = pruneTiedPairs(tiedPairs, activeIndices);
    if (validTiedPairs.length !== tiedPairs.length) {
      setTiedPairs(validTiedPairs);
    }

    // 2. Normalize rotation queue
    const normalizedQueue = normalizeQueue(rotationQueue);
    
    // 3. Validate current teams are active and different
    const team1Active = activeIndices.includes(currentTeam1Index);
    const team2Active = activeIndices.includes(currentTeam2Index);
    const teamsDifferent = currentTeam1Index !== currentTeam2Index;

    if (!team1Active || !team2Active || !teamsDifferent) {
      // Need to fix current teams
      const [first, second, ...rest] = activeIndices.filter(i => !normalizedQueue.includes(i));
      
      if (first !== undefined && second !== undefined) {
        setCurrentTeam1Index(first);
        setCurrentTeam2Index(second);
        setRotationQueue(normalizeQueue([...normalizedQueue, ...rest]));
      } else if (activeIndices.length >= 2) {
        // Fallback: just use first two active indices
        setCurrentTeam1Index(activeIndices[0]);
        setCurrentTeam2Index(activeIndices[1]);
        setRotationQueue(normalizeQueue(activeIndices.slice(2)));
      }
    } else if (normalizedQueue.length !== rotationQueue.length) {
      setRotationQueue(normalizedQueue);
    }

    // 4. Clear waitingWinner if it's not active
    if (waitingWinner !== null && !activeIndices.includes(waitingWinner)) {
      setWaitingWinner(null);
    }

    // 5. Clear tieBreakerPair if teams are not active
    if (tieBreakerPair) {
      if (!activeIndices.includes(tieBreakerPair.team1Index) || 
          !activeIndices.includes(tieBreakerPair.team2Index)) {
        setTieBreakerPair(null);
        setShowTieBreaker(false);
      }
    }
  }, [getActiveTeamIndices, pruneTiedPairs, normalizeQueue, tiedPairs, rotationQueue, 
      currentTeam1Index, currentTeam2Index, waitingWinner, tieBreakerPair]);

  // ========== CARD SYSTEM FUNCTIONS ==========
  
  // Give yellow card to a player or goalkeeper
  const giveYellowCard = useCallback((teamIndex: number, playerKey: string, playerName: string, isGoalkeeper: boolean = false) => {
    setMatchCards(prev => {
      // For goalkeepers, use name-based key; for players, use team-slot key
      const key = isGoalkeeper ? gkCardKey(playerName) : `${teamIndex}-${playerKey}`;
      const current = prev[key] || { yellow: 0, red: false };
      const newYellow = current.yellow + 1;
      const newRed = newYellow >= 2; // 2 amarelos = vermelho
      
      const displayName = isGoalkeeper ? `GK ${playerName}` : playerName;
      
      if (newRed) {
        toast.error(`${displayName} recebeu o segundo amarelo e foi expulso`, { icon: '🟥' });
      } else {
        toast.warning(`${displayName} recebeu cartão amarelo`, { icon: '🟨' });
      }
      
      return {
        ...prev,
        [key]: { yellow: newYellow, red: newRed }
      };
    });
    requestSave();
  }, [requestSave, gkCardKey]);

  // Give red card directly to a player or goalkeeper
  const giveRedCard = useCallback((teamIndex: number, playerKey: string, playerName: string, isGoalkeeper: boolean = false) => {
    const key = isGoalkeeper ? gkCardKey(playerName) : `${teamIndex}-${playerKey}`;
    setMatchCards(prev => {
      return {
        ...prev,
        [key]: { yellow: prev[key]?.yellow || 0, red: true }
      };
    });
    const displayName = isGoalkeeper ? `GK ${playerName}` : playerName;
    toast.error(`${displayName} recebeu vermelho direto e foi expulso`, { icon: '🟥' });
    requestSave();
  }, [requestSave, gkCardKey]);

  // Check if player is expelled (for line players)
  const isPlayerExpelled = useCallback((teamIndex: number, playerKey: string): boolean => {
    const key = `${teamIndex}-${playerKey}`;
    const cards = matchCards[key];
    return cards?.red || false;
  }, [matchCards]);

  // Check if goalkeeper is expelled (by name)
  const isGoalkeeperExpelled = useCallback((gkName: string): boolean => {
    if (!gkName) return false;
    const key = gkCardKey(gkName);
    const cards = matchCards[key];
    return cards?.red || false;
  }, [matchCards, gkCardKey]);

  // Get player cards (for line players)
  const getPlayerCards = useCallback((teamIndex: number, playerKey: string) => {
    const key = `${teamIndex}-${playerKey}`;
    return matchCards[key] || { yellow: 0, red: false };
  }, [matchCards]);

  // Get goalkeeper cards (by name)
  const getGoalkeeperCards = useCallback((gkName: string, teamIndex?: number) => {
    if (!gkName) return { yellow: 0, red: false };
    const key = gkCardKey(gkName);
    const cards = matchCards[key];
    if (cards) return cards;
    // Fallback to legacy key format for existing saved games
    if (teamIndex !== undefined) {
      const legacyKey = `${teamIndex}-GK`;
      return matchCards[legacyKey] || { yellow: 0, red: false };
    }
    return { yellow: 0, red: false };
  }, [matchCards, gkCardKey]);

  // Remove yellow card (for line players or goalkeepers)
  const removeYellowCard = useCallback((teamIndex: number, playerKey: string, isGoalkeeper: boolean = false, gkName?: string) => {
    setMatchCards(prev => {
      const key = isGoalkeeper && gkName ? gkCardKey(gkName) : `${teamIndex}-${playerKey}`;
      const current = prev[key];
      if (!current || current.yellow === 0) return prev;
      
      const newYellow = current.yellow - 1;
      // Se tinha vermelho por causa dos 2 amarelos, remove o vermelho também
      const wasRedFromYellows = current.yellow >= 2 && current.red;
      const newRed = newYellow >= 2 ? current.red : (wasRedFromYellows ? false : current.red);
      
      toast.info('Cartão amarelo removido', { icon: '↩️' });
      
      if (newYellow === 0 && !newRed) {
        // Remove a entrada completamente
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [key]: { yellow: newYellow, red: newRed }
      };
    });
    requestSave();
  }, [requestSave, gkCardKey]);

  // Remove red card (for line players or goalkeepers)
  const removeRedCard = useCallback((teamIndex: number, playerKey: string, isGoalkeeper: boolean = false, gkName?: string) => {
    setMatchCards(prev => {
      const key = isGoalkeeper && gkName ? gkCardKey(gkName) : `${teamIndex}-${playerKey}`;
      const current = prev[key];
      if (!current || !current.red) return prev;
      
      // Se era vermelho direto (0 amarelos), remove apenas o vermelho
      if (current.yellow === 0) {
        toast.info('Cartão vermelho removido', { icon: '↩️' });
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      
      // Se tinha 2 amarelos que causaram o vermelho:
      // - Remove o vermelho
      // - Remove 1 amarelo (fica com 1 amarelo)
      const newYellow = current.yellow - 1;
      toast.info('Cartão vermelho e 1 amarelo removidos', { icon: '↩️' });
      
      // Se sobrou 0 amarelos, remove completamente
      if (newYellow === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [key]: { yellow: newYellow, red: false }
      };
    });
    requestSave();
  }, [requestSave, gkCardKey]);

  const triggerConfetti = useCallback(() => {
    const colors = ['#21C45D', '#22c55e', '#4ade80', '#86efac'];
    
    // First burst from left
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors: colors,
      zIndex: 9999
    });
    
    // First burst from right
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors: colors,
      zIndex: 9999
    });
    
    // Second wave after 150ms
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: colors,
        zIndex: 9999
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: colors,
        zIndex: 9999
      });
    }, 150);
    
    // Third wave after 300ms
    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { x: 0.5, y: 0.6 },
        colors: colors,
        zIndex: 9999
      });
    }, 300);
  }, []);

  const handleEndMatch = () => {
    setIsRunning(false);
    setMatchEnded(true);
    
    const isTie = team1Score === team2Score;
    
    // Se for empate E ainda tinha tempo, marcar como encerramento manual
    if (isTie && timeLeft > 0) {
      setWasManualTieEnd(true);
      setSavedTimeOnManualEnd(timeLeft);
    } else {
      setWasManualTieEnd(false);
      setSavedTimeOnManualEnd(null);
    }
    
    if (team1Score > team2Score) {
      toast.success(`Time ${allTeams[currentTeam1Index].id} venceu!`);
      triggerConfetti();
    } else if (team2Score > team1Score) {
      toast.success(`Time ${allTeams[currentTeam2Index].id} venceu!`);
      triggerConfetti();
    } else {
      const activeTeamsCount = getActiveTeamIndices().length;
      if (activeTeamsCount === 2) {
        toast.info(`Empate!`);
      } else if (activeTeamsCount === 3) {
        toast.info(`Empate! Sorteio para definir quem joga com o próximo time.`);
      } else {
        toast.info(`Empate! Times ${allTeams[currentTeam1Index].id} e ${allTeams[currentTeam2Index].id} saem.`);
      }
    }
    // Immediate save
    saveToDatabase();
  };

  const handleCancelTie = () => {
    // Restaurar estado da partida para continuar
    setMatchEnded(false);
    
    // Restaurar o tempo que tinha quando encerrou manualmente
    if (savedTimeOnManualEnd !== null) {
      setTimeLeft(savedTimeOnManualEnd);
    }
    
    // Limpar estados de empate manual
    setWasManualTieEnd(false);
    setSavedTimeOnManualEnd(null);
    
    toast.info('Empate cancelado. Partida continua de onde parou.');
  };

  // Verifica se algum time atingiu o limite de gols para vitória
  const hasWonByGoals = () => {
    if (!config) return false;
    const criteria = config.winCriteria;
    let goalLimit = 0;
    
    if (criteria === '2goals' || criteria === 'time-or-2') goalLimit = 2;
    else if (criteria === '3goals' || criteria === 'time-or-3') goalLimit = 3;
    else if (criteria.startsWith('custom-')) {
      const parsed = parseInt(criteria.replace('custom-', ''), 10);
      if (!isNaN(parsed)) goalLimit = parsed;
    } else if (criteria.startsWith('time-or-custom-')) {
      const parsed = parseInt(criteria.replace('time-or-custom-', ''), 10);
      if (!isNaN(parsed)) goalLimit = parsed;
    }
    
    return goalLimit > 0 && (team1Score >= goalLimit || team2Score >= goalLimit);
  };

  const handleAddStoppageTime = (seconds: number) => {
    // Se a partida terminou por tempo (não por gols), reabrir a partida
    if (matchEnded) {
      // Só permite acréscimo se NÃO foi vitória por gols
      if (hasWonByGoals()) {
        toast.error('Não é possível dar acréscimo após vitória por gols.');
        return;
      }
      
      // Reabrir a partida
      setMatchEnded(false);
      setWasManualTieEnd(false);
      setSavedTimeOnManualEnd(null);
    }
    
    setTimeLeft(prev => prev + seconds);
    setAddedStoppageTime(prev => prev + seconds);
    setShowStoppagePopover(false);
    
    // Formatar mensagem
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = mins > 0 
      ? (secs > 0 ? `${mins}min ${secs}s` : `${mins}min`)
      : `${secs}s`;
    toast.success(`+${timeStr} de acréscimo!`);
  };

  // Formatar acréscimo total para exibição
  const formatStoppageTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0 && secs > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    if (mins > 0) return `${mins}min`;
    return `${secs}s`;
  };

  const resetForNextMatch = () => {
    if (!config) return;
    setTimeLeft(config.gameDuration * 60);
    setTeam1Score(0);
    setTeam2Score(0);
    setIsRunning(false);
    setMatchEnded(false);
    setPlayerGoals({});
    setGoalHistory({
      team1: [],
      team2: []
    });
    setMatchCards({}); // Reset cards for next match
    
    // Limpar estados de empate manual e acréscimo
    setWasManualTieEnd(false);
    setSavedTimeOnManualEnd(null);
    setAddedStoppageTime(0);
    setHasReachedFinalMinute(false);
    setOriginalTimeElapsed(0); // Reset tempo original decorrido
  };

  const handleNextMatch = () => {
    if (!config) return;
    const isTie = team1Score === team2Score;
    
    // USE ACTIVE TEAMS COUNT instead of allTeams.length
    const activeTeamIndices = getActiveTeamIndices();
    const activeTeamsCount = activeTeamIndices.length;

    // Increment total games counter
    setTotalGames(prev => prev + 1);

    if (isTie) {
      // Increment total ties counter
      setTotalTies(prev => prev + 1);

      // Increment team ties for both teams
      const team1Id = allTeams[currentTeam1Index].id;
      const team2Id = allTeams[currentTeam2Index].id;
      setTeamTies(prev => ({
        ...prev,
        [team1Id]: (prev[team1Id] || 0) + 1,
        [team2Id]: (prev[team2Id] || 0) + 1,
      }));

      // REGRA: 2 times ativos = repetir partida
      if (activeTeamsCount === 2) {
        resetForNextMatch();
        requestSave();
        return;
      }

      const tied1 = currentTeam1Index;
      const tied2 = currentTeam2Index;

      // REGRA: 3 times ativos = par/ímpar imediato
      if (activeTeamsCount === 3) {
        // Find the third active team (the one that's not tied)
        const thirdTeamIndex = activeTeamIndices.find(i => i !== tied1 && i !== tied2);
        if (thirdTeamIndex === undefined) {
          toast.error("Erro ao encontrar o terceiro time");
          resetForNextMatch();
          return;
        }
        setTieBreakerPair({
          team1Index: tied1,
          team2Index: tied2
        });
        setShowTieBreaker(true);
        setTieBreakerFromRemoval(false); // Empate normal com 3 times
        setWaitingWinner(thirdTeamIndex);
        setRotationQueue([]);
        resetForNextMatch();
        requestSave();
        return;
      }

      // REGRA: 4+ times ativos = lógica de fila com empates pendentes
      // Add tied teams to pending pairs list
      const existingPair = findTiedPair(tied1, tied2);
      const nextTiedPairs = existingPair ? tiedPairs : [...tiedPairs, {
        team1Index: tied1,
        team2Index: tied2
      }];
      if (!existingPair) setTiedPairs(nextTiedPairs);

      // Add both tied teams to the queue and normalize it
      const rawQueue = [...rotationQueue, tied1, tied2];
      const newQueue = normalizeQueue(rawQueue);

      if (newQueue.length < 2) {
        toast.error("Não há times suficientes para continuar!");
        resetForNextMatch();
        return;
      }

      const next1 = newQueue[0];
      const queueAfterNext1 = newQueue.slice(1);

      // REGRA: par/ímpar só quando existe APENAS 1 vaga disputada.
      // Use nextTiedPairs (updated) for accurate detection
      const candidate = queueAfterNext1[0];
      const candidatePair = nextTiedPairs.find(p => {
        const other = p.team1Index === candidate ? p.team2Index : p.team2Index === candidate ? p.team1Index : null;
        if (other === null) return false;
        if (next1 === p.team1Index || next1 === p.team2Index) return false;
        return queueAfterNext1.includes(other);
      }) || null;

      if (candidatePair) {
        setTieBreakerPair(candidatePair);
        setShowTieBreaker(true);
        setWaitingWinner(next1);

        const remainingQueue = normalizeQueue(queueAfterNext1.filter(i => i !== candidatePair.team1Index && i !== candidatePair.team2Index));
        setRotationQueue(remainingQueue);
      } else {
        let next2 = queueAfterNext1[0];
        let remainingQueue = queueAfterNext1.slice(1);

        // VALIDAÇÃO: Garantir que next1 !== next2
        if (next2 === undefined || next1 === next2) {
          // Tentar encontrar próximo válido na fila
          const validNext2 = queueAfterNext1.find(i => i !== next1);
          if (validNext2 !== undefined) {
            next2 = validNext2;
            remainingQueue = queueAfterNext1.filter(i => i !== validNext2);
          } else {
            // Fallback: encontrar qualquer time ATIVO que não seja next1
            const fallbackIndex = activeTeamIndices.find(i => i !== next1);
            if (fallbackIndex !== undefined) {
              next2 = fallbackIndex;
            } else {
              toast.error("Erro na rotação de times");
              resetForNextMatch();
              return;
            }
          }
        }

        setCurrentTeam1Index(next1);
        setCurrentTeam2Index(next2);
        setRotationQueue(normalizeQueue(remainingQueue));

        const tiedPairFound = findTiedPair(next1, next2);
        if (tiedPairFound) removeTiedPair(tiedPairFound);
      }

      resetForNextMatch();
    } else {
      const winnerIndex = team1Score > team2Score ? currentTeam1Index : currentTeam2Index;
      const loserIndex = team1Score > team2Score ? currentTeam2Index : currentTeam1Index;
      
      // Increment wins for winner
      const winnerTeamId = allTeams[winnerIndex].id;
      setTeamWins(prev => ({
        ...prev,
        [winnerTeamId]: (prev[winnerTeamId] || 0) + 1
      }));
      
      // Increment losses for loser
      const loserTeamId = allTeams[loserIndex].id;
      setTeamLosses(prev => ({
        ...prev,
        [loserTeamId]: (prev[loserTeamId] || 0) + 1
      }));
      
      // Add loser to queue and normalize (remove removed teams)
      const rawQueue = [...rotationQueue, loserIndex];
      const newQueue = normalizeQueue(rawQueue);
      
      if (newQueue.length >= 1) {
        const nextOpponent = newQueue[0];
        const remainingQueue = newQueue.slice(1);
        
        const tiedPairWithWinner = findTiedPair(winnerIndex, nextOpponent);
        if (tiedPairWithWinner) {
          setTieBreakerPair(tiedPairWithWinner);
          setShowTieBreaker(true);
          setWaitingWinner(null);
          setCurrentTeam1Index(winnerIndex);
          setCurrentTeam2Index(nextOpponent);
          setRotationQueue(normalizeQueue(remainingQueue));
          resetForNextMatch();
          requestSave();
          return;
        }
        
        const tiedPairInQueue = tiedPairs.find(pair => {
          const queueWithNext = [nextOpponent, ...remainingQueue];
          return queueWithNext.includes(pair.team1Index) && queueWithNext.includes(pair.team2Index);
        });
        
        if (tiedPairInQueue) {
          const queueWithNext = [nextOpponent, ...remainingQueue];
          const pos1 = queueWithNext.indexOf(tiedPairInQueue.team1Index);
          const pos2 = queueWithNext.indexOf(tiedPairInQueue.team2Index);
          if (pos1 === 0 && pos2 === 1 || pos1 === 1 && pos2 === 0) {
            setTieBreakerPair(tiedPairInQueue);
            setShowTieBreaker(true);
            setWaitingWinner(winnerIndex);
            setRotationQueue(normalizeQueue(remainingQueue.filter(i => i !== tiedPairInQueue.team1Index && i !== tiedPairInQueue.team2Index)));
            resetForNextMatch();
            requestSave();
            return;
          }
        }
        
        // VALIDAÇÃO: Garantir que winnerIndex !== nextOpponent
        if (winnerIndex === nextOpponent) {
          // Use active teams for fallback
          const activeIndices = getActiveTeamIndices();
          const fallback = remainingQueue.find(i => i !== winnerIndex) ?? activeIndices.find(i => i !== winnerIndex);
          if (fallback !== undefined && fallback !== winnerIndex) {
            setCurrentTeam1Index(winnerIndex);
            setCurrentTeam2Index(fallback);
            setRotationQueue(normalizeQueue(remainingQueue.filter(i => i !== fallback)));
          }
        } else {
          setCurrentTeam1Index(winnerIndex);
          setCurrentTeam2Index(nextOpponent);
          setRotationQueue(normalizeQueue(remainingQueue));
        }
      } else {
        // Fallback: use active team indices only
        const activeIndices = getActiveTeamIndices().filter(i => i !== winnerIndex);
        if (activeIndices.length > 0) {
          setCurrentTeam1Index(winnerIndex);
          setCurrentTeam2Index(activeIndices[0]);
          setRotationQueue(normalizeQueue(activeIndices.slice(1)));
        }
      }
      resetForNextMatch();
    }
    // Save after next match setup
    requestSave();
  };

  const handleTieBreakerWinner = (winnerIndex: number, method: 'par-impar' | 'sorteio' = 'par-impar') => {
    if (!config || !tieBreakerPair) return;
    const loserIndex = winnerIndex === tieBreakerPair.team1Index ? tieBreakerPair.team2Index : tieBreakerPair.team1Index;
    const methodText = method === 'sorteio' ? 'sorteio' : 'par ou ímpar';
    toast.success(`Time ${allTeams[winnerIndex].id} venceu no ${methodText}!`);
    removeTiedPair(tieBreakerPair);
    
    // Get active teams count for rotation logic
    const activeTeamIndices = getActiveTeamIndices();
    const activeTeamsCount = activeTeamIndices.length;
    
    // Verificar se waitingWinner participou do par/ímpar
    // Se NÃO participou = cenário de remoção de time (waitingWinner ficou esperando enquanto fila disputou)
    const isWaitingWinnerInTieBreakerPair = tieBreakerPair && (
      waitingWinner === tieBreakerPair.team1Index || 
      waitingWinner === tieBreakerPair.team2Index
    );
    
    if (waitingWinner !== null) {
      // There's a team waiting to play against the tie-breaker winner
      
      // VALIDAÇÃO: Garantir que waitingWinner !== winnerIndex
      if (waitingWinner === winnerIndex) {
        // Edge case: waiting team is somehow the winner (shouldn't happen)
        // Use loser as opponent
        setCurrentTeam1Index(winnerIndex);
        setCurrentTeam2Index(loserIndex);
      } else if (tieBreakerFromRemoval) {
        // CENÁRIO DE REMOÇÃO: Par/ímpar foi aberto porque um time foi removido
        // waitingWinner é o time que ESTAVA jogando e permaneceu
        // waitingWinner fica no card 1, vencedor do par/ímpar vai pro card 2
        setCurrentTeam1Index(waitingWinner);
        setCurrentTeam2Index(winnerIndex);
        setRotationQueue(prev => normalizeQueueExcludingCurrent([loserIndex, ...prev], waitingWinner, winnerIndex));
      } else if (activeTeamsCount === 3 && !isWaitingWinnerInTieBreakerPair) {
        // CENÁRIO ESPECÍFICO: 3 times, empate entre os dois jogando
        // waitingWinner é o terceiro time que estava de fora
        // Vencedor do par/ímpar vai pro card 1, waitingWinner vai pro card 2
        setCurrentTeam1Index(winnerIndex);
        setCurrentTeam2Index(waitingWinner);
        setRotationQueue([loserIndex]);
      } else if (!isWaitingWinnerInTieBreakerPair) {
        // CENÁRIO DE FILA (4+ times sem flag de remoção): waitingWinner NÃO participou do par/ímpar
        // waitingWinner fica no card 1, vencedor do par/ímpar vai pro card 2
        setCurrentTeam1Index(waitingWinner);
        setCurrentTeam2Index(winnerIndex);
        setRotationQueue(prev => normalizeQueueExcludingCurrent([loserIndex, ...prev], waitingWinner, winnerIndex));
      } else {
        // CENÁRIO DE EMPATE NORMAL: waitingWinner participou do par/ímpar (era um dos times empatados)
        if (activeTeamsCount === 3) {
          // Com 3 times: vencedor do par/ímpar vai pro card 1, time que esperava vai pro card 2
          setCurrentTeam1Index(winnerIndex);
          setCurrentTeam2Index(waitingWinner);
          setRotationQueue([loserIndex]);
        } else {
          // 4+ times com empate normal: vencedor vai pro card 1, waitingWinner (outro time que esperava) vai pro card 2
          setCurrentTeam1Index(winnerIndex);
          setCurrentTeam2Index(waitingWinner);
          setRotationQueue(prev => normalizeQueueExcludingCurrent([loserIndex, ...prev], winnerIndex, waitingWinner));
        }
      }
    } else {
      // No waiting team - winner stays in 1st, gets opponent from queue
      setCurrentTeam1Index(winnerIndex);
      if (rotationQueue.length > 0) {
        const nextFromQueue = rotationQueue[0];
        // VALIDAÇÃO: Garantir que winnerIndex !== nextFromQueue
        if (nextFromQueue === winnerIndex) {
          setCurrentTeam2Index(loserIndex);
          setRotationQueue(prev => normalizeQueue(prev.slice(1)));
        } else {
          setCurrentTeam2Index(nextFromQueue);
          // Perdedor vai pro INÍCIO da fila (é o próximo)
          setRotationQueue(prev => normalizeQueueExcludingCurrent([loserIndex, ...prev.slice(1)], winnerIndex, nextFromQueue));
        }
      } else {
        // No queue - loser plays against winner again
        setCurrentTeam2Index(loserIndex);
      }
    }
    setShowTieBreaker(false);
    setTieBreakerPair(null);
    setWaitingWinner(null);
    setTieBreakerFromRemoval(false); // Resetar flag
    resetForNextMatch();
    // Save after tie breaker resolution
    requestSave();
  };

  const handleResetAll = () => {
    if (!config) return;
    
    // Use active team indices for reset (respecting removed teams)
    const activeIndices = getActiveTeamIndices();
    
    if (activeIndices.length < 2) {
      toast.error("Não há times suficientes para continuar!");
      return;
    }
    
    setCurrentTeam1Index(activeIndices[0]);
    setCurrentTeam2Index(activeIndices[1]);
    const initialQueue = activeIndices.slice(2);
    setRotationQueue(initialQueue);
    setTimeLeft(config.gameDuration * 60);
    setTeam1Score(0);
    setTeam2Score(0);
    setIsRunning(false);
    setMatchEnded(false);
    setTiedPairs([]);
    setShowTieBreaker(false);
    setTieBreakerPair(null);
    setWaitingWinner(null);
    setPlayerGoals({});
    setGoalHistory({
      team1: [],
      team2: []
    });
    setTotalPlayerGoals({});
    setTotalPlayerAssists({});
    setTeamWins({});
    setTeamTies({});
    setTeamLosses({});
    setTotalGames(0);
    setTotalTies(0);
    toast.success("Baba reiniciado!");
    // Save after full reset
    requestSave();
  };

  // Handler for removing a team from rotation - manages game state properly
  const handleRemoveTeamFromRotation = useCallback((
    teamIndex: number,
    removalType: 'temporary' | 'permanent'
  ) => {
    // Compute next removedTeams synchronously to avoid stale React state reads
    const nextRemovedTeams = (() => {
      const existing = teamManagement.removedTeams.find(r => r.teamIndex === teamIndex);
      if (existing) {
        return teamManagement.removedTeams.map(r => r.teamIndex === teamIndex ? { ...r, removalType } : r);
      }
      return [...teamManagement.removedTeams, { teamIndex, removalType }];
    })();

    // Mark as removed in team management
    teamManagement.removeTeamFromRotation(teamIndex, removalType);

    // Check if the removed team is currently playing
    const isTeam1 = teamIndex === currentTeam1Index;
    const isTeam2 = teamIndex === currentTeam2Index;
    const isPlaying = isTeam1 || isTeam2;

    // Get all active team indices (excluding the one being removed and already removed teams)
    const activeTeamIndices = allTeams
      .map((_, idx) => idx)
      .filter(idx => idx !== teamIndex)
      .filter(idx => !nextRemovedTeams.some(r => r.teamIndex === idx));

    // Remove from rotation queue
    const filteredQueue = rotationQueue.filter(idx => idx !== teamIndex);

    if (isPlaying) {
      // Need to find a replacement team
      const availableFromQueue = filteredQueue.filter(idx =>
        !nextRemovedTeams.some(r => r.teamIndex === idx) &&
        idx !== teamIndex
      );
      
      const otherPlayingTeam = isTeam1 ? currentTeam2Index : currentTeam1Index;
      
      if (availableFromQueue.length === 0) {
        // No teams in queue - check if there are any available teams at all
        const otherAvailableTeams = activeTeamIndices.filter(idx => idx !== otherPlayingTeam);
        
        if (otherAvailableTeams.length === 0) {
          toast.error("Não há times suficientes para continuar!");
          return;
        }
        
        // Use a random team from available teams
        const replacementTeam = otherAvailableTeams[0];
        
        if (isTeam1) {
          setCurrentTeam1Index(replacementTeam);
        } else {
          setCurrentTeam2Index(replacementTeam);
        }
      } else {
        // Get next team from queue directly (respects order - loser of tie-breaker is at the beginning)
        const nextTeam = availableFromQueue[0];
        const remainingQueue = availableFromQueue.slice(1);
        
        // Check if there's a pending tie between the remaining playing team and the replacement
        const pendingTieWithPlaying = findTiedPair(otherPlayingTeam, nextTeam);
        
        // NOVA LÓGICA: Verificar empate entre os dois primeiros da fila
        const secondInQueue = availableFromQueue[1];
        const pendingTieInQueue = secondInQueue !== undefined 
          ? findTiedPair(nextTeam, secondInQueue) 
          : null;
        
        if (pendingTieInQueue && secondInQueue !== undefined) {
          // Há empate entre os dois primeiros da fila
          // O time que permanece já garantiu a vaga, par/ímpar é entre os da fila
          setTieBreakerPair(pendingTieInQueue);
          setShowTieBreaker(true);
          setTieBreakerFromRemoval(true); // Par/ímpar originado de remoção de time
          setWaitingWinner(otherPlayingTeam); // Time que permanece espera
          
          setCurrentTeam1Index(otherPlayingTeam);
          // currentTeam2Index será definido após par/ímpar
          setRotationQueue(remainingQueue.slice(1)); // Remove os dois que vão disputar
        } else if (pendingTieWithPlaying) {
          // Empate entre o time que permanece e o substituto
          setTieBreakerPair(pendingTieWithPlaying);
          setShowTieBreaker(true);
          setWaitingWinner(null); // Ambos disputam
          
          setCurrentTeam1Index(otherPlayingTeam);
          setCurrentTeam2Index(nextTeam);
          setRotationQueue(remainingQueue);
        } else {
          // Sem empates pendentes - fluxo normal
          setCurrentTeam1Index(otherPlayingTeam);
          setCurrentTeam2Index(nextTeam);
          setRotationQueue(remainingQueue);
        }
      }
      
      // Reset match state since team changed
      if (config) {
        setTimeLeft(config.gameDuration * 60);
        setTeam1Score(0);
        setTeam2Score(0);
        setIsRunning(false);
        setMatchEnded(false);
        setPlayerGoals({});
        setGoalHistory({ team1: [], team2: [] });
      }
    } else {
      // Team is not playing - just remove from queue
      setRotationQueue(filteredQueue);
    }
    
    // Also remove any tied pairs involving this team
    setTiedPairs(prev => prev.filter(p => 
      p.team1Index !== teamIndex && p.team2Index !== teamIndex
    ));
    
    requestSave(true);
  }, [allTeams, currentTeam1Index, currentTeam2Index, rotationQueue, teamManagement, findTiedPair, config, requestSave]);

  // Handler for restoring a team to rotation
  const handleRestoreTeamToRotation = useCallback((teamIndex: number) => {
    teamManagement.restoreTeamToRotation(teamIndex);
    
    // Add to the END of the rotation queue
    setRotationQueue(prev => [...prev, teamIndex]);
    
    requestSave(true);
  }, [teamManagement, requestSave]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const savedBabaId = localStorage.getItem('currentBabaId');

  // AJUSTE 1: Manter preloader até TODOS os dados essenciais estarem carregados
  // Isso previne o flash de "nenhum baba ativo" durante a transição
  const shouldShowHydrationLoader =
    contextLoading ||
    !contextHydrated ||
    (!!savedBabaId && !currentBaba) ||
    (!!currentBaba && (!contextConfig || contextTeams.length < 2));

  // Show loading state while context is loading/hydrating
  if (shouldShowHydrationLoader) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  // If no baba is active after hydration AND no savedBabaId, redirect to home
  if (!currentBaba && !savedBabaId) {
    navigate('/');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  // If still no currentBaba but we had a savedBabaId, keep showing loader
  // This handles edge cases where the baba is still being fetched
  if (!currentBaba) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  // At this point, currentBaba exists. Check for config and teams.
  // If missing AND setupStatus is NOT 'game', redirect to appropriate setup step.
  // If setupStatus IS 'game' but data is missing, keep showing loader (data is still loading)
  const setupStatus = currentBaba?.setupStatus ?? 'import';
  
  if (!contextConfig || contextTeams.length < 2 || allTeams.length < 2 || !config) {
    // If setupStatus is 'game', the user was on the game page and refreshed.
    // We should wait for data to load, not redirect them away.
    if (setupStatus === 'game') {
      // Keep showing loader - data is still being hydrated
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <BallLoader />
        </div>
      );
    }
    
    // Otherwise, redirect to the appropriate setup step
    const targetPath = setupStatus === 'import' ? '/import-list' 
      : setupStatus === 'config' ? '/configure-game' 
      : '/teams';
    navigate(targetPath);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  const currentTeam1 = allTeams[currentTeam1Index];
  const currentTeam2 = allTeams[currentTeam2Index];
  
  // Normalize queue for display (filter out removed teams AND currently playing teams)
  const normalizedDisplayQueue = normalizeQueueExcludingCurrent(rotationQueue, currentTeam1Index, currentTeam2Index);
  
  // FIXED: When tie-breaker is active with a waitingWinner, show that as the next team
  // This prevents showing the old playing teams as "next" while the modal is open
  const displayNextTeamIndex = (() => {
    if (showTieBreaker && waitingWinner !== null) {
      // waitingWinner is the team that's already confirmed for next match
      return waitingWinner;
    }
    return normalizedDisplayQueue.length > 0 ? normalizedDisplayQueue[0] : null;
  })();
  
  const nextTeamIndex = displayNextTeamIndex;
  const nextTeam = nextTeamIndex !== null ? allTeams[nextTeamIndex] : null;
  const team1Won = team1Score > team2Score && matchEnded;
  const team2Won = team2Score > team1Score && matchEnded;
  const isTied = matchEnded && team1Score === team2Score;

  // Filter tiedPairs to exclude pairs with removed teams (for display)
  const activeTiedPairs = tiedPairs.filter(p => 
    !isTeamRemovedFromRotation(p.team1Index) && !isTeamRemovedFromRotation(p.team2Index)
  );

  // Check if next team is part of a tied pair (for displaying "Time X ou Time Y")
  // Only show if both teams in the pair are active
  const nextTeamTiedPair = nextTeamIndex !== null ? activeTiedPairs.find(p => 
    p.team1Index === nextTeamIndex || p.team2Index === nextTeamIndex
  ) : null;

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Video Background - Fixed */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="https://darkturquoise-sandpiper-894009.hostingersite.com/wp-content/uploads/2025/12/video-de-futebel.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay - Fixed */}
      <div className="fixed inset-0 bg-background/50 z-10" />

      {/* Audio Controls - Fixed Bottom Right */}
      <AudioControls />

      {/* Header - Fixed position */}
      <header className="fixed top-0 left-0 right-0 bg-card/80 backdrop-blur-md border-b border-border py-4 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teams')} className="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Partida</h1>
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                <span className="sm:hidden">T{currentTeam1.id} vs T{currentTeam2.id}</span>
                <span className="hidden sm:inline">Time {currentTeam1.id} vs Time {currentTeam2.id}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetAll} className="rounded-2xl bg-destructive/15 hover:bg-destructive/25 border border-destructive/40 text-white hover:text-white">
              <RefreshCw className="w-4 h-4 mr-1.5 text-white" />
              <span className="text-xs sm:text-sm text-white">Resetar tudo</span>
            </Button>
            <AppMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col pt-[88px] sm:pt-[72px]">
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 pb-28 sm:pb-6 max-w-5xl flex-1">
          {/* Cronômetro */}
          <Card className={`mb-8 backdrop-blur-md border-border/50 rounded-3xl ${timeLeft <= 60 ? 'bg-red-950/60 border-red-900/50' : 'bg-card/60'}`}>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-center">
                  Cronômetro
                </div>
                {addedStoppageTime > 0 && (
                  <div className="text-warning-yellow text-xs font-semibold text-center mt-1">
                    Acrés. +{formatStoppageTime(addedStoppageTime)}
                  </div>
                )}
                <div className={`text-7xl font-sans font-bold mb-6 mt-2 tabular-nums ${timeLeft <= 60 ? 'text-red-400' : 'text-foreground'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  {isRunning ? (
                    <Button onClick={handleStartPause} size="lg" className="px-8 py-6 rounded-2xl bg-warning-yellow hover:bg-warning-yellow/90 text-background" disabled={matchEnded}>
                      <Pause className="w-5 h-5 mr-1.5" />
                      Pausar
                    </Button>
                  ) : (
                    <Button onClick={handleStartPause} size="lg" className="group btn-cta-green px-8 py-6" disabled={matchEnded}>
                      <img src={ballIcon} alt="" className="w-5 h-5 mr-1.5 animate-spin-ball" />
                      {hasStartedOnce ? 'Continuar Partida' : 'Iniciar Partida'}
                    </Button>
                  )}
                  <Button onClick={handleReset} variant="outline" size="lg" className="px-8 py-6 rounded-2xl border-destructive/40 bg-destructive/15 text-white hover:bg-destructive/25 hover:text-white hover:border-destructive/60">
                    <RotateCcw className="w-5 h-5 mr-1.5 text-white" />
                    Resetar Partida
                  </Button>
                  {/* Botão de Acréscimo - minimalista com popover */}
                  {hasReachedFinalMinute && !hasWonByGoals() && (
                    <Popover open={showStoppagePopover} onOpenChange={setShowStoppagePopover}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="lg"
                          className="bg-warning-yellow/20 border-warning-yellow/50 text-warning-yellow hover:bg-warning-yellow/30 hover:text-warning-yellow hover:border-warning-yellow"
                        >
                          <Plus className="w-5 h-5 mr-1.5" />
                          Acréscimo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3 bg-card border-border z-50" align="center" sideOffset={8}>
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-medium text-foreground text-center">Acréscimo</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8 px-2 border-border hover:bg-muted"
                              onClick={() => handleAddStoppageTime(30)}
                            >
                              +30s
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8 px-2 border-border hover:bg-muted"
                              onClick={() => handleAddStoppageTime(60)}
                            >
                              +1min
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8 px-2 border-border hover:bg-muted"
                              onClick={() => handleAddStoppageTime(120)}
                            >
                              +2min
                            </Button>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="600"
                              placeholder="Segundos"
                              value={customStoppageInput}
                              onChange={(e) => setCustomStoppageInput(e.target.value)}
                              className="flex-1 h-8 px-2 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2 border-border hover:bg-muted"
                              onClick={() => {
                                const seconds = parseInt(customStoppageInput, 10);
                                if (!isNaN(seconds) && seconds > 0 && seconds <= 600) {
                                  handleAddStoppageTime(seconds);
                                  setCustomStoppageInput('');
                                }
                              }}
                              disabled={!customStoppageInput || parseInt(customStoppageInput, 10) <= 0}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placar */}
          <div className="relative">
          {/* Ícone Versus - Desktop: sobreposto aos cards, centralizado verticalmente - só durante o jogo */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 justify-center pointer-events-none">
              <VSCinematicAnimation size="desktop" isTied={isTied && matchEnded} />
            </div>
            
            <div className="grid gap-4 md:gap-4 md:grid-cols-2 mb-6">
              {/* Time 1 */}
              <Card className={`backdrop-blur-md border-2 rounded-3xl ${team1Won ? 'border-primary bg-primary/15' : isTied ? 'border-warning-yellow bg-warning-yellow/15' : 'border-border/50 bg-card/60'} ${celebratingTeam === 'team1' ? 'animate-goal-celebration' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className={`px-4 py-2 rounded-lg text-base font-bold flex items-center gap-2 ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/20'} ${!matchEnded ? 'animate-border-rotate' : ''}`}>
                    <img src={isTied ? teamShieldWhite : teamShield} alt="" className="w-6 h-6" />
                    <span className={isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}>Time {currentTeam1.id}</span>
                  </span>
                  <TeamActionsMenu
                    teamIndex={currentTeam1Index}
                    teamId={currentTeam1.id}
                    isRemovedFromRotation={teamManagement.removedTeams.find(r => r.teamIndex === currentTeam1Index)}
                    onRemoveFromRotation={(type) => handleRemoveTeamFromRotation(currentTeam1Index, type)}
                    onRestoreToRotation={() => handleRestoreTeamToRotation(currentTeam1Index)}
                    disabled={matchEnded}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Placar */}
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => handleGoal('team1', false)} className="w-10 h-10 rounded-full bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center self-center translate-y-[2px] transition-colors" disabled={team1Score === 0}>
                    <Minus className="w-6 h-6" />
                  </button>
                  <div className={`text-7xl font-sans font-bold tabular-nums min-w-[72px] text-center leading-none flex items-center justify-center ${isTied && team1Score > 0 ? 'text-warning-yellow' : team1Score > 0 ? 'text-[#21C45D]' : 'text-foreground'}`}>
                    {team1Score}
                  </div>
                  <button onClick={() => handleGoal('team1', true)} className="w-10 h-10 rounded-full bg-transparent hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center self-center translate-y-[2px] transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Goleiro - Clicável para trocar */}
                {(() => {
                  const assignedGk = teamManagement.getCurrentGoalkeeper(currentTeam1Index);
                  const hasGoalkeeper = !!currentTeam1.goalkeeper || !!assignedGk;
                  const gkName = assignedGk || currentTeam1.goalkeeper?.name || '';
                  // Use name-based goal count for goalkeeper (with fallback to legacy)
                  const gkGoalCount = gkName 
                    ? (playerGoals[gkGoalsKey(gkName)] || playerGoals[`${currentTeam1Index}--1`] || 0)
                    : 0;
                  // Use name-based card functions for goalkeeper
                  const gkCards = gkName ? getGoalkeeperCards(gkName, currentTeam1Index) : { yellow: 0, red: false };
                  const gkExpelled = gkName ? isGoalkeeperExpelled(gkName) : false;
                  return (
                    <button
                      onClick={() => setShowGoalkeeperModal({ teamIndex: currentTeam1Index, teamId: currentTeam1.id })}
                      className={`w-full p-2 rounded-lg text-center relative transition-colors ${gkExpelled ? 'bg-destructive/20 border border-destructive/50' : isTied ? 'bg-warning-yellow/20 hover:bg-warning-yellow/30' : 'bg-primary/10 hover:bg-primary/20'} ${!hasGoalkeeper ? 'border border-dashed border-muted-foreground/50' : ''} ${gkExpelled ? 'opacity-60' : ''}`}
                    >
                      <div className={`text-xs font-semibold ${gkExpelled ? 'text-destructive' : isTied ? 'text-warning-yellow' : 'text-primary'}`}>GOLEIRO</div>
                      <div className={`font-medium text-sm ${!hasGoalkeeper ? (isTied ? 'text-white/70' : 'text-muted-foreground') : gkExpelled ? 'line-through text-muted-foreground' : isTied ? 'text-white' : 'text-foreground'}`}>
                        {hasGoalkeeper ? gkName : 'Clique para escolher'}
                        {gkExpelled && <span className="text-xs text-destructive ml-1.5 no-underline">EXPULSO</span>}
                      </div>
                      {/* Cards display for GK - positioned right of center */}
                      {(gkCards.yellow > 0 || gkCards.red) && (
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                          {gkCards.yellow >= 1 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="Cartão amarelo" />}
                          {gkCards.yellow >= 2 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="2º cartão amarelo" />}
                          {gkCards.red && <span className="w-3 h-4 bg-destructive rounded-[2px]" title="Cartão vermelho" />}
                        </div>
                      )}
                      {gkGoalCount > 0 && (
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/30'}`}>
                          <img src={ballIcon} alt="" className="w-4 h-4" />
                          <span className={`font-semibold ${isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}`}>{gkGoalCount}</span>
                        </span>
                      )}
                    </button>
                  );
                })()}
                
                {/* Jogadores */}
                <div className="space-y-2">
                  {(() => {
                    const lineLimit = config ? Math.max(0, config.playersPerTeam - 1) : currentTeam1.players.length;
                    const seen = new Set<string>();
                    const safePlayers = currentTeam1.players
                      .filter(p => {
                        const key = (p.id ?? p.name).toLowerCase().trim();
                        if (!key) return false;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      })
                      .slice(0, lineLimit);

                    return safePlayers.map((player, idx) => {
                      const goalCount = playerGoals[`${currentTeam1Index}-${idx}`] || 0;
                      const cards = getPlayerCards(currentTeam1Index, idx.toString());
                      const expelled = isPlayerExpelled(currentTeam1Index, idx.toString());
                      return (
                        <button
                          key={idx}
                          onClick={() => setShowReplacePlayerModal({
                            teamIndex: currentTeam1Index,
                            teamId: currentTeam1.id,
                            playerIndex: idx,
                            playerName: player.name
                          })}
                          className={`w-full relative text-base py-2 px-2 rounded-lg text-center font-medium transition-colors group ${expelled ? 'bg-destructive/30 border border-destructive/60' : team1Won ? 'bg-primary/20 text-foreground hover:bg-primary/30 border border-primary/40' : isTied ? 'bg-warning-yellow/15 hover:bg-warning-yellow/25 border border-warning-yellow/30' : 'bg-muted/40 hover:bg-muted/60 border border-primary/20'}`}
                        >
                          {/* Actions icon (MoreVertical) - show when not expelled, always left */}
                          {!expelled && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </span>
                          )}
                          {/* Cards display - positioned after actions icon */}
                          {(cards.yellow > 0 || cards.red) && (
                            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                              {cards.yellow >= 1 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="Cartão amarelo" />}
                              {cards.yellow >= 2 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="2º cartão amarelo" />}
                              {cards.red && <span className="w-3 h-4 bg-destructive rounded-[2px]" title="Cartão vermelho" />}
                            </div>
                          )}
                          {goalCount > 0 && (
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/30'}`}>
                              <img src={ballIcon} alt="" className="w-4 h-4" />
                              <span className={`font-semibold ${isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}`}>{goalCount}</span>
                            </span>
                          )}
                          <span className={expelled ? 'line-through text-muted-foreground' : isTied ? 'text-white' : 'text-foreground'}>
                            {player.name}
                          </span>
                          {expelled && <span className="text-xs font-bold text-red-300 ml-1.5">EXPULSO</span>}
                        </button>
                      );
                    });
                  })()}
                  
                  {/* Slots vazios clicáveis - usa playersPerTeam - 1 (exclui goleiro) */}
                  {config && (() => {
                    const linePlayersCount = config.playersPerTeam - 1;
                    const emptySlots = linePlayersCount - currentTeam1.players.length;
                    if (emptySlots <= 0) return null;
                    return Array.from({ length: emptySlots }).map((_, idx) => (
                      <button
                        key={`empty-${idx}`}
                        onClick={() => setShowAddPlayerModal({ teamIndex: currentTeam1Index, teamId: currentTeam1.id })}
                        className="w-full relative text-base py-2 px-2 rounded-lg text-center font-medium bg-muted/30 border border-dashed border-muted-foreground/40 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                      >
                        <span className="text-muted-foreground flex items-center justify-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          Adicionar jogador
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              </CardContent>
              </Card>

              {/* Ícone Versus - Mobile only: sobrepondo os cards - só durante o jogo */}
                <div className="flex md:hidden justify-center -my-24 relative z-10 pointer-events-none">
                  <VSCinematicAnimation size="mobile" isTied={isTied && matchEnded} />
                </div>

              {/* Time 2 */}
              <Card className={`backdrop-blur-md border-2 rounded-3xl md:mt-0 ${team2Won ? 'border-primary bg-primary/15' : isTied ? 'border-warning-yellow bg-warning-yellow/15' : 'border-border/50 bg-card/60'} ${celebratingTeam === 'team2' ? 'animate-goal-celebration' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className={`px-4 py-2 rounded-lg text-base font-bold flex items-center gap-2 ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/20'} ${!matchEnded ? 'animate-border-rotate' : ''}`}>
                    <img src={isTied ? teamShieldWhite : teamShield} alt="" className="w-6 h-6" />
                    <span className={isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}>Time {currentTeam2.id}</span>
                  </span>
                  <TeamActionsMenu
                    teamIndex={currentTeam2Index}
                    teamId={currentTeam2.id}
                    isRemovedFromRotation={teamManagement.removedTeams.find(r => r.teamIndex === currentTeam2Index)}
                    onRemoveFromRotation={(type) => handleRemoveTeamFromRotation(currentTeam2Index, type)}
                    onRestoreToRotation={() => handleRestoreTeamToRotation(currentTeam2Index)}
                    disabled={matchEnded}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Placar */}
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => handleGoal('team2', false)} className="w-10 h-10 rounded-full bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center self-center translate-y-[2px] transition-colors" disabled={team2Score === 0}>
                    <Minus className="w-6 h-6" />
                  </button>
                  <div className={`text-7xl font-sans font-bold tabular-nums min-w-[72px] text-center leading-none flex items-center justify-center ${isTied && team2Score > 0 ? 'text-warning-yellow' : team2Score > 0 ? 'text-[#21C45D]' : 'text-foreground'}`}>
                    {team2Score}
                  </div>
                  <button onClick={() => handleGoal('team2', true)} className="w-10 h-10 rounded-full bg-transparent hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center self-center translate-y-[2px] transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Goleiro - Clicável para trocar */}
                {(() => {
                  const assignedGk = teamManagement.getCurrentGoalkeeper(currentTeam2Index);
                  const hasGoalkeeper = !!currentTeam2.goalkeeper || !!assignedGk;
                  const gkName = assignedGk || currentTeam2.goalkeeper?.name || '';
                  // Use name-based goal count for goalkeeper (with fallback to legacy)
                  const gkGoalCount = gkName 
                    ? (playerGoals[gkGoalsKey(gkName)] || playerGoals[`${currentTeam2Index}--1`] || 0)
                    : 0;
                  // Use name-based card functions for goalkeeper
                  const gkCards = gkName ? getGoalkeeperCards(gkName, currentTeam2Index) : { yellow: 0, red: false };
                  const gkExpelled = gkName ? isGoalkeeperExpelled(gkName) : false;
                  return (
                    <button
                      onClick={() => setShowGoalkeeperModal({ teamIndex: currentTeam2Index, teamId: currentTeam2.id })}
                      className={`w-full p-2 rounded-lg text-center relative transition-colors ${gkExpelled ? 'bg-destructive/20 border border-destructive/50' : isTied ? 'bg-warning-yellow/20 hover:bg-warning-yellow/30' : 'bg-primary/10 hover:bg-primary/20'} ${!hasGoalkeeper ? 'border border-dashed border-muted-foreground/50' : ''} ${gkExpelled ? 'opacity-60' : ''}`}
                    >
                      <div className={`text-xs font-semibold ${gkExpelled ? 'text-destructive' : isTied ? 'text-warning-yellow' : 'text-primary'}`}>GOLEIRO</div>
                      <div className={`font-medium text-sm ${!hasGoalkeeper ? (isTied ? 'text-white/70' : 'text-muted-foreground') : gkExpelled ? 'line-through text-muted-foreground' : isTied ? 'text-white' : 'text-foreground'}`}>
                        {hasGoalkeeper ? gkName : 'Clique para escolher'}
                        {gkExpelled && <span className="text-xs text-destructive ml-1.5 no-underline">EXPULSO</span>}
                      </div>
                      {/* Cards display for GK - positioned right of center */}
                      {(gkCards.yellow > 0 || gkCards.red) && (
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                          {gkCards.yellow >= 1 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="Cartão amarelo" />}
                          {gkCards.yellow >= 2 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="2º cartão amarelo" />}
                          {gkCards.red && <span className="w-3 h-4 bg-destructive rounded-[2px]" title="Cartão vermelho" />}
                        </div>
                      )}
                      {gkGoalCount > 0 && (
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/30'}`}>
                          <img src={ballIcon} alt="" className="w-4 h-4" />
                          <span className={`font-semibold ${isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}`}>{gkGoalCount}</span>
                        </span>
                      )}
                    </button>
                  );
                })()}
                
                {/* Jogadores */}
                <div className="space-y-2">
                  {(() => {
                    const lineLimit = config ? Math.max(0, config.playersPerTeam - 1) : currentTeam2.players.length;
                    const seen = new Set<string>();
                    const safePlayers = currentTeam2.players
                      .filter(p => {
                        const key = (p.id ?? p.name).toLowerCase().trim();
                        if (!key) return false;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      })
                      .slice(0, lineLimit);

                    return safePlayers.map((player, idx) => {
                      const goalCount = playerGoals[`${currentTeam2Index}-${idx}`] || 0;
                      const cards = getPlayerCards(currentTeam2Index, idx.toString());
                      const expelled = isPlayerExpelled(currentTeam2Index, idx.toString());
                      return (
                        <button
                          key={idx}
                          onClick={() => setShowReplacePlayerModal({
                            teamIndex: currentTeam2Index,
                            teamId: currentTeam2.id,
                            playerIndex: idx,
                            playerName: player.name
                          })}
                          className={`w-full relative text-base py-2 px-2 rounded-lg text-center font-medium transition-colors group ${expelled ? 'bg-destructive/30 border border-destructive/60' : team2Won ? 'bg-primary/20 text-foreground hover:bg-primary/30 border border-primary/40' : isTied ? 'bg-warning-yellow/15 hover:bg-warning-yellow/25 border border-warning-yellow/30' : 'bg-muted/40 hover:bg-muted/60 border border-primary/20'}`}
                        >
                          {/* Actions icon (MoreVertical) - show when not expelled, always left */}
                          {!expelled && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </span>
                          )}
                          {/* Cards display - positioned after actions icon */}
                          {(cards.yellow > 0 || cards.red) && (
                            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                              {cards.yellow >= 1 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="Cartão amarelo" />}
                              {cards.yellow >= 2 && <span className="w-3 h-4 bg-warning-yellow rounded-[2px]" title="2º cartão amarelo" />}
                              {cards.red && <span className="w-3 h-4 bg-destructive rounded-[2px]" title="Cartão vermelho" />}
                            </div>
                          )}
                          {goalCount > 0 && (
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isTied ? 'bg-warning-yellow/30' : 'bg-primary/30'}`}>
                              <img src={ballIcon} alt="" className="w-4 h-4" />
                              <span className={`font-semibold ${isTied ? 'text-white' : 'text-[hsl(142_70%_60%)]'}`}>{goalCount}</span>
                            </span>
                          )}
                          <span className={expelled ? 'line-through text-muted-foreground' : isTied ? 'text-white' : 'text-foreground'}>
                            {player.name}
                          </span>
                          {expelled && <span className="text-xs font-bold text-red-300 ml-1.5">EXPULSO</span>}
                        </button>
                      );
                    });
                  })()}
                  
                  {/* Slots vazios clicáveis - usa playersPerTeam - 1 (exclui goleiro) */}
                  {config && (() => {
                    const linePlayersCount = config.playersPerTeam - 1;
                    const emptySlots = linePlayersCount - currentTeam2.players.length;
                    if (emptySlots <= 0) return null;
                    return Array.from({ length: emptySlots }).map((_, idx) => (
                      <button
                        key={`empty-${idx}`}
                        onClick={() => setShowAddPlayerModal({ teamIndex: currentTeam2Index, teamId: currentTeam2.id })}
                        className="w-full relative text-base py-2 px-2 rounded-lg text-center font-medium bg-muted/30 border border-dashed border-muted-foreground/40 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                      >
                        <span className="text-muted-foreground flex items-center justify-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          Adicionar jogador
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Próximo Time - with tie handling - MOBILE IMPROVED */}
          {nextTeam && (
            <Card className="backdrop-blur-md border-border/50 bg-card/60 mb-6 rounded-3xl">
              <CardContent className="py-4 px-4 sm:py-4 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <ChevronRight className="text-muted-foreground w-5 h-5 sm:w-[21px] sm:h-[21px] flex-shrink-0" />
                  <span className="text-muted-foreground text-sm sm:text-lg whitespace-nowrap flex-shrink-0">Próximo:</span>
                  {nextTeamTiedPair ? (
                    <span className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-warning-yellow/20 min-w-0 overflow-hidden">
                      <img src={teamShieldWhite} alt="" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-bold text-warning-yellow text-sm sm:text-base truncate">
                        <span className="sm:hidden">T{allTeams[nextTeamTiedPair.team1Index].id}</span>
                        <span className="hidden sm:inline">Time {allTeams[nextTeamTiedPair.team1Index].id}</span>
                      </span>
                      <span className="font-bold text-warning-yellow text-sm sm:text-base flex-shrink-0">ou</span>
                      <img src={teamShieldWhite} alt="" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-bold text-warning-yellow text-sm sm:text-base truncate">
                        <span className="sm:hidden">T{allTeams[nextTeamTiedPair.team2Index].id}</span>
                        <span className="hidden sm:inline">Time {allTeams[nextTeamTiedPair.team2Index].id}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary/20">
                      <img src={teamShield} alt="" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-bold text-[hsl(142_70%_60%)] text-sm sm:text-base whitespace-nowrap">Time {nextTeam.id}</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pares Empatados Pendentes - only show active pairs (not removed teams) */}
          {activeTiedPairs.length > 0 && (
            <Card className="backdrop-blur-md border-warning-yellow/50 bg-warning-yellow/10 mb-6 rounded-3xl">
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning-yellow flex-shrink-0" />
                  <span className="text-warning-yellow text-sm sm:text-base whitespace-nowrap flex-shrink-0">Empates pendentes:</span>
                  <span className="font-semibold text-foreground text-sm sm:text-base min-w-0 flex-1 truncate">
                    {(() => {
                      const maxToShow = 2;
                      const visible = activeTiedPairs.slice(0, maxToShow);
                      const hidden = activeTiedPairs.length - visible.length;
                      const text = visible
                        .map(pair => `Time ${allTeams[pair.team1Index].id} x Time ${allTeams[pair.team2Index].id}`)
                        .join(', ');
                      return hidden > 0 ? `${text} e +${hidden}` : text;
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Times Fora da Rotação - exibido logo abaixo dos empates */}
          {teamManagement.removedTeams.length > 0 && (
            <RemovedTeamsCard
              removedTeams={teamManagement.removedTeams}
              allTeams={allTeams}
              onRestoreTeam={handleRestoreTeamToRotation}
            />
          )}

          {/* Botões de Controle */}
          <div className="sm:static fixed bottom-0 left-0 right-0 p-4 pb-10 z-30 sm:bg-transparent bg-gradient-to-t from-background via-background/90 to-transparent sm:from-transparent sm:via-transparent sm:to-transparent">
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {!matchEnded ? (
                <Button
                  onClick={handleEndMatch}
                  size="lg"
                  className="group btn-cta-green w-full sm:w-auto text-base py-6 px-8"
                >
                  <img src={ballIcon} alt="" className="w-5 h-5 mr-1.5 animate-spin-ball" />
                  Encerrar Partida
                </Button>
              ) : (
                <>
                  {/* Botão de cancelar empate - só aparece se foi empate manual */}
                  {wasManualTieEnd && team1Score === team2Score && (
                    <Button
                      onClick={handleCancelTie}
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-warning-yellow text-warning-yellow hover:bg-warning-yellow/20"
                    >
                      <RotateCcw className="w-5 h-5 mr-1.5" />
                      Cancelar Empate
                    </Button>
                  )}
                  
                  {!showTieBreaker && (
                    <Button
                      onClick={handleNextMatch}
                      size="lg"
                      className="w-full sm:w-auto cta-primary"
                    >
                      <ChevronRight className="w-5 h-5 mr-1.5" />
                      Próxima Partida
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mini stats card - Partidas e Empates */}
          {(totalGames > 0 || totalTies > 0) && (
            <div className="flex justify-center mb-6">
              <Card className="w-full sm:w-auto sm:max-w-md backdrop-blur-md border-border/50 bg-card/60 rounded-2xl overflow-hidden">
                <CardContent className="py-5 px-8">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <span className="font-semibold text-sm text-muted-foreground">Partidas</span>
                      <div className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">{totalGames}</div>
                    </div>
                    <div className="h-16 w-px bg-border/60" />
                    <div className="text-center">
                      <span className="font-semibold text-sm text-muted-foreground">Empates</span>
                      <div className="text-5xl sm:text-6xl font-bold text-warning-yellow tabular-nums">{totalTies}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {/* Ranking de Artilharia e Assistências */}
            {(Object.keys(totalPlayerGoals).filter(name => totalPlayerGoals[name] > 0).length > 0 ||
              Object.keys(totalPlayerAssists).filter(name => totalPlayerAssists[name] > 0).length > 0) && (
              <Card className="backdrop-blur-md border-border/50 bg-card/60 rounded-3xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <img src={chuteiraIcon} alt="" className="w-5 h-5" />
                      <span className="text-foreground">Artilharia e Assistências</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-primary hover:text-white"
                      onClick={() => {
                        // Combine goals and assists for all players
                        const allPlayers = new Set([
                          ...Object.keys(totalPlayerGoals),
                          ...Object.keys(totalPlayerAssists)
                        ]);
                        
                        const playerStats = Array.from(allPlayers).map(name => ({
                          name,
                          goals: totalPlayerGoals[name] || 0,
                          assists: totalPlayerAssists[name] || 0
                        })).filter(p => p.goals > 0 || p.assists > 0)
                          .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
                        
                        const artilhariaList = playerStats
                          .map((p, idx) => {
                            let stats = `⚽ ${p.goals}`;
                            if (p.assists > 0) stats += ` 🅰️ ${p.assists}`;
                            return `${idx + 1}º ${p.name} - ${stats}`;
                          })
                          .join('\n');
                        const text = `🎯 *ARTILHARIA E ASSISTÊNCIAS*\n\n${artilhariaList}`;
                        navigator.clipboard.writeText(text);
                        toast.success("Estatísticas copiadas!");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {(() => {
                      // Combine goals and assists for all players
                      const allPlayers = new Set([
                        ...Object.keys(totalPlayerGoals),
                        ...Object.keys(totalPlayerAssists)
                      ]);
                      
                      const playerStats = Array.from(allPlayers).map(name => ({
                        name,
                        goals: totalPlayerGoals[name] || 0,
                        assists: totalPlayerAssists[name] || 0
                      })).filter(p => p.goals > 0 || p.assists > 0)
                        .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
                      
                      return playerStats.map((player, idx) => (
                        <div key={player.name} className={`flex items-center justify-between py-2 px-3 rounded-lg ${idx === 0 ? 'bg-primary/20' : 'bg-muted/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-muted-foreground'}`}>
                              {idx + 1}º
                            </span>
                            <span className={`font-medium ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                              {player.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                              <img src={idx === 0 ? bolaVerde : ballIcon} alt="" className="w-4 h-4" />
                              {player.goals}
                            </span>
                            {player.assists > 0 && (
                              <span className={`flex items-center gap-1 text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                                <img src={idx === 0 ? assistenciaVerde : assistenciaBranco} alt="" className="w-4 h-4" />
                                {player.assists}
                              </span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranking de Vitórias/Pontuação por Time */}
            {(Object.keys(teamWins).filter(id => teamWins[Number(id)] > 0).length > 0 || 
              Object.keys(teamTies).filter(id => teamTies[Number(id)] > 0).length > 0) && (
              <Card className="backdrop-blur-md border-border/50 bg-card/60 rounded-3xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <img src={trofeuIcon} alt="" className="w-5 h-5" />
                      <span className="text-foreground">{showPoints ? 'Pontuação' : 'Vitórias por Time'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Switch 
                          checked={showPoints} 
                          onCheckedChange={setShowPoints}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground">Pts</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-primary hover:text-white"
                        onClick={() => {
                          if (showPoints) {
                            // Calculate points using REAL losses data for all teams
                            const allTeamIds = allTeams.map(t => t.id);
                            const teamsWithStats = allTeamIds.map(teamId => {
                              const wins = teamWins[teamId] || 0;
                              const ties = teamTies[teamId] || 0;
                              const losses = teamLosses[teamId] || 0;
                              return {
                                teamId,
                                wins,
                                ties,
                                losses,
                                points: (wins * 3) + ties
                              };
                            }).sort((a, b) => {
                              if (b.points !== a.points) return b.points - a.points;
                              if (b.wins !== a.wins) return b.wins - a.wins;
                              if (b.ties !== a.ties) return b.ties - a.ties;
                              return a.losses - b.losses;
                            });
                            
                            const pontuacaoList = teamsWithStats
                              .map((t, idx) => `${idx + 1}º *Time ${t.teamId}* - V: *${t.wins}* | E: *${t.ties}* | D: *${t.losses}* | *${t.points}* pts`)
                              .join('\n');
                            const text = `⭐ *PONTUAÇÃO POR TIME*\n\n${pontuacaoList}`;
                            navigator.clipboard.writeText(text);
                            toast.success("Pontuação copiada!");
                          } else {
                            const vitoriasList = Object.entries(teamWins)
                              .filter(([_, wins]) => wins > 0)
                              .sort((a, b) => b[1] - a[1])
                              .map(([teamId, wins], idx) => `${idx + 1}º *Time ${teamId}* - 🏆 *${wins}*`)
                              .join('\n');
                            const text = `🏆 *VITÓRIAS POR TIME*\n\n${vitoriasList}`;
                            navigator.clipboard.writeText(text);
                            toast.success("Vitórias copiadas!");
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {showPoints ? (
                      // Points view - using real stats and showing ALL teams
                      (() => {
                        // Get all team IDs from allTeams (not just those with wins/ties)
                        const allTeamIds = allTeams.map(t => t.id);
                        
                        // Calculate stats for each team using REAL data
                        const teamsWithStats = allTeamIds.map(teamId => {
                          const wins = teamWins[teamId] || 0;
                          const ties = teamTies[teamId] || 0;
                          const losses = teamLosses[teamId] || 0;
                          
                          return {
                            teamId,
                            wins,
                            ties,
                            losses,
                            points: (wins * 3) + ties
                          };
                        }).sort((a, b) => {
                          // Sort by points, then wins, then ties, then least losses
                          if (b.points !== a.points) return b.points - a.points;
                          if (b.wins !== a.wins) return b.wins - a.wins;
                          if (b.ties !== a.ties) return b.ties - a.ties;
                          return a.losses - b.losses;
                        });
                        
                        return (
                          <>
                            {/* Header row */}
                            <div className="flex items-center justify-between py-1.5 px-3 text-xs text-muted-foreground font-semibold border-b border-border/30 mb-2">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="w-6 sm:w-8">#</span>
                                <span>Time</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-3">
                                <span className="w-6 sm:w-8 text-center">V</span>
                                <span className="w-6 sm:w-8 text-center">E</span>
                                <span className="w-6 sm:w-8 text-center">D</span>
                                <span className="w-8 sm:w-10 text-center">Pts</span>
                              </div>
                            </div>
                            {teamsWithStats.map((team, idx) => (
                              <div key={team.teamId} className={`flex items-center justify-between py-2 px-3 rounded-lg ${idx === 0 ? 'bg-primary/20' : 'bg-muted/30'}`}>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className={`text-xs sm:text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-muted-foreground'}`}>
                                    {idx + 1}º
                                  </span>
                                  <div className="flex items-center gap-1 sm:gap-1.5">
                                    <img src={idx === 0 ? teamShield : teamShieldWhite} alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className={`text-xs sm:text-sm font-medium ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                                      <span className="sm:hidden">T{team.teamId}</span>
                                      <span className="hidden sm:inline">Time {team.teamId}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-3">
                                  <span className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                                    <Trophy className={`w-3 h-3 sm:w-4 sm:h-4 ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : ''}`} />
                                    {team.wins}
                                  </span>
                                  <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-warning-yellow">
                                    🤝 {team.ties}
                                  </span>
                                  <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-[#FD628C]">
                                    ❌ {team.losses}
                                  </span>
                                  <span className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                                    <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : ''}`} />
                                    {team.points}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </>
                        );
                      })()
                    ) : (
                      // Wins only view (existing)
                      Object.entries(teamWins)
                        .filter(([_, wins]) => wins > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([teamId, wins], idx) => (
                          <div key={teamId} className={`flex items-center justify-between py-2 px-3 rounded-lg ${idx === 0 ? 'bg-primary/20' : 'bg-muted/30'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-muted-foreground'}`}>
                                {idx + 1}º
                              </span>
                              <div className="flex items-center gap-1.5">
                                <img src={idx === 0 ? teamShield : teamShieldWhite} alt="" className="w-4 h-4" />
                                <span className={`font-medium ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                                  Time {teamId}
                                </span>
                              </div>
                            </div>
                            <span className={`flex items-center gap-1.5 text-sm font-bold ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : 'text-foreground'}`}>
                              <Trophy className={`w-4 h-4 ${idx === 0 ? 'text-[hsl(142_70%_60%)]' : ''}`} />
                              {wins}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Gráfico de Desempenho por Time - baseado em pontos */}
          {(Object.keys(teamWins).some(id => teamWins[Number(id)] > 0) || 
            Object.keys(teamTies).some(id => teamTies[Number(id)] > 0) ||
            Object.keys(teamLosses).some(id => teamLosses[Number(id)] > 0)) && (
            <Card className="backdrop-blur-md border-border/50 bg-card/60 rounded-3xl mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Desempenho dos Times</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pl-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={allTeams.map(t => {
                      const wins = teamWins[t.id] || 0;
                      const ties = teamTies[t.id] || 0;
                      const losses = teamLosses[t.id] || 0;
                      const games = wins + ties + losses;
                      const points = (wins * 3) + ties;
                      return {
                        team: `T${t.id}`,
                        teamId: t.id,
                        wins,
                        ties,
                        losses,
                        games,
                        points
                      };
                    }).filter(t => t.games > 0)}
                    margin={{ left: 8, right: 16 }}
                  >
                    <XAxis dataKey="team" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-bold text-foreground mb-2">Time {data.teamId}</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-muted-foreground">Jogos:</span> <span className="font-semibold">{data.games}</span></p>
                              <p><span className="text-[#21C45D]">🏆 Vitórias:</span> <span className="font-semibold">{data.wins}</span></p>
                              <p><span className="text-warning-yellow">🤝 Empates:</span> <span className="font-semibold">{data.ties}</span></p>
                              <p><span className="text-[#FD628C]">❌ Derrotas:</span> <span className="font-semibold">{data.losses}</span></p>
                              <p className="pt-1 border-t border-border mt-1"><span className="text-muted-foreground">⭐ Pontos:</span> <span className="font-bold text-primary">{data.points}</span></p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                      {allTeams.map(t => {
                        const games = (teamWins[t.id] || 0) + (teamTies[t.id] || 0) + (teamLosses[t.id] || 0);
                        return games > 0 ? t : null;
                      }).filter(Boolean).map((_, index) => {
                        const colors = [
                          'hsl(142 70% 45%)',   // green
                          'hsl(217 91% 60%)',   // blue
                          'hsl(280 65% 60%)',   // purple
                          'hsl(25 95% 55%)',    // orange
                          'hsl(340 75% 55%)',   // pink
                          'hsl(180 60% 45%)',   // teal
                          'hsl(45 93% 50%)',    // yellow
                          'hsl(0 72% 55%)',     // red
                        ];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tie Breaker Dialog - Modal for all devices - MANDATORY (no close button, no outside click, no ESC) */}
          <Dialog open={showTieBreaker && !!tieBreakerPair}>
            <DialogContent 
              className="bg-card border-warning-yellow/50 max-w-md"
              hideClose
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl text-warning-yellow">
                  <HelpCircle className="w-6 h-6" />
                  Desempate
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Os times {tieBreakerPair && allTeams[tieBreakerPair.team1Index].id} e {tieBreakerPair && allTeams[tieBreakerPair.team2Index].id} empataram. Escolha quem avança.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Par ou Ímpar Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Dices className="w-4 h-4" />
                    <span>Par ou Ímpar</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quem venceu no par ou ímpar?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => tieBreakerPair && handleTieBreakerWinner(tieBreakerPair.team1Index, 'par-impar')}
                      className="flex-1 bg-muted/50 hover:bg-muted text-foreground border border-border/50"
                    >
                      Time {tieBreakerPair && allTeams[tieBreakerPair.team1Index].id}
                    </Button>
                    <Button
                      onClick={() => tieBreakerPair && handleTieBreakerWinner(tieBreakerPair.team2Index, 'par-impar')}
                      className="flex-1 bg-muted/50 hover:bg-muted text-foreground border border-border/50"
                    >
                      Time {tieBreakerPair && allTeams[tieBreakerPair.team2Index].id}
                    </Button>
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground uppercase">ou</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Sortear Aleatoriamente */}
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      if (!tieBreakerPair) return;
                      const randomWinner = Math.random() < 0.5 ? tieBreakerPair.team1Index : tieBreakerPair.team2Index;
                      handleTieBreakerWinner(randomWinner, 'sorteio');
                    }}
                    className="w-full bg-warning-yellow hover:bg-warning-yellow/90 text-background"
                  >
                    <UsersRound className="w-4 h-4 mr-1.5" />
                    Sortear Aleatoriamente
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Goal Modal - ALWAYS SHOW GK OPTION */}
          {showGoalModal && (
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowGoalModal(null);
                }
              }}
            >
              <Card className="w-full max-w-md bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-center text-foreground">Quem fez o gol?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                {(() => {
                    const teamIndex = showGoalModal === 'team1' ? currentTeam1Index : currentTeam2Index;
                    const team = allTeams[teamIndex];
                    // Use the CURRENT goalkeeper (after substitutions) instead of original
                    const currentGkName = teamManagement.getCurrentGoalkeeper(teamIndex);
                    // Fallback: check original team goalkeeper if no override
                    const effectiveGkName = currentGkName || team.goalkeeper?.name || null;
                    // Display label and name for stats
                    const hasNamedGoalkeeper = effectiveGkName && effectiveGkName.trim() !== '' && effectiveGkName.toLowerCase() !== 'goleiro';
                    const gkLabel = hasNamedGoalkeeper ? `${effectiveGkName} (GK)` : 'Goleiro (GK)';
                    const gkNameForStats = hasNamedGoalkeeper ? effectiveGkName : 'Goleiro';
                    
                    return (
                      <>
                        {/* GK option - ALWAYS active, uses real name or generic "Goleiro" */}
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 border-border focus-visible:ring-2 focus-visible:ring-primary text-foreground hover:text-foreground hover:bg-primary/10"
                          onClick={() => handlePlayerGoalStep1(teamIndex, -1, gkNameForStats, 'gk')}
                        >
                          <span className="text-xs text-primary font-semibold px-1.5 py-0.5 bg-primary/20 rounded">GK</span>
                          <span>{gkLabel}</span>
                        </Button>
                        
                        {/* Players - Apply same filtering as team card */}
                        {(() => {
                          const lineLimit = config ? Math.max(0, config.playersPerTeam - 1) : team.players.length;
                          const seen = new Set<string>();
                          const safePlayers = team.players
                            .filter(p => {
                              const key = (p.id ?? p.name).toLowerCase().trim();
                              if (!key) return false;
                              if (seen.has(key)) return false;
                              seen.add(key);
                              return true;
                            })
                            .slice(0, lineLimit);

                          return safePlayers.map((player, idx) => {
                            const playerKey = idx.toString();
                            const expelled = isPlayerExpelled(teamIndex, playerKey);
                            
                            return (
                              <Button
                                key={idx}
                                variant="outline"
                                className={`w-full justify-start text-foreground border-border focus-visible:ring-2 focus-visible:ring-primary ${
                                  expelled 
                                    ? 'opacity-50 cursor-not-allowed bg-destructive/10 border-destructive/30' 
                                    : 'hover:text-foreground hover:bg-primary/10'
                                }`}
                                onClick={() => !expelled && handlePlayerGoalStep1(teamIndex, idx, player.name, 'player')}
                                disabled={expelled}
                              >
                                <span className={expelled ? 'line-through' : ''}>{player.name}</span>
                                {expelled && <span className="ml-1.5 text-xs font-bold text-red-300">EXPULSO</span>}
                              </Button>
                            );
                          });
                        })()}
                      </>
                    );
                  })()}
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
                    onClick={() => setShowGoalModal(null)}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assist Modal - Step 2 after goal scorer selection */}
          {showAssistModal && pendingGoal && (
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAssistModal(false);
                  setPendingGoal(null);
                }
              }}
            >
              <Card className="w-full max-w-md bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-center text-foreground">Quem deu a assistência?</CardTitle>
                  <p className="text-center text-sm text-muted-foreground">
                    Gol de <span className="font-semibold text-primary">{pendingGoal.scorerName}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const teamIndex = pendingGoal.teamIndex;
                    const team = allTeams[teamIndex];
                    const scorerName = pendingGoal.scorerName;
                    
                    // Get all players from the scoring team (excluding the scorer)
                    // Apply same filtering as team card - deduplicate and limit to line players
                    const eligiblePlayers: { name: string; type: 'player' | 'gk' }[] = [];
                    
                    // Add CURRENT GK (after substitutions) if not the scorer (goalkeeper CAN give assists)
                    const currentGk = teamManagement.getCurrentGoalkeeper(teamIndex);
                    if (currentGk && currentGk !== scorerName) {
                      eligiblePlayers.push({ name: currentGk, type: 'gk' });
                    }
                    
                    // Filter players same way as goal modal - only active players on field
                    const lineLimit = config ? Math.max(0, config.playersPerTeam - 1) : team.players.length;
                    const seen = new Set<string>();
                    const safePlayers = team.players
                      .filter(p => {
                        const key = (p.id ?? p.name).toLowerCase().trim();
                        if (!key) return false;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      })
                      .slice(0, lineLimit);
                    
                    // Add filtered players if not the scorer and not expelled
                    safePlayers.forEach((player, idx) => {
                      if (player.name !== scorerName) {
                        const expelled = isPlayerExpelled(teamIndex, idx.toString());
                        if (!expelled) {
                          eligiblePlayers.push({ name: player.name, type: 'player' });
                        }
                      }
                    });
                    
                    return (
                      <>
                        {/* Individual play option - no assist */}
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-foreground hover:text-foreground hover:bg-warning-yellow/10 border-warning-yellow/50 focus-visible:ring-2 focus-visible:ring-warning-yellow"
                          onClick={() => handleAssistSelection(null)}
                        >
                          <span className="text-xs text-warning-yellow font-semibold px-1.5 py-0.5 bg-warning-yellow/20 rounded">⚡</span>
                          <span>Jogada individual (sem assistência)</span>
                        </Button>
                        
                        <div className="h-px bg-border my-3" />
                        
                        {/* Eligible players for assist */}
                        {eligiblePlayers.map((player, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-start gap-2 text-foreground hover:text-foreground hover:bg-primary/10 border-border focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => {
                              // Add GK prefix for goalkeeper assists
                              const assistName = player.type === 'gk' ? `GK ${player.name}` : player.name;
                              handleAssistSelection(assistName);
                            }}
                          >
                            {player.type === 'gk' && (
                              <span className="text-xs text-primary font-semibold px-1.5 py-0.5 bg-primary/20 rounded">GK</span>
                            )}
                            <span>{player.name}</span>
                          </Button>
                        ))}
                      </>
                    );
                  })()}
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
                    onClick={() => {
                      setShowAssistModal(false);
                      setPendingGoal(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Player Modal */}
          {showAddPlayerModal && (
            <AddPlayerModal
              isOpen={true}
              onClose={() => setShowAddPlayerModal(null)}
              teamId={showAddPlayerModal.teamId}
              teamIndex={showAddPlayerModal.teamIndex}
              availablePlayers={teamManagement.getAvailablePlayers(showAddPlayerModal.teamIndex)}
              getPlayerTeam={(playerName) => {
                const team = allTeams.find(t => 
                  t.players.some(p => p.name.toLowerCase().trim() === playerName.toLowerCase().trim())
                );
                return team?.id || null;
              }}
              onAddExistingPlayer={(player) => teamManagement.addExistingPlayerToTeam(showAddPlayerModal.teamIndex, player)}
              onCreateNewPlayer={(name) => teamManagement.createAndAddPlayer(showAddPlayerModal.teamIndex, name)}
            />
          )}

          {/* Goalkeeper Modal */}
          {showGoalkeeperModal && (() => {
            const gkName = teamManagement.getCurrentGoalkeeper(showGoalkeeperModal.teamIndex);
            // Use name-based card functions for goalkeeper
            const gkCards = gkName ? getGoalkeeperCards(gkName, showGoalkeeperModal.teamIndex) : { yellow: 0, red: false };
            const gkExpelled = gkName ? isGoalkeeperExpelled(gkName) : false;
            
            // AJUSTE 2: Determinar o índice e goleiro do oponente para filtragem
            const isPlayingTeam1 = showGoalkeeperModal.teamIndex === currentTeam1Index;
            const isPlayingTeam2 = showGoalkeeperModal.teamIndex === currentTeam2Index;
            const opponentIndex = isPlayingTeam1 ? currentTeam2Index : isPlayingTeam2 ? currentTeam1Index : undefined;
            const opponentGk = opponentIndex !== undefined ? teamManagement.getCurrentGoalkeeper(opponentIndex) : null;
            
            return (
              <GoalkeeperModal
                isOpen={true}
                onClose={() => setShowGoalkeeperModal(null)}
                teamId={showGoalkeeperModal.teamId}
                teamIndex={showGoalkeeperModal.teamIndex}
                opponentTeamIndex={opponentIndex}
                availableGoalkeepers={teamManagement.availableGoalkeepers}
                allGoalkeepers={teamManagement.getAllGoalkeepers()}
                allLinePlayers={contextParsedPlayers ? [...contextParsedPlayers.main, ...contextParsedPlayers.substitutes] : []}
                currentGoalkeeper={gkName}
                opponentGoalkeeper={opponentGk}
                allTeams={allTeams}
                cards={gkCards}
                isExpelled={gkExpelled}
                onGiveYellowCard={() => giveYellowCard(showGoalkeeperModal.teamIndex, 'GK', gkName || 'Goleiro', true)}
                onGiveRedCard={() => giveRedCard(showGoalkeeperModal.teamIndex, 'GK', gkName || 'Goleiro', true)}
                onRemoveYellowCard={() => removeYellowCard(showGoalkeeperModal.teamIndex, 'GK', true, gkName || undefined)}
                onRemoveRedCard={() => removeRedCard(showGoalkeeperModal.teamIndex, 'GK', true, gkName || undefined)}
                onSwapGoalkeepers={
                  // AJUSTE 3: Permitir troca direta apenas se ambos os times tiverem goleiros
                  (gkName && opponentGk && opponentIndex !== undefined)
                    ? () => {
                        const team1Gk = gkName;
                        const team2Gk = opponentGk;
                        const team1Idx = showGoalkeeperModal.teamIndex;
                        const team2Idx = opponentIndex;
                        
                        teamManagement.setCurrentGoalkeepers(prev => ({
                          ...prev,
                          [team1Idx]: team2Gk,
                          [team2Idx]: team1Gk,
                        }));
                        
                        toast.success(`Goleiros trocados: ${team1Gk} ↔ ${team2Gk}`);
                        requestSave();
                        setShowGoalkeeperModal(null);
                      }
                    : undefined
                }
                onSelectGoalkeeper={(name) => {
                  const selectedTeamIndex = showGoalkeeperModal.teamIndex;
                  
                  // Determine if one of the playing teams
                  const isTeam1 = selectedTeamIndex === currentTeam1Index;
                  const isTeam2 = selectedTeamIndex === currentTeam2Index;
                  
                  // ATOMIC UPDATE: Build the final state in one operation
                  teamManagement.setCurrentGoalkeepers(prev => {
                    const next = { ...prev };
                    
                    // 1. Find and handle the opponent conflict for playing teams
                    if (isTeam1 || isTeam2) {
                      const opponentIndex = isTeam1 ? currentTeam2Index : currentTeam1Index;
                      
                      // Get effective opponent GK (considering prev state)
                      const getEffectiveGk = (idx: number): string | null => {
                        if (idx in prev) {
                          const val = prev[idx];
                          return val && val.trim() !== '' ? val : null;
                        }
                        return allTeams[idx]?.goalkeeper?.name || null;
                      };
                      
                      const opponentGk = getEffectiveGk(opponentIndex);
                      
                      // If opponent has the same goalkeeper, we need to resolve conflict
                      if (opponentGk === name) {
                        // Find an alternative goalkeeper for the opponent
                        const allGks = teamManagement.getAllGoalkeepers();
                        const availableGks = teamManagement.availableGoalkeepers;
                        const originalOpponentGk = allTeams[opponentIndex]?.goalkeeper?.name;
                        
                        // Build list of candidates (excluding the one being selected)
                        const candidates: string[] = [];
                        
                        // 1. Original goalkeeper of opponent team (if different from selected)
                        if (originalOpponentGk && originalOpponentGk !== name) {
                          candidates.push(originalOpponentGk);
                        }
                        
                        // 2. Registered goalkeepers (excluding selected)
                        for (const gk of allGks) {
                          if (gk.name !== name && !candidates.includes(gk.name)) {
                            candidates.push(gk.name);
                          }
                        }
                        
                        // 3. Available goalkeepers
                        for (const gk of availableGks) {
                          if (gk.name !== name && !candidates.includes(gk.name)) {
                            candidates.push(gk.name);
                          }
                        }
                        
                        // Find first candidate not in use by either playing team
                        let substituteGk: string | null = null;
                        for (const candidate of candidates) {
                          // After this operation: selected team will have 'name', so check only other teams
                          let inUseByOther = false;
                          for (let i = 0; i < allTeams.length; i++) {
                            if (i === selectedTeamIndex) continue; // Will have the new GK
                            if (i === opponentIndex) continue; // We're reassigning this one
                            
                            const gkForTeam = getEffectiveGk(i);
                            if (gkForTeam === candidate) {
                              inUseByOther = true;
                              break;
                            }
                          }
                          if (!inUseByOther) {
                            substituteGk = candidate;
                            break;
                          }
                        }
                        
                        if (substituteGk) {
                          next[opponentIndex] = substituteGk;
                          toast.info(`Time ${allTeams[opponentIndex]?.id} agora tem ${substituteGk} no gol`);
                        } else {
                          // No substitute available - opponent loses goalkeeper
                          next[opponentIndex] = null as any;
                          toast.info(`Time ${allTeams[opponentIndex]?.id} ficou sem goleiro`);
                        }
                      }
                    }
                    
                    // 2. Remove this goalkeeper from any other team that has it
                    for (const keyStr of Object.keys(next)) {
                      const idx = Number(keyStr);
                      if (idx !== selectedTeamIndex && next[idx] === name) {
                        next[idx] = null as any;
                      }
                    }
                    
                    // Also check original team goalkeepers
                    for (let i = 0; i < allTeams.length; i++) {
                      if (i !== selectedTeamIndex && !(i in next)) {
                        if (allTeams[i]?.goalkeeper?.name === name) {
                          next[i] = null as any;
                        }
                      }
                    }
                    
                    // 3. Assign to selected team
                    next[selectedTeamIndex] = name;
                    
                    return next;
                  });
                  
                  // Remove from available if was there
                  teamManagement.setAvailableGoalkeepers(prev => prev.filter(g => g.name !== name));
                  
                  // Verificar se é um goleiro novo (não registrado) e registrar no banco
                  const allGks = teamManagement.getAllGoalkeepers();
                  const allLinePlayers = contextParsedPlayers 
                    ? [...contextParsedPlayers.main, ...contextParsedPlayers.substitutes]
                    : [];
                  const isRegisteredGk = allGks.some(g => g.name.toLowerCase() === name.toLowerCase());
                  const isLinePlayer = allLinePlayers.some(p => p.name.toLowerCase() === name.toLowerCase());
                  
                  // Se não é goleiro registrado e não é jogador de linha, é uma pessoa nova -> registrar como goleiro
                  if (!isRegisteredGk && !isLinePlayer) {
                    teamManagement.createAndRegisterGoalkeeper(name);
                    // Update local state immediately so goalkeeper appears in lists
                    addGoalkeeperToState(name);
                  } else if (isLinePlayer && !isRegisteredGk) {
                    // If it's a line player being promoted to goalkeeper, also update state
                    teamManagement.createAndRegisterGoalkeeper(name);
                    addGoalkeeperToState(name);
                  }
                  
                  const team = allTeams[selectedTeamIndex];
                  toast.success(`${name} agora é goleiro do Time ${team.id}`);
                  
                  requestSave();
                  setShowGoalkeeperModal(null);
                }}
              />
            );
          })()}

          {/* Replace Player Modal */}
          {showReplacePlayerModal && (
            <ReplacePlayerModal
              isOpen={true}
              onClose={() => setShowReplacePlayerModal(null)}
              teamId={showReplacePlayerModal.teamId}
              playerName={showReplacePlayerModal.playerName}
              playerIndex={showReplacePlayerModal.playerIndex}
              availablePlayers={teamManagement.getAvailablePlayers(showReplacePlayerModal.teamIndex)}
              availableGoalkeepersForLine={teamManagement.getGoalkeepersForLinePlay(showReplacePlayerModal.teamIndex)}
              getPlayerTeam={(playerName) => {
                const team = allTeams.find(t => 
                  t.players.some(p => p.name.toLowerCase().trim() === playerName.toLowerCase().trim())
                );
                return team?.id || null;
              }}
              onReplaceWithExisting={(player) => teamManagement.replacePlayer(
                showReplacePlayerModal.teamIndex,
                showReplacePlayerModal.playerIndex,
                player.name,
                false
              )}
              onReplaceWithNew={(name) => teamManagement.replacePlayer(
                showReplacePlayerModal.teamIndex,
                showReplacePlayerModal.playerIndex,
                name,
                true
              )}
              onGiveYellowCard={() => giveYellowCard(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString(), showReplacePlayerModal.playerName)}
              onGiveRedCard={() => giveRedCard(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString(), showReplacePlayerModal.playerName)}
              onRemoveYellowCard={() => removeYellowCard(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString())}
              onRemoveRedCard={() => removeRedCard(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString())}
              isExpelled={isPlayerExpelled(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString())}
              cards={getPlayerCards(showReplacePlayerModal.teamIndex, showReplacePlayerModal.playerIndex.toString())}
            />
          )}

          {/* Removed Teams Card is now shown after tied pairs section */}
        </main>

        <Footer />
      </div>
      
      <audio ref={whistleAudioRef} src={whistleSound} preload="auto" />
      <audio ref={goalAudioRef} src={goalSound} preload="auto" />
    </div>
  );
};

export default Game;
