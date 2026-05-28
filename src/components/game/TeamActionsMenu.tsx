import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, RotateCcw, Clock, Ban } from 'lucide-react';
import timeForaRotacaoIcon from '@/assets/time-fora-rotacao.svg';
import timeForaRotacaoIconWhite from '@/assets/time-fora-rotacao-white.svg';

interface RemovedTeam {
  teamIndex: number;
  removalType: 'temporary' | 'permanent';
}

interface TeamActionsMenuProps {
  teamIndex: number;
  teamId: number;
  isRemovedFromRotation?: RemovedTeam;
  onRemoveFromRotation: (type: 'temporary' | 'permanent') => void;
  onRestoreToRotation: () => void;
  disabled?: boolean;
}

export const TeamActionsMenu = ({
  teamId,
  isRemovedFromRotation,
  onRemoveFromRotation,
  onRestoreToRotation,
  disabled = false,
}: TeamActionsMenuProps) => {
  const [showRemovalDialog, setShowRemovalDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isRemovedFromRotation ? (
            <DropdownMenuItem onClick={onRestoreToRotation} className="gap-2 text-primary">
              <RotateCcw className="w-4 h-4" />
              Restaurar à Rotação
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => !disabled && setShowRemovalDialog(true)}
              disabled={disabled}
              className={`gap-2 ${disabled ? 'opacity-50 cursor-not-allowed text-muted-foreground' : 'text-white bg-destructive font-semibold focus:text-white focus:bg-destructive/80 hover:text-white hover:bg-destructive/80'}`}
            >
              <img src={disabled ? timeForaRotacaoIcon : timeForaRotacaoIconWhite} alt="" className="w-4 h-4" />
              Tirar da Rotação
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Removal type dialog */}
      <Dialog open={showRemovalDialog} onOpenChange={setShowRemovalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={timeForaRotacaoIcon} alt="" className="w-5 h-5" />
              Tirar Time {teamId} da Rotação
            </DialogTitle>
            <DialogDescription>
              Escolha como remover o time da rotação:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 bg-warning-yellow/20 border-warning-yellow/50 hover:bg-warning-yellow/30 hover:border-warning-yellow"
              onClick={() => {
                onRemoveFromRotation('temporary');
                setShowRemovalDialog(false);
              }}
            >
              <Clock className="!w-7 !h-7 text-warning-yellow shrink-0" />
              <div className="text-left">
                <div className="font-medium text-white">Temporariamente</div>
                <div className="text-xs text-white/75">
                  O time pode ser restaurado depois
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 bg-destructive/30 border-destructive/50 hover:bg-destructive/40 hover:border-destructive"
              onClick={() => {
                onRemoveFromRotation('permanent');
                setShowRemovalDialog(false);
              }}
            >
              <Ban className="!w-7 !h-7 text-destructive shrink-0" />
              <div className="text-left">
                <div className="font-medium text-white">Definitivamente</div>
                <div className="text-xs text-white/75">
                  O time não volta mais para a rotação
                </div>
              </div>
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={() => setShowRemovalDialog(false)}
          >
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
