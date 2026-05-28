import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Plus, X } from 'lucide-react';

interface ParsedPlayer {
  id?: string;
  name: string;
  isSeed: boolean;
  seedLevel: number;
}

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamIndex: number;
  availablePlayers: ParsedPlayer[];
  getPlayerTeam: (playerName: string) => number | null;
  onAddExistingPlayer: (player: ParsedPlayer) => void;
  onCreateNewPlayer: (name: string) => void;
}

export const AddPlayerModal = ({
  isOpen,
  onClose,
  teamId,
  availablePlayers,
  getPlayerTeam,
  onAddExistingPlayer,
  onCreateNewPlayer,
}: AddPlayerModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPlayerInput, setShowNewPlayerInput] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = availablePlayers.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddExisting = (player: ParsedPlayer) => {
    onAddExistingPlayer(player);
    onClose();
    setSearchTerm('');
    setShowNewPlayerInput(false);
    setNewPlayerName('');
  };

  const handleCreateNew = () => {
    if (newPlayerName.trim()) {
      onCreateNewPlayer(newPlayerName.trim());
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border max-h-[80vh] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <span>Adicionar Jogador ao Time {teamId}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-muted/50">
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden flex flex-col flex-1 pt-2">
          {!showNewPlayerInput ? (
            <>
              {/* Search */}
              <div className="relative flex-shrink-0 mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Player list */}
              <div className="space-y-2 overflow-y-auto max-h-[40vh] flex-1">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, idx) => {
                    const playerTeam = getPlayerTeam(player.name);
                    const levelLabel = getLevelLabel(player);
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-between text-foreground hover:bg-muted/50 border-border"
                        onClick={() => handleAddExisting(player)}
                      >
                        <span>{player.name}</span>
                        <div className="flex gap-1.5 ml-2">
                          {playerTeam && (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              Time {playerTeam}
                            </span>
                          )}
                          {levelLabel && (
                            <span className="text-xs text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                              {levelLabel}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum jogador disponível
                  </p>
                )}
              </div>

              {/* Create new player option */}
              <Button
                variant="secondary"
                className="w-full gap-2 flex-shrink-0"
                onClick={() => setShowNewPlayerInput(true)}
              >
                <Plus className="w-4 h-4" />
                Cadastrar Novo Jogador
              </Button>
            </>
          ) : (
            <>
              {/* New player input */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Digite o nome do novo jogador para cadastrar:
                </p>
                <Input
                  placeholder="Nome do jogador"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNew();
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
                  onClick={handleCreateNew}
                  disabled={!newPlayerName.trim()}
                >
                  Cadastrar e Adicionar
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
