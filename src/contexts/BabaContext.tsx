import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

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

interface Player {
  id?: string;
  name: string;
  isGoalkeeper: boolean;
  originalTeam: number;
  isBorrowed: boolean;
  isSeed: boolean;
  seedLevel?: number;
  goals?: number;
}

interface Team {
  id?: string;
  teamNumber: number;
  players: Player[];
  goalkeeper: Player | null;
  isComplete: boolean;
  totalWins?: number;
}

interface GameConfig {
  fieldType: string;
  playersPerTeam: number;
  gameDuration: number;
  winCriteria: string;
  team1ChoosesShirt: boolean;
}

interface GoalHistoryEntry {
  scorerName: string;
  scorerType: 'player' | 'gk';
  playerId?: string;
}

interface TiedPair {
  team1Index: number;
  team2Index: number;
}

interface RemovedTeam {
  teamIndex: number;
  removalType: 'temporary' | 'permanent';
}

interface AvailableGoalkeeper {
  name: string;
  originalTeamIndex: number;
  playerId?: string;
}

interface Baba {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  setupStatus?: 'import' | 'config' | 'teams' | 'game';
  fieldType: string;
  playersPerTeam: number;
  gameDuration: number;
  winCriteria: string;
  currentTeam1Index: number;
  currentTeam2Index: number;
  rotationQueue: number[];
  timeLeft: number | null;
  team1Score: number;
  team2Score: number;
  matchEnded: boolean;
  isRunning: boolean;
  createdAt: string;
  updatedAt: string;
  rawPlayerList?: string | null;
  totalGames: number;
  totalTies: number;
  playerGoals: Record<string, number>;
  playerAssists?: Record<string, number>;
  teamWins: Record<number, number>;
  teamTies: Record<number, number>;
  teamLosses: Record<number, number>;
  goalHistory: { team1: GoalHistoryEntry[]; team2: GoalHistoryEntry[] };
  // Tie-breaker state
  tiedPairs: TiedPair[];
  showTieBreaker: boolean;
  tieBreakerPair: TiedPair | null;
  waitingWinner: number | null;
  // Match cards state
  matchCards?: Record<string, { yellow: number; red: boolean }>;
  // Team management state
  removedTeams?: RemovedTeam[];
  availableGoalkeepers?: AvailableGoalkeeper[];
  currentGoalkeepers?: Record<number, string>;
}

interface UpdateResult {
  success: boolean;
  conflict?: boolean;
}

interface BabaContextType {
  currentBaba: Baba | null;
  babas: Baba[];
  loading: boolean;
  hydrated: boolean;
  parsedPlayers: ParsedPlayers | null;
  config: GameConfig | null;
  teams: Team[];
  queue: string[];
  rawPlayerList: string | null;

  // Actions
  setParsedPlayers: (players: ParsedPlayers | null) => void;
  setConfig: (config: GameConfig | null) => void;
  setTeams: (teams: Team[]) => void;
  setQueue: (queue: string[]) => void;
  setRawPlayerList: (list: string | null) => void;

  createBaba: (name: string, config: GameConfig) => Promise<string | null>;
  startNewBabaDraft: () => Promise<string | null>;
  loadBaba: (babaId: string) => Promise<{ baba: Baba; teams: Team[]; parsedPlayers: ParsedPlayers | null } | null>;
  updateBaba: (updates: Partial<Baba>) => Promise<UpdateResult>;
  deleteBaba: (babaId: string) => Promise<{ wasActive: boolean }>;
  savePlayers: (babaId: string, players: ParsedPlayers, rawList?: string) => Promise<void>;
  saveTeams: (babaId: string, teams: Team[]) => Promise<void>;
  loadBabas: () => Promise<void>;
  clearCurrentBaba: () => void;
  addGoalkeeperToState: (name: string) => void;
}

const noopAsync = async () => {};

const defaultBabaContext: BabaContextType = {
  currentBaba: null,
  babas: [],
  loading: false,
  hydrated: false,
  parsedPlayers: null,
  config: null,
  teams: [],
  queue: [],
  rawPlayerList: null,

  setParsedPlayers: () => {},
  setConfig: () => {},
  setTeams: () => {},
  setQueue: () => {},
  setRawPlayerList: () => {},

  createBaba: async () => null,
  startNewBabaDraft: async () => null,
  loadBaba: async () => null,
  updateBaba: async () => ({ success: false }),
  deleteBaba: async () => ({ wasActive: false }),
  savePlayers: async () => {},
  saveTeams: async () => {},
  loadBabas: async () => {},
  clearCurrentBaba: () => {
    // safe no-op when provider is not mounted
    localStorage.removeItem('currentBabaId');
    localStorage.removeItem('shouldGenerateTeams');
    localStorage.removeItem('babaConfig');
    localStorage.removeItem('babaPlayers');
    localStorage.removeItem('draftRawPlayerList');
  },
  addGoalkeeperToState: () => {},
};

const BabaContext = createContext<BabaContextType>(defaultBabaContext);

export const useBaba = () => useContext(BabaContext);

interface BabaProviderProps {
  children: ReactNode;
}

