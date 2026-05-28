import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MiniPitch } from "@/components/MiniPitch";
import { WhatsappListHelp } from "@/components/WhatsappListHelp";
import {
  ArrowLeft,
  Copy,
  Key,
  Codepen,
  Minus,
  Plus,
  RefreshCw,
  Download,
  Users,
  AlertCircle,
  BarChart3,
  
  Check,
  UsersRound,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
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
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import logoHeader from "@/assets/logo-header-v2.svg";
import luvaGoleiro from "@/assets/luva-goleiro.svg";
import ballIcon from "@/assets/ball-icon.svg";
import stadiumBg from "@/assets/stadium-background.webp";
import teamShield from "@/assets/team-shield.svg";
import { parseWhatsAppList } from "@/lib/whatsappParser";
import {
  generateTeamsLogic,
  type ParsedPlayers,
  type GeneratedTeam,
  type GeneratedPlayer,
} from "@/lib/teamsGenerator";
import { downloadTeamsImage } from "@/lib/teamsImageGenerator";

type FieldType = "quadra" | "society" | "campo" | "custom";

interface QuickConfig {
  fieldType: FieldType;
  playersPerTeam: number;
}

const QuickSort = () => {
  const navigate = useNavigate();

  const [whatsappList, setWhatsappList] = useState("");
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayers | null>(null);
  const [config, setConfig] = useState<QuickConfig>({
    fieldType: "quadra",
    playersPerTeam: 5,
  });
  const [teams, setTeams] = useState<GeneratedTeam[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showSeedBadge, setShowSeedBadge] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Edit player dialog
  const [editingPlayer, setEditingPlayer] = useState<{
    teamId: number;
    playerIndex: number;
    player: GeneratedPlayer;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeedLevel, setEditSeedLevel] = useState("0");

  // Edit goalkeeper dialog
  const [editingGoalkeeper, setEditingGoalkeeper] = useState<{
    teamId: number;
    goalkeeper: GeneratedPlayer;
  } | null>(null);

  // Add player / goalkeeper dialogs
  const [addPlayerTeamId, setAddPlayerTeamId] = useState<number | null>(null);
  const [addGoalkeeperTeamId, setAddGoalkeeperTeamId] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");

  // Auto-parse list as user types (debounced)
  useEffect(() => {
    if (!whatsappList.trim()) {
      setParsedPlayers(null);
      return;
    }
    const t = setTimeout(() => {
      const parsed = parseWhatsAppList(whatsappList);
      setParsedPlayers(parsed.main.length > 0 ? parsed : null);
    }, 300);
    return () => clearTimeout(t);
  }, [whatsappList]);

  const totalPlayers = parsedPlayers?.main.length ?? 0;

  const handleFieldTypeChange = (value: FieldType) => {
    let defaultPlayers = 5;
    if (value === "society") defaultPlayers = 7;
    else if (value === "campo") defaultPlayers = 11;
    else if (value === "custom") defaultPlayers = config.playersPerTeam;
    setConfig({ fieldType: value, playersPerTeam: defaultPlayers });
  };

  const adjustPlayers = (inc: boolean) => {
    const v = inc ? config.playersPerTeam + 1 : config.playersPerTeam - 1;
    if (v >= 3 && v <= 11) setConfig({ ...config, playersPerTeam: v });
  };

  const handleGenerate = () => {
    if (!parsedPlayers || parsedPlayers.main.length === 0) {
      toast.error("Cole a lista do WhatsApp primeiro!");
      return;
    }
    if (parsedPlayers.main.length < config.playersPerTeam - 1) {
      toast.error("Jogadores insuficientes para formar um time!");
      return;
    }
    const result = generateTeamsLogic(parsedPlayers, config.playersPerTeam);
    setTeams(result.teams);
    setQueue(result.queue);
    setHasGenerated(true);
    toast.success(`${result.teams.length} times sorteados!`);
    // Scroll to top of teams section
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleRegenerate = () => {
    if (!parsedPlayers) return;
    const result = generateTeamsLogic(parsedPlayers, config.playersPerTeam);
    setTeams(result.teams);
    setQueue(result.queue);
    toast.success("Times sorteados novamente!");
  };

  const handleCopyTeams = () => {
    let text = `⚽ *Times do Baba de hoje*\n\n`;
    teams.forEach((team) => {
      text += `📋 *Time ${team.id}*\n`;
      team.players.forEach((p, idx) => {
        let line = `   ${idx + 1}. ${p.name}`;
        if (showSeedBadge && p.isSeed) {
          if (!p.seedLevel || p.seedLevel === 1) line += " 🔑";
          else line += ` ${p.seedLevel}`;
        }
        text += line + "\n";
      });
      if (team.goalkeeper) text += `🥅 Goleiro: ${team.goalkeeper.name}\n\n`;
      else text += `🥅 Goleiro: Sem goleiro\n\n`;
    });
    if (queue.length > 0) {
      text += `⏳ *FILA DE ESPERA*\n`;
      queue.forEach((p, idx) => {
        text += `   ${idx + 1}. ${p}\n`;
      });
    }
    navigator.clipboard.writeText(text);
    toast.success("Times copiados!");
  };

  const handleDownloadImage = async () => {
    if (isDownloadingImage) return;
    setIsDownloadingImage(true);
    try {
      await downloadTeamsImage({
        teams: teams.map((t) => ({
          id: t.id,
          players: t.players.map((p) => ({
            name: p.name,
            isSeed: p.isSeed,
            seedLevel: p.seedLevel,
          })),
          goalkeeper: t.goalkeeper ? { name: t.goalkeeper.name } : null,
          isComplete: t.isComplete,
        })),
        queue,
        showSeedBadge,
      });
      toast.success("Imagem dos times baixada!");
    } catch (err) {
      console.error("Error generating image:", err);
      toast.error("Erro ao gerar imagem");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleEditPlayer = (teamId: number, playerIndex: number, player: GeneratedPlayer) => {
    setEditingPlayer({ teamId, playerIndex, player });
    setEditName(player.name);
    setEditSeedLevel(player.seedLevel?.toString() || "0");
  };

  useEffect(() => {
    if (editingGoalkeeper) setEditName(editingGoalkeeper.goalkeeper.name);
  }, [editingGoalkeeper]);

  const handleSavePlayerEdit = () => {
    if (!editingPlayer) return;
    const updated = teams.map((team) => {
      if (team.id === editingPlayer.teamId) {
        const players = [...team.players];
        players[editingPlayer.playerIndex] = {
          ...players[editingPlayer.playerIndex],
          name: editName,
          isSeed: parseInt(editSeedLevel) > 0,
          seedLevel: parseInt(editSeedLevel),
        };
        return { ...team, players };
      }
      return team;
    });
    setTeams(updated);
    setEditingPlayer(null);
    toast.success("Jogador atualizado!");
  };

  const handleSaveGoalkeeperEdit = () => {
    if (!editingGoalkeeper) return;
    const updated = teams.map((team) => {
      if (team.id === editingGoalkeeper.teamId && team.goalkeeper) {
        return { ...team, goalkeeper: { ...team.goalkeeper, name: editName } };
      }
      return team;
    });
    setTeams(updated);
    setEditingGoalkeeper(null);
    toast.success("Goleiro atualizado!");
  };

  const handleAddPlayer = () => {
    if (addPlayerTeamId === null || !newPlayerName.trim()) return;
    const updated = teams.map((team) => {
      if (team.id === addPlayerTeamId) {
        return {
          ...team,
          players: [
            ...team.players,
            {
              name: newPlayerName.trim(),
              isGoalkeeper: false,
              originalTeam: team.id,
              isBorrowed: false,
              isSeed: false,
            },
          ],
          isComplete: team.players.length + 1 === config.playersPerTeam - 1,
        };
      }
      return team;
    });
    setTeams(updated);
    setAddPlayerTeamId(null);
    setNewPlayerName("");
    toast.success("Jogador adicionado!");
  };

  const handleAddGoalkeeper = () => {
    if (addGoalkeeperTeamId === null || !newPlayerName.trim()) return;
    const updated = teams.map((team) => {
      if (team.id === addGoalkeeperTeamId) {
        return {
          ...team,
          goalkeeper: {
            name: newPlayerName.trim(),
            isGoalkeeper: true,
            originalTeam: team.id,
            isBorrowed: false,
            isSeed: false,
          },
        };
      }
      return team;
    });
    setTeams(updated);
    setAddGoalkeeperTeamId(null);
    setNewPlayerName("");
    toast.success("Goleiro adicionado!");
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <div className="fixed-bg" style={{ backgroundImage: `url(${stadiumBg})` }} />
      <div className="fixed inset-0 bg-background/50 z-10" />

      <AudioControls />

      <div className="relative z-20 flex-1 flex flex-col">
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">
                  {hasGenerated ? "Times Gerados" : "Sortear Times"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {hasGenerated && config
                    ? `${teams.length} times • ${config.playersPerTeam} jogadores/time`
                    : "Modo rápido — sem salvar nada"}
                </p>
              </div>
              {hasGenerated && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    className="hidden sm:flex border-[hsl(214_15%_82%/0.5)] text-[hsl(214_15%_82%)] bg-[hsl(214_15%_82%/0.1)] hover:bg-[hsl(214_15%_82%/0.2)] hover:text-[hsl(214_15%_82%)] hover:border-[hsl(214_15%_82%/0.7)]"
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
                    <span className="hidden lg:inline">{isDownloadingImage ? "Gerando..." : "Baixar Imagem"}</span>
                  </Button>
                </>
              )}
              <img src={logoHeader} alt="Baba Play" className="h-7 hidden md:block" />
              <AppMenu />
            </div>
          </div>
        </header>

        <main className={`container mx-auto px-4 py-8 flex-1 pb-28 sm:pb-8 ${!hasGenerated ? 'max-w-4xl' : ''}`}>
          {!hasGenerated ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Lista do WhatsApp */}
                <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-card rounded-3xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Copy className="w-5 h-5 text-[hsl(214_15%_82%)]" />
                      Cole a lista do Whatsapp
                    </CardTitle>
                    <CardDescription>
                      {parsedPlayers && totalPlayers > 0
                        ? `${totalPlayers} jogadores detectados${
                            parsedPlayers.goalkeepers.length > 0
                              ? ` • ${parsedPlayers.goalkeepers.length} goleiros`
                              : ""
                          }`
                        : "Os jogadores são detectados automaticamente"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={whatsappList}
                      onChange={(e) => setWhatsappList(e.target.value)}
                      className="min-h-[260px] font-mono text-sm bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-[hsl(214_15%_82%)] focus-visible:border-[hsl(214_15%_82%)]"
                      placeholder={`1. João Silva *\n2. Pedro Santos\n3. Carlos Oliveira #\n4. Lucas Ferreira\n5. Bruno Costa\n...\n\nGoleiros:\n- Marcos\n- Rafael`}
                    />
                    <WhatsappListHelp />
                    {parsedPlayers && totalPlayers > 0 && (
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold mb-2 text-base text-[hsl(214_15%_82%)]">
                            Jogadores Detectados ({parsedPlayers.main.length})
                          </h3>
                          <div className="bg-muted/30 rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-1">
                            {parsedPlayers.main.map((p, idx) => (
                              <div
                                key={idx}
                                className={`text-sm py-1.5 px-2 rounded-lg flex items-center justify-between ${
                                  p.isSeed && p.seedLevel === 1 ? "bg-star-gold/20" : ""
                                }`}
                              >
                                <span className="text-foreground">
                                  {idx + 1}. {p.name}
                                </span>
                                {p.isSeed &&
                                  (p.seedLevel === 1 ? (
                                    <Badge className="bg-star-gold text-background text-xs flex items-center gap-1">
                                      <Key className="w-3 h-3" />
                                      Cabeça
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Nível {p.seedLevel}
                                    </Badge>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        {parsedPlayers.goalkeepers.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2 text-sm text-[hsl(214_15%_82%)]">
                              Goleiros ({parsedPlayers.goalkeepers.length})
                            </h3>
                            <div className="bg-muted/30 rounded-xl p-3 max-h-[120px] overflow-y-auto">
                              {parsedPlayers.goalkeepers.map((g, idx) => (
                                <div key={idx} className="text-sm py-1 px-2 hover:bg-background/50 rounded-lg text-foreground">
                                  {g.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Configuração */}
                <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-card rounded-3xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Codepen className="w-5 h-5 text-[hsl(214_15%_82%)]" />
                      Configuração
                    </CardTitle>
                    <CardDescription>Escolha o tipo de campo e jogadores por time</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={config.fieldType}
                      onValueChange={(v) => handleFieldTypeChange(v as FieldType)}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2.5">
                        {[
                          { v: "quadra", l: "Quadra", d: "4 linha + 1 goleiro (5)" },
                          { v: "society", l: "Society", d: "6 linha + 1 goleiro (7)" },
                          { v: "campo", l: "Campo", d: "10 linha + 1 goleiro (11)" },
                          { v: "custom", l: "Personalizado", d: "Defina manualmente" },
                        ].map((opt) => {
                          const isSelected = config.fieldType === opt.v;
                          return (
                            <label
                              key={opt.v}
                              htmlFor={`q-${opt.v}`}
                              className={`flex flex-col gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-primary/60 bg-primary/5"
                                  : "border-border/30 bg-muted/20 hover:bg-muted/30 hover:border-border/50"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value={opt.v}
                                  id={`q-${opt.v}`}
                                  className="border-[hsl(214_15%_82%)] text-[hsl(214_15%_82%)]"
                                />
                                <div className="flex-1">
                                  <div className="font-semibold text-foreground leading-tight">{opt.l}</div>
                                  <div className="text-xs text-muted-foreground">{opt.d}</div>
                                </div>
                              </div>
                              <div className="w-full aspect-[200/110]">
                                <MiniPitch
                                  variant={opt.v as "quadra" | "society" | "campo" | "custom"}
                                  selected={isSelected}
                                />
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </RadioGroup>

                    {config.fieldType === "custom" && (
                      <div className="pt-2">
                        <Label className="text-foreground text-sm mb-3 block">
                          Jogadores por time (incluindo goleiro)
                        </Label>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => adjustPlayers(false)}
                            className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-[hsl(214_15%_82%/0.2)] text-muted-foreground hover:text-[hsl(214_15%_82%)] flex items-center justify-center"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="w-20 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                            <span className="text-2xl font-bold text-foreground">{config.playersPerTeam}</span>
                          </div>
                          <button
                            onClick={() => adjustPlayers(true)}
                            className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-[hsl(214_15%_82%/0.2)] text-muted-foreground hover:text-[hsl(214_15%_82%)] flex items-center justify-center"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sortear — botão CTA padrão da plataforma */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={!parsedPlayers || totalPlayers === 0}
                  className="group btn-cta-green px-10 py-6 text-lg"
                >
                  <span>Sortear Times</span>
                  <img src={ballIcon} alt="" className="w-5 h-5 ml-1.5 animate-spin-ball" />
                </Button>
              </div>

              {/* Dicas */}
              <Card className="bg-card/60 backdrop-blur-xl border border-[hsl(214_15%_82%/0.3)] rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg">Dicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="gap-3 flex items-start">
                    <AlertCircle className="text-[hsl(214_15%_82%)] flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                    <p>Linhas vazias e numeração são ignoradas automaticamente</p>
                  </div>
                  <div className="gap-3 flex items-start">
                    <AlertCircle className="text-[hsl(214_15%_82%)] flex-shrink-0 mt-0.5 h-[18px] w-[18px]" />
                    <p>Identifique goleiros com "Goleiros:" antes da lista deles</p>
                  </div>
                  <div className="gap-3 flex items-start">
                    <Key className="text-star-gold flex-shrink-0 mt-0.5 w-[18px] h-[18px]" />
                    <div>
                      <p className="text-star-gold font-medium">
                        Marque cabeças de chave com *, # ou @ (ex: "João *")
                      </p>
                      <p className="text-xs mt-1">Use @2, @3 para mais níveis de equilíbrio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Times Gerados */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className={`bg-card/60 backdrop-blur-xl shadow-card border transition-all hover:shadow-elevated rounded-3xl ${
                      team.isComplete ? "border-border/30 hover:border-primary/30" : "border-destructive/50"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20">
                          <img src={teamShield} alt="" className="w-6 h-6" />
                          <span className="font-bold text-[hsl(142_70%_60%)] text-base">Time {team.id}</span>
                        </span>
                        {!team.isComplete && (
                          <Badge variant="destructive" className="text-xs py-[4px] px-[12px]">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Incompleto
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {team.goalkeeper ? (
                        <div
                          className="group p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() =>
                            setEditingGoalkeeper({ teamId: team.id, goalkeeper: team.goalkeeper! })
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1.5"><img src={luvaGoleiro} alt="" className="w-3 h-3" />GOLEIRO</div>
                              <div className="font-semibold text-foreground">{team.goalkeeper.name}</div>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddGoalkeeperTeamId(team.id); setNewPlayerName(""); }}
                          className="w-full p-3 rounded-xl bg-primary/5 border border-dashed border-primary/30 hover:bg-primary/15 hover:border-primary/50 transition-colors"
                        >
                          <div className="text-xs text-primary font-semibold mb-1 flex items-center justify-center gap-1.5"><img src={luvaGoleiro} alt="" className="w-3 h-3" />GOLEIRO</div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <UserPlus className="w-4 h-4" />
                            <span>Adicionar goleiro</span>
                          </div>
                        </button>
                      )}
                      <div>
                        <div className="text-xs text-muted-foreground font-semibold mb-2">
                          JOGADORES DE LINHA ({team.players.length})
                        </div>
                        <div className="space-y-1">
                          {team.players.map((player, idx) => {
                            const isLevel1Seed = player.isSeed && (!player.seedLevel || player.seedLevel === 1);
                            const isOtherSeed = player.isSeed && player.seedLevel && player.seedLevel > 1;
                            let cardClasses = "bg-muted/50";
                            let textClasses = "text-foreground";
                            if (showSeedBadge && isLevel1Seed) {
                              cardClasses = "bg-star-gold/15 border border-star-gold/30";
                              textClasses = "text-star-gold font-medium";
                            } else if (showSeedBadge && isOtherSeed) {
                              cardClasses = "bg-[hsl(222_47%_18%)] border border-[hsl(222_47%_25%)]";
                              textClasses = "text-white font-medium";
                            }
                            return (
                              <div
                                key={idx}
                                className={`group text-sm py-2 px-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer hover:bg-muted/70 ${cardClasses}`}
                                onClick={() => handleEditPlayer(team.id, idx, player)}
                              >
                                <span className={textClasses}>{player.name}</span>
                                <div className="flex gap-1 items-center">
                                  {showSeedBadge && player.isSeed && (
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                        isLevel1Seed ? "bg-star-gold/20" : "bg-white/10"
                                      }`}
                                    >
                                      {!player.seedLevel || player.seedLevel === 1 ? (
                                        <Key className="w-3 h-3 text-star-gold" />
                                      ) : (
                                        <span className="text-xs font-bold text-white">{player.seedLevel}</span>
                                      )}
                                    </div>
                                  )}
                                  <MoreHorizontal className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                            );
                          })}

                          {team.players.length < config.playersPerTeam - 1 &&
                            Array.from({ length: config.playersPerTeam - 1 - team.players.length }).map((_, idx) => (
                              <button
                                key={`empty-${idx}`}
                                onClick={() => { setAddPlayerTeamId(team.id); setNewPlayerName(""); }}
                                className="w-full text-sm py-2 px-3 rounded-xl text-center font-medium bg-muted/30 border border-dashed border-muted-foreground/40 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                              >
                                <span className="text-muted-foreground flex items-center justify-center gap-1">
                                  <UserPlus className="w-4 h-4" />
                                  Adicionar jogador
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Fila de Espera */}
              {queue.length > 0 && (
                <Card className="bg-card/60 backdrop-blur-xl border border-border/30 mb-6 rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      Fila de Espera ({queue.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {queue.map((p, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm bg-muted/50">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Toggle níveis */}
              <Card className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-star-gold/20 flex items-center justify-center">
                        <BarChart3 className="text-star-gold w-[20px] h-[20px]" />
                      </div>
                      <Label htmlFor="show-seed-quick" className="text-foreground font-medium">
                        Mostrar níveis de jogadores
                      </Label>
                    </div>
                    <Switch
                      id="show-seed-quick"
                      checked={showSeedBadge}
                      onCheckedChange={setShowSeedBadge}
                      className="data-[state=unchecked]:bg-[hsl(214_15%_25%)] data-[state=checked]:bg-[hsl(214_15%_82%)] [&>span]:bg-[hsl(222_47%_15%)]"
                    />
                  </div>
                </CardContent>
              </Card>

            </>
          )}
        </main>

        {/* Mobile fixed action bar - same gradient as Teams page */}
        {hasGenerated && (
          <div className="fixed bottom-0 left-0 right-0 pt-16 px-4 pb-10 z-30 sm:hidden bg-gradient-to-t from-background via-background/90 to-transparent">
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                className="flex-1 px-2 gap-1 border-[hsl(214_15%_82%/0.5)] text-[hsl(214_15%_82%)] bg-[hsl(214_15%_82%/0.1)] hover:bg-[hsl(214_15%_82%/0.2)]"
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
          </div>
        )}

        <Footer />
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Jogador</DialogTitle>
            <DialogDescription>Altere o nome ou nível do jogador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qPlayerName">Nome</Label>
              <Input
                id="qPlayerName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-input/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qSeedLevel">Nível do jogador</Label>
              <Select value={editSeedLevel} onValueChange={setEditSeedLevel}>
                <SelectTrigger className="bg-input/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: Math.max(1, config.playersPerTeam - 1) },
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
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingPlayer(null)}
              className="w-full sm:w-auto border-border/50 text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePlayerEdit} className="w-full sm:w-auto rounded-xl bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground">
              <Check className="w-4 h-4 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goalkeeper Dialog */}
      <Dialog open={!!editingGoalkeeper} onOpenChange={(open) => !open && setEditingGoalkeeper(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Goleiro</DialogTitle>
            <DialogDescription>Altere o nome do goleiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qGoalkeeperName">Nome</Label>
              <Input
                id="qGoalkeeperName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-input/50 border-border/50"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingGoalkeeper(null)}
              className="w-full sm:w-auto border-border/50 text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveGoalkeeperEdit} className="w-full sm:w-auto rounded-xl bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground">
              <Check className="w-4 h-4 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerTeamId !== null} onOpenChange={(open) => !open && setAddPlayerTeamId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Jogador</DialogTitle>
            <DialogDescription>Informe o nome do jogador.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="qAddPlayerName">Nome</Label>
            <Input
              id="qAddPlayerName"
              autoFocus
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="bg-input/50 border-border/50 mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddPlayerTeamId(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleAddPlayer} className="w-full sm:w-auto rounded-xl bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground">
              <Check className="w-4 h-4 mr-1.5" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goalkeeper Dialog */}
      <Dialog open={addGoalkeeperTeamId !== null} onOpenChange={(open) => !open && setAddGoalkeeperTeamId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Goleiro</DialogTitle>
            <DialogDescription>Informe o nome do goleiro.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="qAddGkName">Nome</Label>
            <Input
              id="qAddGkName"
              autoFocus
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="bg-input/50 border-border/50 mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleAddGoalkeeper()}
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddGoalkeeperTeamId(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleAddGoalkeeper} className="w-full sm:w-auto rounded-xl bg-[#1B7A38] hover:bg-[#1f8a3e] text-primary-foreground">
              <Check className="w-4 h-4 mr-1.5" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickSort;
