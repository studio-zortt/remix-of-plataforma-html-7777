import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Player {
  id?: string;
  name: string;
  isGoalkeeper: boolean;
  originalTeam: number;
  isBorrowed: boolean;
  goals?: number;
}

interface Team {
  id: number;
  players: Player[];
  goalkeeper: Player | null;
  isComplete: boolean;
  score?: number;
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

interface ParsedPlayer {
  id?: string;
  name: string;
  isSeed: boolean;
  seedLevel: number;
}

interface ParsedPlayers {
  main: ParsedPlayer[];
  goalkeepers: ParsedPlayer[];
  substitutes: ParsedPlayer[];
}

export const useTeamManagement = (
  allTeams: Team[],
  setAllTeams: React.Dispatch<React.SetStateAction<Team[]>>,
  currentBabaId: string | null,
  parsedPlayers: ParsedPlayers | null,
  requestSave: (immediate?: boolean) => void
) => {
  // State for removed teams from rotation
  const [removedTeams, setRemovedTeams] = useState<RemovedTeam[]>([]);
  
  // State for available goalkeepers (from teams that lost)
  const [availableGoalkeepers, setAvailableGoalkeepers] = useState<AvailableGoalkeeper[]>([]);
  
  // State for current goalkeeper assignments
  const [currentGoalkeepers, setCurrentGoalkeepers] = useState<Record<number, string>>({});

  // AJUSTE 5: Get all players available to add to a team (not already in the team)
  // Filtra goleiros registrados para não aparecerem como jogadores de linha
  const getAvailablePlayers = useCallback((teamIndex: number): ParsedPlayer[] => {
    if (!parsedPlayers) return [];
    
    const currentTeam = allTeams[teamIndex];
    if (!currentTeam) return [];
    
    const currentPlayerNames = new Set(currentTeam.players.map(p => p.name.toLowerCase().trim()));
    
    // Set de nomes de goleiros registrados para excluí-los da lista de jogadores de linha
    const registeredGoalkeeperNames = new Set(
      (parsedPlayers.goalkeepers || []).map(g => g.name.toLowerCase().trim())
    );
    
    // Include all main players and substitutes, EXCLUDING registered goalkeepers
    const available = [
      ...parsedPlayers.main,
      ...parsedPlayers.substitutes,
    ].filter(p => 
      !currentPlayerNames.has(p.name.toLowerCase().trim()) &&
      !registeredGoalkeeperNames.has(p.name.toLowerCase().trim())
    );
    
    return available;
  }, [parsedPlayers, allTeams]);

  // AJUSTE 4: Get goalkeepers available to play as line players
  const getGoalkeepersForLinePlay = useCallback((teamIndex: number): ParsedPlayer[] => {
    if (!parsedPlayers) return [];
    
    const currentTeam = allTeams[teamIndex];
    if (!currentTeam) return [];
    
    const currentPlayerNames = new Set(currentTeam.players.map(p => p.name.toLowerCase().trim()));
    
    // Goleiros registrados que não estão no time atual
    const availableGoalkeepersForLine = (parsedPlayers.goalkeepers || []).filter(
      g => !currentPlayerNames.has(g.name.toLowerCase().trim())
    );
    
    return availableGoalkeepersForLine;
  }, [parsedPlayers, allTeams]);

  // Add existing player to a team
  const addExistingPlayerToTeam = useCallback(async (
    teamIndex: number,
    player: ParsedPlayer,
    isBorrowed: boolean = true
  ) => {
    if (!currentBabaId) return false;

    try {
      // Get or create player in database
      let playerId = player.id;
      
      if (!playerId) {
        // Check if player exists
        const { data: existingPlayer } = await supabase
          .from('baba_players')
          .select('id')
          .eq('baba_id', currentBabaId)
          .ilike('name', player.name.trim())
          .maybeSingle();
        
        playerId = existingPlayer?.id;
      }

      if (!playerId) {
        // Create player
        const { data: newPlayer, error: createError } = await supabase
          .from('baba_players')
          .insert({
            baba_id: currentBabaId,
            name: player.name.trim(),
            is_seed: player.isSeed || false,
            seed_level: player.seedLevel || 0,
            is_goalkeeper: false,
            is_substitute: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        playerId = newPlayer.id;
      }

      // Get team database ID
      const team = allTeams[teamIndex];
      const { data: teamData } = await supabase
        .from('baba_teams')
        .select('id')
        .eq('baba_id', currentBabaId)
        .eq('team_number', team.id)
        .maybeSingle();

      if (teamData) {
        // Get the current max position for this team
        const { data: existingPlayers } = await supabase
          .from('baba_team_players')
          .select('position')
          .eq('team_id', teamData.id)
          .order('position', { ascending: false })
          .limit(1);
        
        const nextPosition = existingPlayers && existingPlayers.length > 0 
          ? (existingPlayers[0].position ?? 0) + 1 
          : team.players.length;

        // Add to team_players with position
        await supabase
          .from('baba_team_players')
          .insert({
            team_id: teamData.id,
            player_id: playerId,
            is_borrowed: isBorrowed,
            is_added_manually: false,
            position: nextPosition,
          });
      }

      // Update local state
      const newPlayer: Player = {
        id: playerId,
        name: player.name,
        isGoalkeeper: false,
        originalTeam: isBorrowed ? -1 : team.id,
        isBorrowed,
      };

      setAllTeams(prev => prev.map((t, idx) => {
        if (idx === teamIndex) {
          return {
            ...t,
            players: [...t.players, newPlayer],
          };
        }
        return t;
      }));

      toast.success(`${player.name} adicionado ao Time ${team.id}`);
      requestSave();
      return true;
    } catch (error) {
      console.error('Error adding player to team:', error);
      toast.error('Erro ao adicionar jogador');
      return false;
    }
  }, [currentBabaId, allTeams, setAllTeams, requestSave]);

  // Create and add a new custom player
  const createAndAddPlayer = useCallback(async (
    teamIndex: number,
    playerName: string
  ) => {
    if (!currentBabaId || !playerName.trim()) return false;

    try {
      // Create player in database
      const { data: newPlayer, error: createError } = await supabase
        .from('baba_players')
        .insert({
          baba_id: currentBabaId,
          name: playerName.trim(),
          is_seed: false,
          seed_level: 0,
          is_goalkeeper: false,
          is_substitute: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get team database ID
      const team = allTeams[teamIndex];
      const { data: teamData } = await supabase
        .from('baba_teams')
        .select('id')
        .eq('baba_id', currentBabaId)
        .eq('team_number', team.id)
        .maybeSingle();

      if (teamData) {
        // Get the current max position for this team
        const { data: existingPlayers } = await supabase
          .from('baba_team_players')
          .select('position')
          .eq('team_id', teamData.id)
          .order('position', { ascending: false })
          .limit(1);
        
        const nextPosition = existingPlayers && existingPlayers.length > 0 
          ? (existingPlayers[0].position ?? 0) + 1 
          : team.players.length;

        // Add to team_players with position
        await supabase
          .from('baba_team_players')
          .insert({
            team_id: teamData.id,
            player_id: newPlayer.id,
            is_borrowed: false,
            is_added_manually: true,
            position: nextPosition,
          });
      }

      // Update local state
      const player: Player = {
        id: newPlayer.id,
        name: playerName.trim(),
        isGoalkeeper: false,
        originalTeam: team.id,
        isBorrowed: false,
      };

      setAllTeams(prev => prev.map((t, idx) => {
        if (idx === teamIndex) {
          return {
            ...t,
            players: [...t.players, player],
          };
        }
        return t;
      }));

      toast.success(`${playerName} cadastrado e adicionado ao Time ${team.id}`);
      requestSave();
      return true;
    } catch (error) {
      console.error('Error creating player:', error);
      toast.error('Erro ao criar jogador');
      return false;
    }
  }, [currentBabaId, allTeams, setAllTeams, requestSave]);

  // Replace a player in a team
  const replacePlayer = useCallback(async (
    teamIndex: number,
    playerIndex: number,
    newPlayerName: string,
    isNewPlayer: boolean = false
  ) => {
    if (!currentBabaId) return false;

    try {
      const team = allTeams[teamIndex];
      const oldPlayer = team.players[playerIndex];

      // Get team database ID
      const { data: teamData } = await supabase
        .from('baba_teams')
        .select('id')
        .eq('baba_id', currentBabaId)
        .eq('team_number', team.id)
        .maybeSingle();

      if (teamData) {
        // ROBUST: Delete by position instead of player_id to avoid issues
        // when the same player appears multiple times or player_id is missing
        await supabase
          .from('baba_team_players')
          .delete()
          .eq('team_id', teamData.id)
          .eq('position', playerIndex);
      }

      // Get or create new player
      let newPlayerId: string | undefined;
      
      if (isNewPlayer) {
        const { data: newPlayer, error } = await supabase
          .from('baba_players')
          .insert({
            baba_id: currentBabaId,
            name: newPlayerName.trim(),
            is_seed: false,
            seed_level: 0,
            is_goalkeeper: false,
            is_substitute: false,
          })
          .select()
          .single();

        if (error) throw error;
        newPlayerId = newPlayer.id;
      } else {
        const { data: existingPlayer } = await supabase
          .from('baba_players')
          .select('id')
          .eq('baba_id', currentBabaId)
          .ilike('name', newPlayerName.trim())
          .maybeSingle();

        newPlayerId = existingPlayer?.id;
      }

      if (teamData && newPlayerId) {
        // Add new player to team - preserve position (same as the replaced player)
        await supabase
          .from('baba_team_players')
          .insert({
            team_id: teamData.id,
            player_id: newPlayerId,
            is_borrowed: true,
            is_added_manually: isNewPlayer,
            position: playerIndex, // Preserve the position of the replaced player
          });
      }

      // Update local state - REPLACE the player, don't add
      setAllTeams(prev => prev.map((t, idx) => {
        if (idx === teamIndex) {
          const newPlayers = [...t.players];
          newPlayers[playerIndex] = {
            id: newPlayerId,
            name: newPlayerName.trim(),
            isGoalkeeper: false,
            originalTeam: t.id,
            isBorrowed: true,
          };
          return { ...t, players: newPlayers };
        }
        return t;
      }));

      toast.success(`${oldPlayer.name} substituído por ${newPlayerName}`);
      requestSave();
      return true;
    } catch (error) {
      console.error('Error replacing player:', error);
      toast.error('Erro ao substituir jogador');
      return false;
    }
  }, [currentBabaId, allTeams, setAllTeams, requestSave]);

  // Remove team from rotation
  const removeTeamFromRotation = useCallback((
    teamIndex: number,
    removalType: 'temporary' | 'permanent'
  ) => {
    setRemovedTeams(prev => {
      // Check if already removed
      const existing = prev.find(r => r.teamIndex === teamIndex);
      if (existing) {
        return prev.map(r => r.teamIndex === teamIndex ? { ...r, removalType } : r);
      }
      return [...prev, { teamIndex, removalType }];
    });

    const team = allTeams[teamIndex];
    const typeText = removalType === 'temporary' ? 'temporariamente' : 'definitivamente';
    toast.success(`Time ${team.id} removido ${typeText} da rotação`);
    requestSave(true);
  }, [allTeams, requestSave]);

  // Restore team to rotation
  const restoreTeamToRotation = useCallback((teamIndex: number) => {
    setRemovedTeams(prev => prev.filter(r => r.teamIndex !== teamIndex));
    
    const team = allTeams[teamIndex];
    toast.success(`Time ${team.id} restaurado à rotação`);
    requestSave(true);
  }, [allTeams, requestSave]);

  // Check if team is removed from rotation
  const isTeamRemoved = useCallback((teamIndex: number): RemovedTeam | undefined => {
    return removedTeams.find(r => r.teamIndex === teamIndex);
  }, [removedTeams]);

  // Get active team indices (not removed)
  const getActiveTeamIndices = useCallback((): number[] => {
    return allTeams
      .map((_, idx) => idx)
      .filter(idx => !removedTeams.some(r => r.teamIndex === idx && r.removalType === 'permanent'));
  }, [allTeams, removedTeams]);

  // Filter rotation queue to exclude removed teams
  const filterRotationQueue = useCallback((queue: number[]): number[] => {
    return queue.filter(idx => !removedTeams.some(r => r.teamIndex === idx));
  }, [removedTeams]);

  // Make goalkeeper available (when team loses)
  const makeGoalkeeperAvailable = useCallback((teamIndex: number) => {
    const team = allTeams[teamIndex];
    if (team.goalkeeper) {
      setAvailableGoalkeepers(prev => {
        // Avoid duplicates
        if (prev.some(g => g.originalTeamIndex === teamIndex)) return prev;
        return [...prev, {
          name: team.goalkeeper!.name,
          originalTeamIndex: teamIndex,
          playerId: team.goalkeeper!.id,
        }];
      });
    }
  }, [allTeams]);

  // AJUSTE 2: Criar e registrar um novo goleiro no banco de dados
  const createAndRegisterGoalkeeper = useCallback(async (name: string): Promise<string | null> => {
    if (!currentBabaId || !name.trim()) return null;

    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('baba_players')
        .select('id, is_goalkeeper')
        .eq('baba_id', currentBabaId)
        .ilike('name', name.trim())
        .maybeSingle();
      
      if (existing) {
        // Se já existe mas não é goleiro, atualizar para marcar como goleiro
        if (!existing.is_goalkeeper) {
          await supabase
            .from('baba_players')
            .update({ is_goalkeeper: true })
            .eq('id', existing.id);
        }
        return existing.id;
      }

      // Criar novo jogador como goleiro
      const { data: newPlayer, error } = await supabase
        .from('baba_players')
        .insert({
          baba_id: currentBabaId,
          name: name.trim(),
          is_seed: false,
          seed_level: 0,
          is_goalkeeper: true,
          is_substitute: false,
        })
        .select()
        .single();

      if (error) throw error;
      return newPlayer.id;
    } catch (error) {
      console.error('Error creating goalkeeper:', error);
      return null;
    }
  }, [currentBabaId]);

  // Assign goalkeeper to team
  const assignGoalkeeperToTeam = useCallback((teamIndex: number, goalkeeperName: string) => {
    setCurrentGoalkeepers(prev => {
      const updated = { ...prev };
      
      // 1. Remover este goleiro de qualquer outro time no currentGoalkeepers
      for (const key of Object.keys(updated)) {
        if (updated[Number(key)] === goalkeeperName && Number(key) !== teamIndex) {
          // Marcar como null (sem goleiro) ao invés de deletar, para override do original
          updated[Number(key)] = null as any;
          const otherTeam = allTeams[Number(key)];
          toast.info(`${goalkeeperName} removido do Time ${otherTeam?.id || Number(key) + 1}`);
        }
      }
      
      // 2. Verificar se o goleiro é o goleiro ORIGINAL de outro time
      for (let i = 0; i < allTeams.length; i++) {
        if (i !== teamIndex && !(i in updated)) {
          const team = allTeams[i];
          if (team.goalkeeper?.name === goalkeeperName) {
            // Marcar este time como sem goleiro (null override)
            updated[i] = null as any;
            toast.info(`${goalkeeperName} removido do Time ${team.id}`);
          }
        }
      }
      
      // Atribuir ao novo time
      updated[teamIndex] = goalkeeperName;
      return updated;
    });

    // Remove from available if was there
    setAvailableGoalkeepers(prev => prev.filter(g => g.name !== goalkeeperName));

    const team = allTeams[teamIndex];
    toast.success(`${goalkeeperName} agora é goleiro do Time ${team.id}`);
    requestSave();
  }, [allTeams, requestSave]);

  // Get current goalkeeper for a team (either assigned or original)
  const getCurrentGoalkeeper = useCallback((teamIndex: number): string | null => {
    // Check if there's an override in currentGoalkeepers
    if (teamIndex in currentGoalkeepers) {
      const overrideValue = currentGoalkeepers[teamIndex];
      // If override is a valid string, return it
      if (overrideValue && overrideValue.trim() !== '') {
        return overrideValue;
      }
      // If override is explicitly null/empty, the user explicitly removed the goalkeeper
      // Return null - DO NOT fall through to original
      return null;
    }
    
    // No override exists - return original goalkeeper from team data
    const team = allTeams[teamIndex];
    return team?.goalkeeper?.name || null;
  }, [allTeams, currentGoalkeepers]);

  // Get all registered goalkeepers (including manually assigned ones)
  const getAllGoalkeepers = useCallback((): ParsedPlayer[] => {
    const gkMap = new Map<string, ParsedPlayer>();
    
    // 1. Goleiros registrados originalmente
    for (const gk of parsedPlayers?.goalkeepers || []) {
      gkMap.set(gk.name, gk);
    }
    
    // 2. Goleiros atribuídos aos times (inclui criados manualmente na página de Times)
    for (const team of allTeams) {
      if (team.goalkeeper?.name) {
        if (!gkMap.has(team.goalkeeper.name)) {
          gkMap.set(team.goalkeeper.name, {
            name: team.goalkeeper.name,
            isSeed: false,
            seedLevel: 0,
          });
        }
      }
    }
    
    // 3. Goleiros no override que podem ter sido atribuídos manualmente
    for (const [_, gkName] of Object.entries(currentGoalkeepers)) {
      if (gkName && !gkMap.has(gkName)) {
        gkMap.set(gkName, {
          name: gkName,
          isSeed: false,
          seedLevel: 0,
        });
      }
    }
    
    return Array.from(gkMap.values());
  }, [parsedPlayers, allTeams, currentGoalkeepers]);

  // Initialize from saved state
  const initializeFromBaba = useCallback((babaData: {
    removedTeams?: RemovedTeam[];
    availableGoalkeepers?: AvailableGoalkeeper[];
    currentGoalkeepers?: Record<number, string>;
  }) => {
    if (babaData.removedTeams) {
      setRemovedTeams(babaData.removedTeams);
    }
    if (babaData.availableGoalkeepers) {
      setAvailableGoalkeepers(babaData.availableGoalkeepers);
    }
    if (babaData.currentGoalkeepers) {
      setCurrentGoalkeepers(babaData.currentGoalkeepers);
    }
  }, []);

  // Get state for saving
  const getStateForSave = useCallback(() => ({
    removedTeams,
    availableGoalkeepers,
    currentGoalkeepers,
  }), [removedTeams, availableGoalkeepers, currentGoalkeepers]);

  return {
    // State
    removedTeams,
    availableGoalkeepers,
    currentGoalkeepers,
    
    // Player management
    getAvailablePlayers,
    getGoalkeepersForLinePlay,
    addExistingPlayerToTeam,
    createAndAddPlayer,
    replacePlayer,
    
    // Team rotation management
    removeTeamFromRotation,
    restoreTeamToRotation,
    isTeamRemoved,
    getActiveTeamIndices,
    filterRotationQueue,
    
    // Goalkeeper management
    makeGoalkeeperAvailable,
    assignGoalkeeperToTeam,
    getCurrentGoalkeeper,
    getAllGoalkeepers,
    createAndRegisterGoalkeeper,
    
    // Persistence
    initializeFromBaba,
    getStateForSave,
    setRemovedTeams,
    setAvailableGoalkeepers,
    setCurrentGoalkeepers,
  };
};