export const BabaProvider = ({ children }: BabaProviderProps) => {
  const { user } = useAuth();
  const [currentBaba, setCurrentBaba] = useState<Baba | null>(null);
  const [babas, setBabas] = useState<Baba[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayers | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [rawPlayerList, setRawPlayerList] = useState<string | null>(null);

  // Ref to always have the latest currentBaba (avoids stale closures in updateBaba)
  const currentBabaRef = useRef<Baba | null>(null);
  
  // Update ref whenever currentBaba changes
  useEffect(() => {
    currentBabaRef.current = currentBaba;
  }, [currentBaba]);

  // Serial queue for database updates to prevent race conditions
  const updateQueueRef = useRef<Promise<UpdateResult>>(Promise.resolve({ success: true }));

  const loadBabas = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('babas')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedBabas: Baba[] = (data || []).map(b => ({
        id: b.id,
        name: b.name,
        status: b.status as 'active' | 'completed' | 'paused',
        setupStatus: (b.setup_status as 'import' | 'config' | 'teams' | 'game') ?? 'import',
        fieldType: b.field_type,
        playersPerTeam: b.players_per_team,
        gameDuration: b.game_duration,
        winCriteria: b.win_criteria,
        currentTeam1Index: b.current_team1_index ?? 0,
        currentTeam2Index: b.current_team2_index ?? 1,
        rotationQueue: (b.rotation_queue as number[]) || [],
        timeLeft: b.time_left,
        team1Score: b.team1_score ?? 0,
        team2Score: b.team2_score ?? 0,
        matchEnded: b.match_ended ?? false,
        isRunning: b.is_running ?? false,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        rawPlayerList: b.raw_player_list,
        totalGames: (b as any).total_games ?? 0,
        totalTies: (b as any).total_ties ?? 0,
        playerGoals: (b as any).player_goals ?? {},
        playerAssists: (b as any).player_assists ?? {},
        teamWins: (b as any).team_wins ?? {},
        teamTies: (b as any).team_ties ?? {},
        teamLosses: (b as any).team_losses ?? {},
        goalHistory: (b as any).goal_history ?? { team1: [], team2: [] },
        tiedPairs: (b as any).tied_pairs ?? [],
        showTieBreaker: (b as any).show_tie_breaker ?? false,
        tieBreakerPair: (b as any).tie_breaker_pair ?? null,
        waitingWinner: (b as any).waiting_winner ?? null,
        matchCards: (b as any).match_cards ?? {},
        removedTeams: (b as any).removed_teams ?? [],
        availableGoalkeepers: (b as any).available_goalkeepers ?? [],
        currentGoalkeepers: (b as any).current_goalkeepers ?? {},
      }));

      setBabas(formattedBabas);
    } catch (error) {
      console.error('Error loading babas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-restore currentBaba from localStorage on app start/refresh
  useEffect(() => {
    if (!user) {
      setBabas([]);
      setCurrentBaba(null);
      setHydrated(false);
      return;
    }

    loadBabas();
    
    const savedBabaId = localStorage.getItem('currentBabaId');
    if (savedBabaId && !currentBaba) {
      // Restore the baba that was active before refresh
      (async () => {
        setLoading(true);
        setHydrated(false);
        try {
        const { data: babaData, error: babaError } = await supabase
            .from('babas')
            .select('*')
            .eq('id', savedBabaId)
            .maybeSingle();

          if (babaError || !babaData) {
            console.warn('Baba não encontrado ou erro, limpando referência:', babaError);
            localStorage.removeItem('currentBabaId');
            localStorage.removeItem('draftRawPlayerList');
            setHydrated(true);
            return;
          }

          const baba: Baba = {
            id: babaData.id,
            name: babaData.name,
            status: babaData.status as 'active' | 'completed' | 'paused',
            setupStatus: (babaData.setup_status as 'import' | 'config' | 'teams' | 'game') ?? 'import',
            fieldType: babaData.field_type,
            playersPerTeam: babaData.players_per_team,
            gameDuration: babaData.game_duration,
            winCriteria: babaData.win_criteria,
            currentTeam1Index: babaData.current_team1_index ?? 0,
            currentTeam2Index: babaData.current_team2_index ?? 1,
            rotationQueue: (babaData.rotation_queue as number[]) || [],
            timeLeft: babaData.time_left,
            team1Score: babaData.team1_score ?? 0,
            team2Score: babaData.team2_score ?? 0,
            matchEnded: babaData.match_ended ?? false,
            isRunning: babaData.is_running ?? false,
            createdAt: babaData.created_at,
            updatedAt: babaData.updated_at,
            rawPlayerList: babaData.raw_player_list,
            totalGames: (babaData as any).total_games ?? 0,
            totalTies: (babaData as any).total_ties ?? 0,
        playerGoals: (babaData as any).player_goals ?? {},
        playerAssists: (babaData as any).player_assists ?? {},
        teamWins: (babaData as any).team_wins ?? {},
            teamTies: (babaData as any).team_ties ?? {},
            teamLosses: (babaData as any).team_losses ?? {},
            goalHistory: (babaData as any).goal_history ?? { team1: [], team2: [] },
            tiedPairs: (babaData as any).tied_pairs ?? [],
            showTieBreaker: (babaData as any).show_tie_breaker ?? false,
            tieBreakerPair: (babaData as any).tie_breaker_pair ?? null,
            waitingWinner: (babaData as any).waiting_winner ?? null,
            matchCards: (babaData as any).match_cards ?? {},
            removedTeams: (babaData as any).removed_teams ?? [],
            availableGoalkeepers: (babaData as any).available_goalkeepers ?? [],
            currentGoalkeepers: (babaData as any).current_goalkeepers ?? {},
          };

          setCurrentBaba(baba);
          setRawPlayerList(babaData.raw_player_list || null);
          
          const gameConfig: GameConfig = {
            fieldType: baba.fieldType,
            playersPerTeam: baba.playersPerTeam,
            gameDuration: baba.gameDuration,
            winCriteria: baba.winCriteria,
            team1ChoosesShirt: true,
          };
          setConfig(gameConfig);

          // Load players
          const { data: playersData } = await supabase
            .from('baba_players')
            .select('*')
            .eq('baba_id', savedBabaId);

          if (playersData && playersData.length > 0) {
            const main = playersData.filter(p => !p.is_goalkeeper && !p.is_substitute).map(p => ({
              name: p.name,
              isSeed: p.is_seed ?? false,
              seedLevel: p.seed_level ?? 0,
            }));
            const goalkeepers = playersData.filter(p => p.is_goalkeeper).map(p => ({
              name: p.name,
              isSeed: false,
              seedLevel: 0,
            }));
            const substitutes = playersData.filter(p => p.is_substitute).map(p => ({
              name: p.name,
              isSeed: false,
              seedLevel: 0,
            }));
            const parsed = { main, goalkeepers, substitutes };
            setParsedPlayers(parsed);
          }

          // Load teams
          const { data: teamsData } = await supabase
            .from('baba_teams')
            .select(`
              *,
              baba_team_players (
                *,
                baba_players (*)
              )
            `)
            .eq('baba_id', savedBabaId)
            .order('team_number');

          if (teamsData && teamsData.length > 0) {
            const loadedTeams: Team[] = teamsData.map(t => {
              const teamPlayers = t.baba_team_players || [];
              // Sort by position to maintain player slot order after refresh
              const sortedPlayers = [...teamPlayers].sort((a: any, b: any) => 
                (a.position ?? 0) - (b.position ?? 0)
              );
              return {
                id: t.id,
                teamNumber: t.team_number,
                players: sortedPlayers.map((tp: any) => ({
                  id: tp.baba_players?.id,
                  name: tp.baba_players?.name || '',
                  isGoalkeeper: false,
                  originalTeam: t.team_number,
                  isBorrowed: tp.is_borrowed ?? false,
                  isSeed: tp.baba_players?.is_seed ?? false,
                  seedLevel: tp.baba_players?.seed_level ?? 0,
                })),
                goalkeeper: t.goalkeeper_id ? {
                  id: t.goalkeeper_id,
                  name: playersData?.find(p => p.id === t.goalkeeper_id)?.name || '',
                  isGoalkeeper: true,
                  originalTeam: t.team_number,
                  isBorrowed: false,
                  isSeed: false,
                } : null,
                isComplete: t.is_complete ?? false,
                totalWins: t.total_wins ?? 0,
              };
            });
            setTeams(loadedTeams);
          }
          
          // Mark as hydrated after all data is loaded
          setHydrated(true);
        } catch (error) {
          console.error('Error restoring baba:', error);
          localStorage.removeItem('currentBabaId');
          setHydrated(true);
        } finally {
          setLoading(false);
        }
      })();
    } else if (!savedBabaId) {
      // No baba to restore, mark as hydrated
      setHydrated(true);
    }
  }, [user, loadBabas]);

  // Separate effect to avoid infinite loop with loadBaba dependency

  const createBaba = async (name: string, gameConfig: GameConfig): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('babas')
        .insert({
          user_id: user.id,
          name,
          field_type: gameConfig.fieldType,
          players_per_team: gameConfig.playersPerTeam,
          game_duration: gameConfig.gameDuration,
          win_criteria: gameConfig.winCriteria,
          time_left: gameConfig.gameDuration * 60,
          raw_player_list: rawPlayerList,
        })
        .select()
        .single();

      if (error) throw error;

      const newBaba: Baba = {
        id: data.id,
        name: data.name,
        status: data.status as 'active' | 'completed' | 'paused',
        fieldType: data.field_type,
        playersPerTeam: data.players_per_team,
        gameDuration: data.game_duration,
        winCriteria: data.win_criteria,
        currentTeam1Index: data.current_team1_index ?? 0,
        currentTeam2Index: data.current_team2_index ?? 1,
        rotationQueue: (data.rotation_queue as number[]) || [],
        timeLeft: data.time_left,
        team1Score: data.team1_score ?? 0,
        team2Score: data.team2_score ?? 0,
        matchEnded: data.match_ended ?? false,
        isRunning: data.is_running ?? false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        rawPlayerList: data.raw_player_list,
        totalGames: (data as any).total_games ?? 0,
        totalTies: (data as any).total_ties ?? 0,
        playerGoals: (data as any).player_goals ?? {},
        playerAssists: (data as any).player_assists ?? {},
        teamWins: (data as any).team_wins ?? {},
        teamTies: (data as any).team_ties ?? {},
        teamLosses: (data as any).team_losses ?? {},
        goalHistory: (data as any).goal_history ?? { team1: [], team2: [] },
        tiedPairs: (data as any).tied_pairs ?? [],
        showTieBreaker: (data as any).show_tie_breaker ?? false,
        tieBreakerPair: (data as any).tie_breaker_pair ?? null,
        waitingWinner: (data as any).waiting_winner ?? null,
        removedTeams: (data as any).removed_teams ?? [],
        availableGoalkeepers: (data as any).available_goalkeepers ?? [],
        currentGoalkeepers: (data as any).current_goalkeepers ?? {},
      };

      setCurrentBaba(newBaba);
      localStorage.setItem('currentBabaId', newBaba.id);
      await loadBabas();
      return data.id;
    } catch (error) {
      console.error('Error creating baba:', error);
      toast.error('Erro ao criar o baba');
      return null;
    }
  };

  // Create a draft baba immediately so data can be persisted from ImportList onwards
  const startNewBabaDraft = async (): Promise<string | null> => {
    if (!user) return null;

    // Clear previous state first
    setParsedPlayers(null);
    setConfig(null);
    setTeams([]);
    setQueue([]);
    setRawPlayerList(null);
    setCurrentBaba(null);
    localStorage.removeItem('currentBabaId');
    localStorage.removeItem('shouldGenerateTeams');
    localStorage.removeItem('babaConfig');
    localStorage.removeItem('babaPlayers');
    localStorage.removeItem('draftRawPlayerList');

    try {
      const now = new Date();
      const defaultName = `Baba ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      
      const { data, error } = await supabase
        .from('babas')
        .insert({
          user_id: user.id,
          name: defaultName,
          field_type: 'quadra',
          players_per_team: 5,
          game_duration: 7,
          win_criteria: 'time-or-2',
          time_left: 7 * 60,
          setup_status: 'import',
        })
        .select()
        .single();

      if (error) throw error;

      const newBaba: Baba = {
        id: data.id,
        name: data.name,
        status: data.status as 'active' | 'completed' | 'paused',
        setupStatus: (data.setup_status as 'import' | 'config' | 'teams' | 'game') ?? 'import',
        fieldType: data.field_type,
        playersPerTeam: data.players_per_team,
        gameDuration: data.game_duration,
        winCriteria: data.win_criteria,
        currentTeam1Index: data.current_team1_index ?? 0,
        currentTeam2Index: data.current_team2_index ?? 1,
        rotationQueue: (data.rotation_queue as number[]) || [],
        timeLeft: data.time_left,
        team1Score: data.team1_score ?? 0,
        team2Score: data.team2_score ?? 0,
        matchEnded: data.match_ended ?? false,
        isRunning: data.is_running ?? false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        rawPlayerList: data.raw_player_list,
        totalGames: (data as any).total_games ?? 0,
        totalTies: (data as any).total_ties ?? 0,
        playerGoals: (data as any).player_goals ?? {},
        playerAssists: (data as any).player_assists ?? {},
        teamWins: (data as any).team_wins ?? {},
        teamTies: (data as any).team_ties ?? {},
        teamLosses: (data as any).team_losses ?? {},
        goalHistory: (data as any).goal_history ?? { team1: [], team2: [] },
        tiedPairs: (data as any).tied_pairs ?? [],
        showTieBreaker: (data as any).show_tie_breaker ?? false,
        tieBreakerPair: (data as any).tie_breaker_pair ?? null,
        waitingWinner: (data as any).waiting_winner ?? null,
        matchCards: (data as any).match_cards ?? {},
        removedTeams: (data as any).removed_teams ?? [],
        availableGoalkeepers: (data as any).available_goalkeepers ?? [],
        currentGoalkeepers: (data as any).current_goalkeepers ?? {},
      };

      setCurrentBaba(newBaba);
      localStorage.setItem('currentBabaId', newBaba.id);
      setHydrated(true);
      await loadBabas();
      
      console.log('Draft baba created:', newBaba.id);
      return data.id;
    } catch (error) {
      console.error('Error creating draft baba:', error);
      toast.error('Erro ao iniciar novo baba');
      return null;
    }
  };

  const loadBaba = async (babaId: string): Promise<{ baba: Baba; teams: Team[]; parsedPlayers: ParsedPlayers | null } | null> => {
    if (!user) return null;

    setLoading(true);
    setHydrated(false); // Mark as not hydrated during load
    
    // Clear state to prevent data leakage between babas (but keep currentBabaId in localStorage)
    setParsedPlayers(null);
    setConfig(null);
    setTeams([]);
    setQueue([]);
    setRawPlayerList(null);
    setCurrentBaba(null);

    try {
      const { data: babaData, error: babaError } = await supabase
        .from('babas')
        .select('*')
        .eq('id', babaId)
        .maybeSingle();

      if (babaError) throw babaError;
      if (!babaData) {
        console.warn('loadBaba: Baba não encontrado no banco:', babaId);
        localStorage.removeItem('currentBabaId');
        setHydrated(true);
        return null;
      }

      const baba: Baba = {
        id: babaData.id,
        name: babaData.name,
        status: babaData.status as 'active' | 'completed' | 'paused',
        setupStatus: (babaData.setup_status as 'import' | 'config' | 'teams' | 'game') ?? 'import',
        fieldType: babaData.field_type,
        playersPerTeam: babaData.players_per_team,
        gameDuration: babaData.game_duration,
        winCriteria: babaData.win_criteria,
        currentTeam1Index: babaData.current_team1_index ?? 0,
        currentTeam2Index: babaData.current_team2_index ?? 1,
        rotationQueue: (babaData.rotation_queue as number[]) || [],
        timeLeft: babaData.time_left,
        team1Score: babaData.team1_score ?? 0,
        team2Score: babaData.team2_score ?? 0,
        matchEnded: babaData.match_ended ?? false,
        isRunning: babaData.is_running ?? false,
        createdAt: babaData.created_at,
        updatedAt: babaData.updated_at,
        rawPlayerList: babaData.raw_player_list,
        totalGames: (babaData as any).total_games ?? 0,
        totalTies: (babaData as any).total_ties ?? 0,
        playerGoals: (babaData as any).player_goals ?? {},
        playerAssists: (babaData as any).player_assists ?? {},
        teamWins: (babaData as any).team_wins ?? {},
        teamTies: (babaData as any).team_ties ?? {},
        teamLosses: (babaData as any).team_losses ?? {},
        goalHistory: (babaData as any).goal_history ?? { team1: [], team2: [] },
        tiedPairs: (babaData as any).tied_pairs ?? [],
        showTieBreaker: (babaData as any).show_tie_breaker ?? false,
        tieBreakerPair: (babaData as any).tie_breaker_pair ?? null,
        waitingWinner: (babaData as any).waiting_winner ?? null,
        matchCards: (babaData as any).match_cards ?? {},
        removedTeams: (babaData as any).removed_teams ?? [],
        availableGoalkeepers: (babaData as any).available_goalkeepers ?? [],
        currentGoalkeepers: (babaData as any).current_goalkeepers ?? {},
      };

      // Set currentBabaId in localStorage ONLY (for restore on refresh)
      localStorage.setItem('currentBabaId', babaId);

      setCurrentBaba(baba);
      setRawPlayerList(babaData.raw_player_list || null);
      
      const gameConfig: GameConfig = {
        fieldType: baba.fieldType,
        playersPerTeam: baba.playersPerTeam,
        gameDuration: baba.gameDuration,
        winCriteria: baba.winCriteria,
        team1ChoosesShirt: true,
      };
      setConfig(gameConfig);

      // Load players
      const { data: playersData } = await supabase
        .from('baba_players')
        .select('*')
        .eq('baba_id', babaId);

      let parsed: ParsedPlayers | null = null;
      if (playersData && playersData.length > 0) {
        const main = playersData.filter(p => !p.is_goalkeeper && !p.is_substitute).map(p => ({
          name: p.name,
          isSeed: p.is_seed ?? false,
          seedLevel: p.seed_level ?? 0,
        }));
        const goalkeepers = playersData.filter(p => p.is_goalkeeper).map(p => ({
          name: p.name,
          isSeed: false,
          seedLevel: 0,
        }));
        const substitutes = playersData.filter(p => p.is_substitute).map(p => ({
          name: p.name,
          isSeed: false,
          seedLevel: 0,
        }));
        parsed = { main, goalkeepers, substitutes };
        setParsedPlayers(parsed);
      }

      // Load teams
      const { data: teamsData } = await supabase
        .from('baba_teams')
        .select(`
          *,
          baba_team_players (
            *,
            baba_players (*)
          )
        `)
        .eq('baba_id', babaId)
        .order('team_number');

      let loadedTeams: Team[] = [];
      if (teamsData && teamsData.length > 0) {
        loadedTeams = teamsData.map(t => {
          const teamPlayers = t.baba_team_players || [];
          // Sort players by position to preserve order after substitutions
          const sortedPlayers = [...teamPlayers].sort((a: any, b: any) => 
            (a.position ?? 0) - (b.position ?? 0)
          );
          return {
            id: t.id,
            teamNumber: t.team_number,
            players: sortedPlayers.map((tp: any) => ({
              id: tp.baba_players?.id,
              name: tp.baba_players?.name || '',
              isGoalkeeper: false,
              originalTeam: t.team_number,
              isBorrowed: tp.is_borrowed ?? false,
              isSeed: tp.baba_players?.is_seed ?? false,
              seedLevel: tp.baba_players?.seed_level ?? 0,
            })),
            goalkeeper: t.goalkeeper_id ? {
              id: t.goalkeeper_id,
              name: playersData?.find(p => p.id === t.goalkeeper_id)?.name || '',
              isGoalkeeper: true,
              originalTeam: t.team_number,
              isBorrowed: false,
              isSeed: false,
            } : null,
            isComplete: t.is_complete ?? false,
            totalWins: t.total_wins ?? 0,
          };
        });
        setTeams(loadedTeams);
      }
      
      // Mark as hydrated after all data is loaded
      setHydrated(true);

      return { baba, teams: loadedTeams, parsedPlayers: parsed };

    } catch (error) {
      console.error('Error loading baba:', error);
      toast.error('Erro ao carregar o baba');
      setHydrated(true); // Still mark as hydrated to unblock UI
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Internal update function that does the actual database write
  const performUpdate = async (updates: Partial<Baba>): Promise<UpdateResult> => {
    // Use ref to get the LATEST currentBaba (avoids stale closure)
    const baba = currentBabaRef.current;
    if (!baba || !user) return { success: false };

    const dbUpdates: Record<string, any> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.setupStatus !== undefined) dbUpdates.setup_status = updates.setupStatus;
    if (updates.currentTeam1Index !== undefined) dbUpdates.current_team1_index = updates.currentTeam1Index;
    if (updates.currentTeam2Index !== undefined) dbUpdates.current_team2_index = updates.currentTeam2Index;
    if (updates.rotationQueue !== undefined) dbUpdates.rotation_queue = updates.rotationQueue;
    if (updates.timeLeft !== undefined) dbUpdates.time_left = updates.timeLeft;
    if (updates.team1Score !== undefined) dbUpdates.team1_score = updates.team1Score;
    if (updates.team2Score !== undefined) dbUpdates.team2_score = updates.team2Score;
    if (updates.matchEnded !== undefined) dbUpdates.match_ended = updates.matchEnded;
    if (updates.isRunning !== undefined) dbUpdates.is_running = updates.isRunning;
    if (updates.rawPlayerList !== undefined) dbUpdates.raw_player_list = updates.rawPlayerList;
    if (updates.totalGames !== undefined) dbUpdates.total_games = updates.totalGames;
    if (updates.totalTies !== undefined) dbUpdates.total_ties = updates.totalTies;
    if (updates.playerGoals !== undefined) dbUpdates.player_goals = updates.playerGoals;
    if (updates.playerAssists !== undefined) dbUpdates.player_assists = updates.playerAssists;
    if (updates.teamWins !== undefined) dbUpdates.team_wins = updates.teamWins;
    if (updates.teamTies !== undefined) dbUpdates.team_ties = updates.teamTies;
    if (updates.teamLosses !== undefined) dbUpdates.team_losses = updates.teamLosses;
    if (updates.goalHistory !== undefined) dbUpdates.goal_history = updates.goalHistory;
    if (updates.fieldType !== undefined) dbUpdates.field_type = updates.fieldType;
    if (updates.playersPerTeam !== undefined) dbUpdates.players_per_team = updates.playersPerTeam;
    if (updates.gameDuration !== undefined) dbUpdates.game_duration = updates.gameDuration;
    if (updates.winCriteria !== undefined) dbUpdates.win_criteria = updates.winCriteria;
    if (updates.tiedPairs !== undefined) dbUpdates.tied_pairs = updates.tiedPairs;
    if (updates.showTieBreaker !== undefined) dbUpdates.show_tie_breaker = updates.showTieBreaker;
    if (updates.tieBreakerPair !== undefined) dbUpdates.tie_breaker_pair = updates.tieBreakerPair;
    if (updates.waitingWinner !== undefined) dbUpdates.waiting_winner = updates.waitingWinner;
    if (updates.matchCards !== undefined) dbUpdates.match_cards = updates.matchCards;
    if (updates.removedTeams !== undefined) dbUpdates.removed_teams = updates.removedTeams;
    if (updates.availableGoalkeepers !== undefined) dbUpdates.available_goalkeepers = updates.availableGoalkeepers;
    if (updates.currentGoalkeepers !== undefined) dbUpdates.current_goalkeepers = updates.currentGoalkeepers;

    // Optimistic concurrency: only update if updated_at hasn't changed
    const { data, error } = await supabase
      .from('babas')
      .update(dbUpdates as any)
      .eq('id', baba.id)
      .eq('updated_at', baba.updatedAt)
      .select()
      .maybeSingle();

    if (error) throw error;

    // If no row was updated, there's a conflict - try one retry
    if (!data) {
      console.warn('Conflict detected, attempting retry...');
      
      // Reload latest data from server
      const { data: freshBaba, error: fetchError } = await supabase
        .from('babas')
        .select('*')
        .eq('id', baba.id)
        .maybeSingle();
      
      if (fetchError || !freshBaba) {
        console.error('Failed to fetch fresh baba for retry');
        return { success: false, conflict: true };
      }

      // Update local state with fresh data, then retry the update
      const freshUpdatedAt = freshBaba.updated_at;
      
      // Retry the update with fresh updated_at
      const { data: retryData, error: retryError } = await supabase
        .from('babas')
        .update(dbUpdates as any)
        .eq('id', baba.id)
        .eq('updated_at', freshUpdatedAt)
        .select()
        .maybeSingle();

      if (retryError) throw retryError;

      if (!retryData) {
        // Real conflict from another device
        console.warn('Real conflict: baba was updated by another device');
        toast.info('Baba atualizado em outro dispositivo. Sincronizando…');
        await loadBaba(baba.id);
        return { success: false, conflict: true };
      }

      // Retry succeeded - update local state with server's updated_at
      const serverUpdatedAt = retryData.updated_at;
      setCurrentBaba(prev => (prev ? { ...prev, ...updates, updatedAt: serverUpdatedAt } : null));
      return { success: true };
    }

    // Success - update local state with server's updated_at
    const serverUpdatedAt = data.updated_at;
    setCurrentBaba(prev => (prev ? { ...prev, ...updates, updatedAt: serverUpdatedAt } : null));
    
    // Sync config state if config-related fields were updated
    if (updates.fieldType !== undefined || updates.playersPerTeam !== undefined || 
        updates.gameDuration !== undefined || updates.winCriteria !== undefined) {
      setConfig(prev => {
        if (!prev) return null;
        return {
          ...prev,
          fieldType: updates.fieldType ?? prev.fieldType,
          playersPerTeam: updates.playersPerTeam ?? prev.playersPerTeam,
          gameDuration: updates.gameDuration ?? prev.gameDuration,
          winCriteria: updates.winCriteria ?? prev.winCriteria,
        };
      });
    }
    
    // Update babas list immediately if name was changed
    if (updates.name) {
      setBabas(prev => prev.map(b => b.id === baba.id ? { ...b, name: updates.name! } : b));
    }
    
    return { success: true };
  };

  // Public updateBaba function that queues updates serially
  const updateBaba = async (updates: Partial<Baba>): Promise<UpdateResult> => {
    if (!currentBabaRef.current || !user) return { success: false };

    // Chain this update after any pending updates to prevent race conditions
    const updatePromise = updateQueueRef.current.then(async () => {
      try {
        return await performUpdate(updates);
      } catch (error) {
        console.error('Error updating baba:', error);
        toast.error('Erro ao salvar. Verifique sua conexão.');
        return { success: false };
      }
    });

    updateQueueRef.current = updatePromise;
    return updatePromise;
  };

  const deleteBaba = async (babaId: string): Promise<{ wasActive: boolean }> => {
    if (!user) return { wasActive: false };

    try {
      const wasActive = currentBaba?.id === babaId;

      const { error } = await supabase
        .from('babas')
        .delete()
        .eq('id', babaId);

      if (error) throw error;

      if (wasActive) {
        clearCurrentBaba();
      }

      await loadBabas();
      toast.success('Baba excluído com sucesso!');
      
      return { wasActive };
    } catch (error) {
      console.error('Error deleting baba:', error);
      toast.error('Erro ao excluir o baba');
      return { wasActive: false };
    }
  };

  const savePlayers = async (babaId: string, players: ParsedPlayers, rawList?: string) => {
    if (!user) return;

    try {
      // Verificar se existem times vinculados - se sim, proteger jogadores
      const { data: existingTeams } = await supabase
        .from('baba_teams')
        .select('id')
        .eq('baba_id', babaId)
        .limit(1);

      if (existingTeams && existingTeams.length > 0) {
        console.warn('Jogadores protegidos: times já existem para este baba');
        toast.error('Não é possível reimportar jogadores após times gerados. Regenere os times se necessário.');
        return;
      }

      // Update raw player list if provided
      if (rawList !== undefined) {
        await supabase
          .from('babas')
          .update({ raw_player_list: rawList })
          .eq('id', babaId);
        
        // Update local state immediately
        setRawPlayerList(rawList);
        if (currentBabaRef.current?.id === babaId) {
          setCurrentBaba(prev => prev ? { ...prev, rawPlayerList: rawList } : null);
        }
      }

      // Safe to delete - no teams linked
      await supabase.from('baba_players').delete().eq('baba_id', babaId);

      // Insert main players
      const mainPlayers = players.main.map(p => ({
        baba_id: babaId,
        name: p.name,
        is_seed: p.isSeed,
        seed_level: p.seedLevel,
        is_goalkeeper: false,
        is_substitute: false,
      }));

      // Insert goalkeepers
      const goalkeeperPlayers = players.goalkeepers.map(p => ({
        baba_id: babaId,
        name: p.name,
        is_seed: false,
        seed_level: 0,
        is_goalkeeper: true,
        is_substitute: false,
      }));

      // Insert substitutes
      const substitutePlayers = players.substitutes.map(p => ({
        baba_id: babaId,
        name: p.name,
        is_seed: false,
        seed_level: 0,
        is_goalkeeper: false,
        is_substitute: true,
      }));

      const allPlayers = [...mainPlayers, ...goalkeeperPlayers, ...substitutePlayers];
      
      if (allPlayers.length > 0) {
        const { error } = await supabase.from('baba_players').insert(allPlayers);
        if (error) throw error;
      }

      // Update local parsed players state
      setParsedPlayers(players);
    } catch (error) {
      console.error('Error saving players:', error);
      throw error;
    }
  };

  const saveTeams = async (babaId: string, teamsToSave: Team[]) => {
    if (!user) {
      console.error('saveTeams: Usuário não autenticado!');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    const normalizeName = (name: string) =>
      name
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

    try {
      // Get player IDs (normalize to avoid spacing/case mismatches breaking team rosters)
      const { data: playersData } = await supabase
        .from('baba_players')
        .select('id, name')
        .eq('baba_id', babaId);

      let playerMap = new Map(
        (playersData || []).map((p) => [normalizeName(p.name), p.id] as const)
      );

      // Collect referenced names (normalized) so we can resolve IDs reliably
      const referencedByNorm = new Map<string, string>();
      teamsToSave.forEach((t) => {
        t.players.forEach((p) => {
          const original = p.name.trim();
          referencedByNorm.set(normalizeName(original), original);
        });
        if (t.goalkeeper?.name) {
          const original = t.goalkeeper.name.trim();
          referencedByNorm.set(normalizeName(original), original);
        }
      });

      const missingNorms = Array.from(referencedByNorm.keys()).filter(
        (norm) => !playerMap.has(norm)
      );

      if (missingNorms.length > 0) {
        const inserts = missingNorms
          .map((norm) => referencedByNorm.get(norm)!)
          .filter(Boolean)
          .map((name) => ({
            baba_id: babaId,
            name,
            is_seed: false,
            seed_level: 0,
            is_goalkeeper: false,
            is_substitute: false,
          }));

        const { error: insertMissingError } = await supabase
          .from('baba_players')
          .insert(inserts);

        if (insertMissingError) throw insertMissingError;

        const { data: refreshedPlayers } = await supabase
          .from('baba_players')
          .select('id, name')
          .eq('baba_id', babaId);

        playerMap = new Map(
          (refreshedPlayers || []).map((p) => [normalizeName(p.name), p.id] as const)
        );
      }

      // Validate playerMap has data before proceeding
      if (playerMap.size === 0) {
        console.error('saveTeams: playerMap está vazio! Jogadores não encontrados no banco.');
        toast.error('Erro: jogadores não encontrados. Reimporte a lista de jogadores.');
        return;
      }

      console.log(`saveTeams: ${playerMap.size} jogadores mapeados, salvando ${teamsToSave.length} times`);

      // Delete existing teams (will cascade remove old team-player rows via FK)
      await supabase.from('baba_teams').delete().eq('baba_id', babaId);

      // Insert teams + roster
      for (const team of teamsToSave) {
        const goalkeeperPlayerId = team.goalkeeper
          ? playerMap.get(normalizeName(team.goalkeeper.name))
          : null;

        const { data: teamData, error: teamError } = await supabase
          .from('baba_teams')
          .insert({
            baba_id: babaId,
            team_number: team.teamNumber,
            goalkeeper_id: goalkeeperPlayerId,
            is_complete: team.isComplete,
            total_wins: team.totalWins ?? 0,
          })
          .select()
          .single();

        if (teamError) throw teamError;

        const teamPlayers = team.players
          .map((p, index) => ({
            team_id: teamData.id,
            player_id: playerMap.get(normalizeName(p.name)),
            is_borrowed: p.isBorrowed,
            is_added_manually: false,
            position: index, // Preserve player order
          }))
          .filter((tp) => Boolean(tp.player_id));

        if (teamPlayers.length === 0) {
          console.warn(`saveTeams: Time ${team.teamNumber} ficou sem jogadores vinculados!`);
        }

        if (teamPlayers.length > 0) {
          const { error: playersError } = await supabase
            .from('baba_team_players')
            .insert(teamPlayers);
          if (playersError) throw playersError;
        }
      }
      
      console.log('saveTeams: Times salvos com sucesso');

      // Keep context in sync so /teams and /game don't show stale teams
      setTeams(teamsToSave);
    } catch (error) {
      console.error('Error saving teams:', error);
      throw error;
    }
  };

  const clearLocalStorage = useCallback(() => {
    // Only store currentBabaId (for restore) + ephemeral flags
    localStorage.removeItem('currentBabaId');
    localStorage.removeItem('shouldGenerateTeams');
    // Backward-compat cleanup (avoid leaking config/players into a new baba)
    localStorage.removeItem('babaConfig');
    localStorage.removeItem('babaPlayers');
    localStorage.removeItem('draftRawPlayerList');
  }, []);

  const clearCurrentBaba = useCallback(() => {
    setCurrentBaba(null);
    setParsedPlayers(null);
    setConfig(null);
    setTeams([]);
    setQueue([]);
    setRawPlayerList(null);
    clearLocalStorage();
  }, [clearLocalStorage]);

  // Add a new goalkeeper to parsedPlayers state immediately (for instant UI update)
  const addGoalkeeperToState = useCallback((name: string) => {
    setParsedPlayers(prev => {
      if (!prev) {
        return { main: [], goalkeepers: [{ name, isSeed: false, seedLevel: 0 }], substitutes: [] };
      }
      
      // Check if already exists
      const normalizedName = name.toLowerCase().trim();
      if (prev.goalkeepers.some(g => g.name.toLowerCase().trim() === normalizedName)) {
        return prev;
      }
      
      // Also check if it's in main/substitutes and needs to be promoted
      const inMain = prev.main.some(p => p.name.toLowerCase().trim() === normalizedName);
      const inSubs = prev.substitutes.some(p => p.name.toLowerCase().trim() === normalizedName);
      
      if (inMain || inSubs) {
        // Promote from main/subs to goalkeepers
        return {
          main: prev.main.filter(p => p.name.toLowerCase().trim() !== normalizedName),
          goalkeepers: [...prev.goalkeepers, { name, isSeed: false, seedLevel: 0 }],
          substitutes: prev.substitutes.filter(p => p.name.toLowerCase().trim() !== normalizedName),
        };
      }
      
      // Add as new goalkeeper
      return {
        ...prev,
        goalkeepers: [...prev.goalkeepers, { name, isSeed: false, seedLevel: 0 }],
      };
    });
  }, []);

  return (
    <BabaContext.Provider value={{
      currentBaba,
      babas,
      loading,
      hydrated,
      parsedPlayers,
      config,
      teams,
      queue,
      rawPlayerList,
      setParsedPlayers,
      setConfig,
      setTeams,
      setQueue,
      setRawPlayerList,
      createBaba,
      startNewBabaDraft,
      loadBaba,
      updateBaba,
      deleteBaba,
      savePlayers,
      saveTeams,
      loadBabas,
      clearCurrentBaba,
      addGoalkeeperToState,
    }}>
      {children}
    </BabaContext.Provider>
  );
};
