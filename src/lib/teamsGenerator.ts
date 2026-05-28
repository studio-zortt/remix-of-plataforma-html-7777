// Pure team generation logic extracted from Teams.tsx
// Used by both the standard (DB-persisted) flow and the Quick Sort (in-memory) flow.

export interface ParsedPlayer {
  name: string;
  isSeed: boolean;
  seedLevel: number;
}

export interface ParsedPlayers {
  main: ParsedPlayer[];
  goalkeepers: ParsedPlayer[];
  substitutes: ParsedPlayer[];
}

export interface GeneratedPlayer {
  name: string;
  isGoalkeeper: boolean;
  originalTeam: number;
  isBorrowed: boolean;
  isSeed: boolean;
  seedLevel?: number;
}

export interface GeneratedTeam {
  id: number;
  players: GeneratedPlayer[];
  goalkeeper: GeneratedPlayer | null;
  isComplete: boolean;
}

export interface GenerateTeamsResult {
  teams: GeneratedTeam[];
  queue: string[];
}

export function generateTeamsLogic(
  players: ParsedPlayers,
  playersPerTeam: number
): GenerateTeamsResult {
  const generatedTeams: GeneratedTeam[] = [];
  const linePlayersPerTeam = playersPerTeam - 1;

  // Proper Fisher-Yates shuffle (unbiased)
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Group seeds by level
  const seedsByLevel: Record<number, ParsedPlayer[]> = {};
  const regularPlayers = players.main.filter(p => !p.isSeed);
  players.main.filter(p => p.isSeed).forEach(player => {
    const level = player.seedLevel || 1;
    if (!seedsByLevel[level]) seedsByLevel[level] = [];
    seedsByLevel[level].push(player);
  });

  Object.keys(seedsByLevel).forEach(level => {
    seedsByLevel[parseInt(level)] = shuffle(seedsByLevel[parseInt(level)]);
  });
  const shuffledRegulars = shuffle(regularPlayers);
  const totalPlayers = players.main.length;
  const numberOfTeams = Math.max(1, Math.ceil(totalPlayers / linePlayersPerTeam));

  for (let i = 0; i < numberOfTeams; i++) {
    generatedTeams.push({
      id: i + 1,
      players: [],
      goalkeeper: null,
      isComplete: false,
    });
  }

  // Shuffle team-assignment order so seeds and regulars don't always start at team 1
  const teamOrder = shuffle(generatedTeams.map((_, idx) => idx));

  const sortedLevels = Object.keys(seedsByLevel).map(Number).sort((a, b) => a - b);
  sortedLevels.forEach(level => {
    const seedsAtLevel = seedsByLevel[level];
    seedsAtLevel.forEach((seedPlayer, index) => {
      const targetTeamIndex = teamOrder[index % teamOrder.length];
      generatedTeams[targetTeamIndex].players.push({
        name: seedPlayer.name,
        isGoalkeeper: false,
        originalTeam: targetTeamIndex + 1,
        isBorrowed: false,
        isSeed: true,
        seedLevel: level,
      });
    });
  });

  let regularIndex = 0;
  for (const teamIdx of teamOrder) {
    const team = generatedTeams[teamIdx];
    while (team.players.length < linePlayersPerTeam && regularIndex < shuffledRegulars.length) {
      team.players.push({
        name: shuffledRegulars[regularIndex].name,
        isGoalkeeper: false,
        originalTeam: team.id,
        isBorrowed: false,
        isSeed: false,
      });
      regularIndex++;
    }
  }

  generatedTeams.forEach(team => {
    team.isComplete = team.players.length === linePlayersPerTeam;
  });

  const shuffledGoalkeepers = shuffle(players.goalkeepers);
  let gkIndex = 0;
  for (let i = 0; i < generatedTeams.length && gkIndex < shuffledGoalkeepers.length; i++) {
    generatedTeams[i].goalkeeper = {
      name: shuffledGoalkeepers[gkIndex].name,
      isGoalkeeper: true,
      originalTeam: generatedTeams[i].id,
      isBorrowed: false,
      isSeed: false,
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
        isSeed: false,
      });
      subIndex++;
    }
  }

  // Concentrate shortage in the last team only
  const totalSlots = generatedTeams.length * linePlayersPerTeam;
  const totalLinePlayers = generatedTeams.reduce((acc, t) => acc + t.players.length, 0);
  if (generatedTeams.length > 1 && totalLinePlayers < totalSlots) {
    const flatPlayers = generatedTeams.flatMap(t => t.players);
    let cursor = 0;
    for (let i = 0; i < generatedTeams.length - 1; i++) {
      const slice = flatPlayers.slice(cursor, cursor + linePlayersPerTeam);
      generatedTeams[i].players = slice.map(p => ({ ...p, originalTeam: generatedTeams[i].id }));
      cursor += linePlayersPerTeam;
    }
    const lastIdx = generatedTeams.length - 1;
    generatedTeams[lastIdx].players = flatPlayers.slice(cursor).map(p => ({
      ...p,
      originalTeam: generatedTeams[lastIdx].id,
    }));
  }

  // Sort: seeds first (by level asc), then regulars
  const sortTeamPlayers = (list: GeneratedPlayer[]): GeneratedPlayer[] => {
    return [...list].sort((a, b) => {
      if (a.isSeed && !b.isSeed) return -1;
      if (!a.isSeed && b.isSeed) return 1;
      if (a.isSeed && b.isSeed) return (a.seedLevel || 1) - (b.seedLevel || 1);
      return 0;
    });
  };

  generatedTeams.forEach(team => {
    team.players = sortTeamPlayers(team.players);
    team.isComplete = team.players.length === linePlayersPerTeam;
  });

  const queuePlayers = allSubstitutes.slice(subIndex);

  return { teams: generatedTeams, queue: queuePlayers };
}
