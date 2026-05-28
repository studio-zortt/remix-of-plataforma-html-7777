import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Undo2 } from 'lucide-react';
import substituicaoIcon from '@/assets/substituicao-icon.svg';

interface ParsedPlayer {
  id?: string;
  name: string;
  isSeed: boolean;
  seedLevel: number;
}

interface ReplacePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  playerName: string;
  playerIndex: number;
  availablePlayers: ParsedPlayer[];
  availableGoalkeepersForLine?: ParsedPlayer[];
  getPlayerTeam: (playerName: string) => number | null;
  onReplaceWithExisting: (player: ParsedPlayer) => void;
  onReplaceWithNew: (name: string) => void;
  onGiveYellowCard?: () => void;
  onGiveRedCard?: () => void;
  onRemoveYellowCard?: () => void;
  onRemoveRedCard?: () => void;
  isExpelled?: boolean;
  cards?: { yellow: number; red: boolean };
}

export const ReplacePlayerModal = ({
  isOpen,
  onClose,
  teamId,
  playerName,
  availablePlayers,
  availableGoalkeepersForLine = [],
  getPlayerTeam,
  onReplaceWithExisting,
  onReplaceWithNew,
  onGiveYellowCard,
  onGiveRedCard,
  onRemoveYellowCard,
  onRemoveRedCard,
  isExpelled = false,
  cards = { yellow: 0, red: false },
}: ReplacePlayerModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPlayerInput, setShowNewPlayerInput] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = availablePlayers.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReplaceExisting = (player: ParsedPlayer) => {
    onReplaceWithExisting(player);
    onClose();
    setSearchTerm('');
    setShowNewPlayerInput(false);
    setNewPlayerName('');
  };

  const handleReplaceNew = () => {
    if (newPlayerName.trim()) {
      onReplaceWithNew(newPlayerName.trim());
      onClose();
      setSearchTerm('');
      setShowNewPlayerInput(false);
      setNewPlayerName('');
    }
  };

  const getLevelLabel = (player: ParsedPlayer) => {
    if (!player.isSeed) return null;
    if (player.seedLevel === 1) return 'Cabeça de chave';
    return `Nível ${player.seedLevel}`;
  };

  const hasCards = cards.yellow > 0 || cards.red;

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-28 sm:pt-32"
      onClick={(e) => {
        // Close when clicking on the overlay (outside the card)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-md bg-card border-border max-h-[70vh] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="text-lg font-bold truncate max-w-[240px]">{playerName}</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-muted/50">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
          {/* Cartões abaixo do nome */}
          {hasCards && (
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
          {(onGiveYellowCard || onGiveRedCard) && !isExpelled && (
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
          {hasCards && (onRemoveYellowCard || onRemoveRedCard) && (
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

          {/* Separator - Substituir jogador */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-4">
            <div className="flex-1 h-px bg-border/50" />
            <div className="flex items-center gap-2">
              <img src={substituicaoIcon} alt="" className="w-5 h-5" />
              <span className="text-base font-semibold text-foreground">Substituir jogador</span>
            </div>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {!showNewPlayerInput ? (
            <div className="overflow-y-auto flex-1 space-y-4 min-h-0">
              {/* Search */}
              <div className="relative flex-shrink-0 mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Player list - Jogadores de linha */}
              <div className="space-y-2">
                {filteredPlayers.length > 0 && (
                  <p className="text-xs text-muted-foreground">Jogadores de linha:</p>
                )}
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, idx) => {
                    const playerTeam = getPlayerTeam(player.name);
                    const levelLabel = getLevelLabel(player);
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-between text-foreground hover:bg-muted/50 border-border"
                        onClick={() => handleReplaceExisting(player)}
                      >
                        <span className="truncate max-w-[120px] sm:max-w-[160px]">{player.name}</span>
                        <div className="flex gap-1.5 ml-2 flex-shrink-0">
                          {playerTeam && (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                              T{playerTeam}
                            </span>
                          )}
                          {levelLabel && (
                            <span className="text-xs text-primary bg-primary/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                              {levelLabel}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })
                ) : null}
              </div>

              {/* AJUSTE 4: Goleiros disponíveis para jogar na linha */}
              {availableGoalkeepersForLine.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Goleiros (para jogar na linha):</p>
                  {availableGoalkeepersForLine.map((gk, idx) => {
                    const playerTeam = getPlayerTeam(gk.name);
                    return (
                      <Button
                        key={`gk-${idx}`}
                        variant="outline"
                        className="w-full justify-between text-foreground hover:bg-primary/10 border-border"
                        onClick={() => handleReplaceExisting(gk)}
                      >
                        <span className="truncate max-w-[120px] sm:max-w-[160px]">{gk.name}</span>
                        <div className="flex gap-1.5 ml-2 flex-shrink-0">
                          {playerTeam && (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                              T{playerTeam}
                            </span>
                          )}
                          <span className="text-xs text-primary bg-primary/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Goleiro
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}

              {filteredPlayers.length === 0 && availableGoalkeepersForLine.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum jogador disponível
                </p>
              )}

              {/* Create new player option */}
              <Button
                variant="secondary"
                className="w-full gap-2 flex-shrink-0"
                onClick={() => setShowNewPlayerInput(true)}
              >
                <Plus className="w-4 h-4" />
                Outro Jogador (Novo)
              </Button>
            </div>
          ) : (
            <>
              {/* New player input */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Digite o nome do jogador substituto:
                </p>
                <Input
                  placeholder="Nome do jogador"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleReplaceNew();
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 hover:bg-muted/50"
                  onClick={() => {
                    setShowNewPlayerInput(false);
                    setNewPlayerName('');
                  }}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground"
                  onClick={handleReplaceNew}
                  disabled={!newPlayerName.trim()}
                >
                  Substituir
                </Button>
              </div>
            </>
          )}

          {/* Cancel */}
          {!showNewPlayerInput && (
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
