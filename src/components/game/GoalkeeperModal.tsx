import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Plus, Users, Undo2 } from 'lucide-react';
import luvaGoleiroIcon from '@/assets/luva-goleiro.svg';
import substituicaoIcon from '@/assets/substituicao-icon.svg';

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

interface GoalkeeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamIndex: number;
  opponentTeamIndex?: number;
  availableGoalkeepers: AvailableGoalkeeper[];
  allGoalkeepers: ParsedPlayer[];
  allLinePlayers?: ParsedPlayer[];
  currentGoalkeeper?: string | null;
  opponentGoalkeeper?: string | null;
  allTeams: {
    id: number;
  }[];
  onSelectGoalkeeper: (name: string) => void;
  // AJUSTE 3: Prop para troca direta de goleiros
  onSwapGoalkeepers?: () => void;
  // Card system props
  cards?: { yellow: number; red: boolean };
  isExpelled?: boolean;
  onGiveYellowCard?: () => void;
  onGiveRedCard?: () => void;
  onRemoveYellowCard?: () => void;
  onRemoveRedCard?: () => void;
}

export const GoalkeeperModal = ({
  isOpen,
  onClose,
  teamId,
  teamIndex,
  opponentTeamIndex,
  availableGoalkeepers,
  allGoalkeepers,
  allLinePlayers = [],
  currentGoalkeeper,
  opponentGoalkeeper,
  allTeams,
  onSelectGoalkeeper,
  onSwapGoalkeepers,
  cards = { yellow: 0, red: false },
  isExpelled = false,
  onGiveYellowCard,
  onGiveRedCard,
  onRemoveYellowCard,
  onRemoveRedCard
}: GoalkeeperModalProps) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleSelect = (name: string) => {
    onSelectGoalkeeper(name);
    onClose();
    setShowCustomInput(false);
    setCustomName('');
  };

  const handleCustomSubmit = () => {
    if (customName.trim()) {
      handleSelect(customName.trim());
    }
  };

  // AJUSTE 2: Filtrar goleiros que já estão no time oponente
  // Isso previne a seleção de um goleiro que causaria duplicação
  const filteredAvailable = availableGoalkeepers.filter(g => 
    g.name !== currentGoalkeeper && g.name !== opponentGoalkeeper
  );

  // Filter registered goalkeepers (exclude current, opponent, and available)
  const availableNames = new Set(filteredAvailable.map(g => g.name));
  const registeredGkNames = new Set(allGoalkeepers.map(g => g.name));
  const registeredGks = allGoalkeepers.filter(g => 
    g.name !== currentGoalkeeper && 
    g.name !== opponentGoalkeeper &&
    !availableNames.has(g.name)
  );

  // Filter line players (exclude current goalkeeper, opponent goalkeeper, registered goalkeepers, and available goalkeepers)
  const filteredLinePlayers = allLinePlayers.filter(p => 
    p.name !== currentGoalkeeper && 
    p.name !== opponentGoalkeeper &&
    !availableNames.has(p.name) && 
    !registeredGkNames.has(p.name)
  );

  const hasCurrentGoalkeeper = !!currentGoalkeeper;
  const hasCards = cards.yellow > 0 || cards.red;

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-28 sm:pt-32"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-md bg-card border-border max-h-[70vh] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="text-lg font-bold truncate max-w-[240px]">
              {currentGoalkeeper || 'Escolher Goleiro'}
            </span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-muted/50">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
          {/* Cartões abaixo do nome */}
          {hasCurrentGoalkeeper && hasCards && (
            <div className="flex items-center gap-2 mt-1">
              {cards.yellow > 0 && Array.from({ length: cards.yellow }).map((_, i) => (
                <span key={i} className="w-3 h-4 bg-warning-yellow rounded-[2px] inline-block" />
              ))}
              {cards.red && <span className="w-3 h-4 bg-destructive rounded-[2px] inline-block" />}
              {isExpelled && <span className="text-xs text-destructive font-semibold">EXPULSO</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden flex flex-col flex-1 pt-2">
          {/* Card Actions - Dar cartão */}
          {hasCurrentGoalkeeper && (onGiveYellowCard || onGiveRedCard) && !isExpelled && (
            <div className="flex gap-2 flex-shrink-0">
              {onGiveYellowCard && (
                <Button
                  variant="outline"
                  className="flex-1 border-warning-yellow bg-warning-yellow/10 hover:bg-warning-yellow/20 text-foreground"
                  onClick={() => { onGiveYellowCard(); onClose(); }}
                >
                  <span className="w-4 h-5 bg-warning-yellow rounded-[2px] mr-2" />
                  Amarelo
                </Button>
              )}
              {onGiveRedCard && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive bg-destructive/10 hover:bg-destructive/20 text-foreground"
                  onClick={() => { onGiveRedCard(); onClose(); }}
                >
                  <span className="w-4 h-5 bg-destructive rounded-[2px] mr-2" />
                  Vermelho
                </Button>
              )}
            </div>
          )}

          {/* Desfazer cartão - só aparece se tiver cartão */}
          {hasCurrentGoalkeeper && hasCards && (onRemoveYellowCard || onRemoveRedCard) && (
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Undo2 className="w-3 h-3" />
                <span>Desfazer cartão</span>
              </div>
              <div className="flex gap-2">
                {cards.yellow > 0 && onRemoveYellowCard && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-warning-yellow/50 bg-warning-yellow/5 hover:bg-warning-yellow/10 text-foreground text-xs"
                    onClick={() => { onRemoveYellowCard(); }}
                  >
                    <span className="w-3 h-4 bg-warning-yellow rounded-[2px] mr-1.5" />
                    Tirar Amarelo
                  </Button>
                )}
                {cards.red && onRemoveRedCard && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-destructive/50 bg-destructive/5 hover:bg-destructive/10 text-foreground text-xs"
                    onClick={() => { onRemoveRedCard(); }}
                  >
                    <span className="w-3 h-4 bg-destructive rounded-[2px] mr-1.5" />
                    Tirar Vermelho
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Separator - Substituir goleiro */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-4">
            <div className="flex-1 h-px bg-border/50" />
            <div className="flex items-center gap-2">
              <img src={substituicaoIcon} alt="" className="w-5 h-5" />
              <span className="text-base font-semibold text-foreground">
                {hasCurrentGoalkeeper ? 'Substituir goleiro' : 'Escolher goleiro'}
              </span>
            </div>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {!showCustomInput ? (
            <div className="overflow-y-auto flex-1 space-y-4 min-h-0">
              {/* AJUSTE 3: Botão de troca direta entre os dois times */}
              {onSwapGoalkeepers && currentGoalkeeper && opponentGoalkeeper && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Trocar goleiros:</p>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-foreground hover:bg-primary/10 border-primary/30"
                    onClick={() => {
                      onSwapGoalkeepers();
                      onClose();
                    }}
                  >
                    <span>Trocar com {opponentGoalkeeper}</span>
                    <span className="text-xs text-muted-foreground">(Time adversário)</span>
                  </Button>
                </div>
              )}

              {/* Available goalkeepers from teams that lost */}
              {filteredAvailable.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Goleiros disponíveis:
                  </p>
                  <div className="space-y-2">
                    {filteredAvailable.map((gk, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-between text-foreground hover:bg-primary/10 border-border"
                        onClick={() => handleSelect(gk.name)}
                      >
                        <span>{gk.name}</span>
                        <span className="text-xs text-muted-foreground">
                          (Time {allTeams[gk.originalTeamIndex]?.id})
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Registered goalkeepers */}
              {registeredGks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    Goleiros cadastrados:
                  </p>
                  <div className="space-y-2">
                    {registeredGks.map((gk, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-start text-foreground hover:bg-primary/10 border-border"
                        onClick={() => handleSelect(gk.name)}
                      >
                        {gk.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Line players from the list */}
              {filteredLinePlayers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    Jogadores da lista:
                  </p>
                  <div className="space-y-2">
                    {filteredLinePlayers.map((player, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-start text-foreground hover:bg-primary/10 border-border"
                        onClick={() => handleSelect(player.name)}
                      >
                        {player.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {filteredAvailable.length === 0 && registeredGks.length === 0 && filteredLinePlayers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum jogador disponível
                </p>
              )}

              {/* Custom goalkeeper option */}
              <Button
                variant="secondary"
                className="w-full gap-2 flex-shrink-0"
                onClick={() => setShowCustomInput(true)}
              >
                <Plus className="w-4 h-4" />
                Outra Pessoa do Fora
              </Button>
            </div>
          ) : (
            <>
              {/* Custom goalkeeper input */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Digite o nome da pessoa que vai pegar no gol:
                </p>
                <Input
                  placeholder="Nome do goleiro"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCustomSubmit();
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 hover:bg-muted/50"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomName('');
                  }}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
                  onClick={handleCustomSubmit}
                  disabled={!customName.trim()}
                >
                  Confirmar
                </Button>
              </div>
            </>
          )}

          {/* Cancel */}
          {!showCustomInput && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground flex-shrink-0 hover:bg-muted/50 hover:text-muted-foreground"
              onClick={onClose}
            >
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};