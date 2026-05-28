import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Clock, Ban } from 'lucide-react';
import teamShieldWhite from '@/assets/team-shield-white.svg';

interface RemovedTeam {
  teamIndex: number;
  removalType: 'temporary' | 'permanent';
}

interface Team {
  id: number;
}

interface RemovedTeamsCardProps {
  removedTeams: RemovedTeam[];
  allTeams: Team[];
  onRestoreTeam: (teamIndex: number) => void;
}

export const RemovedTeamsCard = ({
  removedTeams,
  allTeams,
  onRestoreTeam,
}: RemovedTeamsCardProps) => {
  if (removedTeams.length === 0) return null;

  const temporaryTeams = removedTeams.filter(r => r.removalType === 'temporary');
  const permanentTeams = removedTeams.filter(r => r.removalType === 'permanent');

  return (
    <Card className="backdrop-blur-md border-destructive/30 bg-destructive/10 mb-6 rounded-3xl">
      <CardContent className="py-4 px-4 sm:px-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-white/80">Times fora da rotação</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {temporaryTeams.map(removed => {
              const team = allTeams[removed.teamIndex];
              if (!team) return null;
              
              return (
                <div
                  key={removed.teamIndex}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/20 border border-destructive/40"
                >
                  <Clock className="w-3.5 h-3.5 text-white/70" />
                  <img src={teamShieldWhite} alt="" className="w-4 h-4" />
                  <span className="text-sm font-medium text-white/90">
                    Time {team.id}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-white/80 hover:bg-destructive/30 hover:text-white"
                    onClick={() => onRestoreTeam(removed.teamIndex)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restaurar
                  </Button>
                </div>
              );
            })}
            
            {permanentTeams.map(removed => {
              const team = allTeams[removed.teamIndex];
              if (!team) return null;
              
              return (
                <div
                  key={removed.teamIndex}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/20 border border-destructive/30"
                >
                  <Ban className="w-3.5 h-3.5 text-destructive" />
                  <img src={teamShieldWhite} alt="" className="w-4 h-4 opacity-50" />
                  <span className="text-sm font-medium text-muted-foreground line-through">
                    Time {team.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
