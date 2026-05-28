import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Clock, Minus, Plus, Codepen, Edit3, Check, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useBaba } from "@/contexts/BabaContext";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import BallLoader from "@/components/BallLoader";
import logoHeader from "@/assets/logo-header-v2.svg";
import stadiumBg from "@/assets/stadium-background.webp";
import { MiniPitch } from "@/components/MiniPitch";
type FieldType = 'quadra' | 'society' | 'campo' | 'custom';
type WinCriteria = 'time' | '2goals' | '3goals' | 'time-or-2' | 'time-or-3' | string;
interface GameConfig {
  fieldType: FieldType;
  playersPerTeam: number;
  gameDuration: number;
  winCriteria: WinCriteria;
  team1ChoosesShirt: boolean;
}
const ConfigureGame = () => {
  const navigate = useNavigate();
  const {
    parsedPlayers,
    setConfig: setBabaConfig,
    currentBaba,
    savePlayers,
    updateBaba,
    loading: contextLoading,
    hydrated: contextHydrated,
    rawPlayerList,
    teams: contextTeams
  } = useBaba();
  const [babaCustomName, setBabaCustomName] = useState("");
  const [customGoals, setCustomGoals] = useState(4);
  const [config, setConfig] = useState<GameConfig>({
    fieldType: 'quadra',
    playersPerTeam: 5,
    gameDuration: 7,
    winCriteria: 'time-or-2',
    team1ChoosesShirt: true
  });

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of last saved values to compare against
  const lastSavedRef = useRef<{
    fieldType: string;
    playersPerTeam: number;
    gameDuration: number;
    winCriteria: string;
    name: string;
  } | null>(null);
  const savedBabaId = localStorage.getItem('currentBabaId');
  useEffect(() => {
    // If editing an existing baba, hydrate the form from it
    if (currentBaba) {
      const hydratedConfig = {
        fieldType: currentBaba.fieldType as FieldType,
        playersPerTeam: currentBaba.playersPerTeam,
        gameDuration: currentBaba.gameDuration,
        winCriteria: currentBaba.winCriteria as WinCriteria,
        team1ChoosesShirt: true
      };
      setConfig(hydratedConfig);

      // Restore customGoals if winCriteria is custom
      const wc = currentBaba.winCriteria;
      if (wc.startsWith('custom-')) {
        const parsed = parseInt(wc.replace('custom-', ''), 10);
        if (!isNaN(parsed)) setCustomGoals(parsed);
      } else if (wc.startsWith('time-or-custom-')) {
        const parsed = parseInt(wc.replace('time-or-custom-', ''), 10);
        if (!isNaN(parsed)) setCustomGoals(parsed);
      }

      // Determine custom name
      const customName = currentBaba.name && !currentBaba.name.startsWith('Baba ') ? currentBaba.name : "";
      setBabaCustomName(customName);

      // Set snapshot to current values so hydration doesn't trigger auto-save
      lastSavedRef.current = {
        fieldType: hydratedConfig.fieldType,
        playersPerTeam: hydratedConfig.playersPerTeam,
        gameDuration: hydratedConfig.gameDuration,
        winCriteria: hydratedConfig.winCriteria,
        name: customName
      };
      return;
    }

    // Novo Baba: sempre iniciar com valores padrão (sem herdar de outro)
    const defaultConfig = {
      fieldType: 'quadra' as FieldType,
      playersPerTeam: 5,
      gameDuration: 7,
      winCriteria: 'time-or-2' as WinCriteria,
      team1ChoosesShirt: true
    };
    setConfig(defaultConfig);
    setBabaCustomName("");
    // Set snapshot for new baba defaults
    lastSavedRef.current = {
      fieldType: defaultConfig.fieldType,
      playersPerTeam: defaultConfig.playersPerTeam,
      gameDuration: defaultConfig.gameDuration,
      winCriteria: defaultConfig.winCriteria,
      name: ""
    };
  }, [currentBaba?.id]);
  useEffect(() => {
    // Wait for hydration before checking for missing data
    if (!contextHydrated) return;

    // Need either currentBaba (draft flow) OR parsedPlayers from session
    if (!currentBaba && !parsedPlayers) {
      toast.error("Nenhuma lista importada!");
      navigate('/import-list');
    }
  }, [navigate, parsedPlayers, currentBaba, contextHydrated]);

  // Auto-save config when it changes (debounced)
  const autoSaveConfig = useCallback(async () => {
    if (!currentBaba) return;
    setSaveStatus('saving');
    const updates: any = {
      fieldType: config.fieldType,
      playersPerTeam: config.playersPerTeam,
      gameDuration: config.gameDuration,
      winCriteria: config.winCriteria,
      timeLeft: config.gameDuration * 60
    };
    if (babaCustomName.trim()) {
      updates.name = babaCustomName.trim();
    }
    const result = await updateBaba(updates);
    if (result.success) {
      // Update snapshot to new saved values
      lastSavedRef.current = {
        fieldType: config.fieldType,
        playersPerTeam: config.playersPerTeam,
        gameDuration: config.gameDuration,
        winCriteria: config.winCriteria,
        name: babaCustomName
      };
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      toast.error("Não foi possível salvar. Tente novamente.");
    }
  }, [config, babaCustomName, currentBaba, updateBaba]);

  // Trigger auto-save on config/name changes (with debounce) - ONLY when user changes something
  useEffect(() => {
    // Don't auto-save if no baba
    if (!currentBaba) return;

    // Don't auto-save if no snapshot yet (still hydrating)
    if (!lastSavedRef.current) return;

    // Check if values actually changed from last saved snapshot
    const currentValues = {
      fieldType: config.fieldType,
      playersPerTeam: config.playersPerTeam,
      gameDuration: config.gameDuration,
      winCriteria: config.winCriteria,
      name: babaCustomName
    };
    const hasChanges = currentValues.fieldType !== lastSavedRef.current.fieldType || currentValues.playersPerTeam !== lastSavedRef.current.playersPerTeam || currentValues.gameDuration !== lastSavedRef.current.gameDuration || currentValues.winCriteria !== lastSavedRef.current.winCriteria || currentValues.name !== lastSavedRef.current.name;

    // If nothing changed, don't save
    if (!hasChanges) {
      setSaveStatus('idle');
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for debounced save
    saveTimerRef.current = setTimeout(() => {
      autoSaveConfig();
    }, 800);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [config.fieldType, config.playersPerTeam, config.gameDuration, config.winCriteria, babaCustomName, currentBaba?.id, autoSaveConfig]);

  // Flush save on page exit
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && saveTimerRef.current && currentBaba) {
        clearTimeout(saveTimerRef.current);
        autoSaveConfig();
      }
    };
    const handlePageHide = () => {
      if (saveTimerRef.current && currentBaba) {
        clearTimeout(saveTimerRef.current);
        autoSaveConfig();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [autoSaveConfig, currentBaba]);

  // Show loading while hydrating
  if (contextLoading || !contextHydrated || savedBabaId && !currentBaba) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }
  const handleFieldTypeChange = (value: FieldType) => {
    let defaultPlayers = 6;
    switch (value) {
      case 'quadra':
        defaultPlayers = 5;
        break;
      case 'society':
        defaultPlayers = 7;
        break;
      case 'campo':
        defaultPlayers = 11;
        break;
      default:
        defaultPlayers = 6;
    }
    setConfig({
      ...config,
      fieldType: value,
      playersPerTeam: defaultPlayers
    });
  };
  const handleContinue = async () => {
    if (config.playersPerTeam < 3) {
      toast.error("Mínimo de 3 jogadores por time!");
      return;
    }
    if (config.gameDuration < 1) {
      toast.error("Duração mínima de 1 minuto!");
      return;
    }

    // Save config to context (single source of truth is the database/current baba)
    setBabaConfig(config);
    try {
      const playersPerTeamChanged = currentBaba && config.playersPerTeam !== currentBaba.playersPerTeam;

      // Since we now always have a draft baba, just update it
      const updates: any = {
        fieldType: config.fieldType,
        playersPerTeam: config.playersPerTeam,
        gameDuration: config.gameDuration,
        winCriteria: config.winCriteria,
        timeLeft: config.gameDuration * 60,
        setupStatus: 'teams' // Mark that config is done, next step is teams
      };

      // Update name if custom name provided
      if (babaCustomName.trim()) {
        updates.name = babaCustomName.trim();
      }
      await updateBaba(updates);

      // Save players if we have them and this is first time through config
      if (currentBaba?.id && parsedPlayers) {
        const rawList = rawPlayerList || undefined;
        try {
          await savePlayers(currentBaba.id, parsedPlayers, rawList);
        } catch (e) {
          // Players might already be saved - that's OK
          console.log('Players may already exist:', e);
        }
      }

      // Check if teams already exist
      const hasExistingTeams = contextTeams && contextTeams.length > 0;

      // If playersPerTeam changed, need to regenerate teams
      if (playersPerTeamChanged) {
        localStorage.setItem('shouldGenerateTeams', '1');
      } else if (!hasExistingTeams) {
        // No teams yet - mark to generate teams
        localStorage.setItem('shouldGenerateTeams', '1');
      }
      // If hasExistingTeams and playersPerTeam didn't change, don't set shouldGenerateTeams (preserve teams)

      navigate('/teams');
      toast.success("Configuração salva!");
    } catch (error) {
      console.error('Error saving baba:', error);
      toast.error("Erro ao salvar configuração");
    }
  };
  const adjustDuration = (increment: boolean) => {
    const newValue = increment ? config.gameDuration + 1 : config.gameDuration - 1;
    if (newValue >= 1 && newValue <= 90) {
      setConfig({
        ...config,
        gameDuration: newValue
      });
    }
  };
  const adjustPlayers = (increment: boolean) => {
    const newValue = increment ? config.playersPerTeam + 1 : config.playersPerTeam - 1;
    if (newValue >= 3 && newValue <= 11) {
      setConfig({
        ...config,
        playersPerTeam: newValue
      });
    }
  };
  return <div className="min-h-screen bg-background relative flex flex-col">
      {/* Background Image - Fixed */}
      <div className="fixed-bg" style={{
      backgroundImage: `url(${stadiumBg})`
    }} />
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-background/50 z-10" />

      {/* Audio Controls - Fixed Bottom Right */}
      <AudioControls />

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col">
        {/* Header - Fixed */}
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/import-list')} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">Configurar Baba</h1>
                  {/* Save status indicator */}
                  {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                  {saveStatus === 'saved' && <Check className="w-4 h-4 text-primary" />}
                  {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo!' : saveStatus === 'error' ? 'Erro ao salvar' : 'Defina as regras do jogo'}
                </p>
              </div>
              <img src={logoHeader} alt="Baba Play" className="h-7 hidden md:block" />
              <AppMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 pb-28 sm:pb-8 max-w-3xl flex-1">
          <div className="space-y-6">
            {/* Tipo de Campo */}
            <Card className="shadow-card bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Codepen className="w-5 h-5 text-primary" />
                  Tipo de Campo
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Selecione o tipo de campo e o número de jogadores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={config.fieldType} onValueChange={value => handleFieldTypeChange(value as FieldType)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2.5">
                    {[
                      { v: 'quadra', l: 'Quadra', d: '4 linha + 1 goleiro (5)' },
                      { v: 'society', l: 'Society', d: '6 linha + 1 goleiro (7)' },
                      { v: 'campo', l: 'Campo', d: '10 linha + 1 goleiro (11)' },
                      { v: 'custom', l: 'Personalizado', d: 'Defina manualmente' },
                    ].map((opt) => {
                      const isSelected = config.fieldType === opt.v;
                      return (
                        <label
                          key={opt.v}
                          htmlFor={opt.v}
                          className={`flex flex-col gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary/60 bg-primary/5'
                              : 'border-border/30 bg-muted/20 hover:bg-muted/30 hover:border-border/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.v} id={opt.v} className="border-primary text-primary" />
                            <div className="flex-1">
                              <div className="font-semibold text-foreground leading-tight">{opt.l}</div>
                              <div className="text-xs text-muted-foreground">{opt.d}</div>
                            </div>
                          </div>
                          <div className="w-full aspect-[200/110]">
                            <MiniPitch
                              variant={opt.v as 'quadra' | 'society' | 'campo' | 'custom'}
                              selected={isSelected}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>

                {config.fieldType === 'custom' && <div className="pt-4 border-t border-border/50">
                    <Label className="text-foreground text-sm mb-3 block">Jogadores por time (incluindo goleiro)</Label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => adjustPlayers(false)} className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors">
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="w-20 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{config.playersPerTeam}</span>
                      </div>
                      <button onClick={() => adjustPlayers(true)} className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Duração e Critério */}
            <Card className="shadow-card bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  Duração e Vitória
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure o tempo e como um time vence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-foreground text-sm mb-3 block">Duração de cada jogo (minutos)</Label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => adjustDuration(false)} className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors">
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="w-20 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-foreground">{config.gameDuration}</span>
                    </div>
                    <button onClick={() => adjustDuration(true)} className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                    <span className="text-muted-foreground text-sm">min</span>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground text-sm mb-3 block">Critério de vitória</Label>
                  <Select 
                    value={config.winCriteria.startsWith('custom-') || config.winCriteria.startsWith('time-or-custom-') 
                      ? (config.winCriteria.startsWith('time-or-custom-') ? 'time-or-custom' : 'custom-goals')
                      : config.winCriteria
                    } 
                    onValueChange={value => {
                      if (value === 'custom-goals') {
                        setConfig({ ...config, winCriteria: `custom-${customGoals}` });
                      } else if (value === 'time-or-custom') {
                        setConfig({ ...config, winCriteria: `time-or-custom-${customGoals}` });
                      } else {
                        setConfig({ ...config, winCriteria: value as WinCriteria });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50 text-foreground rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border rounded-xl">
                      <SelectItem value="time-or-2">Tempo ou 2 gols</SelectItem>
                      <SelectItem value="time-or-3">Tempo ou 3 gols</SelectItem>
                      <SelectItem value="time">Apenas tempo</SelectItem>
                      <SelectItem value="2goals">Quem fizer 2 gols primeiro</SelectItem>
                      <SelectItem value="3goals">Quem fizer 3 gols primeiro</SelectItem>
                      <SelectItem value="custom-goals">Personalizado: Quem fizer X gols</SelectItem>
                      <SelectItem value="time-or-custom">Personalizado: Tempo ou X gols</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom goals input */}
                {(config.winCriteria.startsWith('custom-') || config.winCriteria.startsWith('time-or-custom-')) && (
                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-foreground text-sm mb-3 block">Quantidade de gols para vencer</Label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const newGoals = Math.max(1, customGoals - 1);
                          setCustomGoals(newGoals);
                          if (config.winCriteria.startsWith('time-or-custom-')) {
                            setConfig({ ...config, winCriteria: `time-or-custom-${newGoals}` });
                          } else {
                            setConfig({ ...config, winCriteria: `custom-${newGoals}` });
                          }
                        }} 
                        className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="w-20 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{customGoals}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newGoals = Math.min(20, customGoals + 1);
                          setCustomGoals(newGoals);
                          if (config.winCriteria.startsWith('time-or-custom-')) {
                            setConfig({ ...config, winCriteria: `time-or-custom-${newGoals}` });
                          } else {
                            setConfig({ ...config, winCriteria: `custom-${newGoals}` });
                          }
                        }} 
                        className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <span className="text-muted-foreground text-sm">gols</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nome do Baba - Opcional */}
            <Card className="shadow-card bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Edit3 className="w-5 h-5 text-primary" />
                  Nome do Baba
                  <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Dê um nome personalizado para identificar este baba
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={babaCustomName} onChange={e => setBabaCustomName(e.target.value)} placeholder="Ex: Baba de Natal, Baba da Firma..." className="bg-muted/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl" maxLength={50} />
                <p className="text-xs text-muted-foreground mt-2">
                  Se deixar vazio, será nomeado automaticamente com a data
                </p>
              </CardContent>
            </Card>

            {/* Regras das Camisas */}
            <Card className="shadow-card bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  Regras do Baba 
                </CardTitle>
                <CardDescription className="text-muted-foreground">Quem começa com a bola? quem tira a camisa?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="gap-3 mx-0 flex items-center justify-start">
                    <div>
                      <div className="font-semibold text-lg text-foreground mb-1">Time 1 sempre escolhe</div>
                      <div className="text-sm text-muted-foreground">
                        • Time 1 tem a bola no início<br />
                        • Time 1 escolhe se joga com camisa ou sem camisa
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Continue Button - Desktop */}
            <div className="hidden sm:flex justify-center">
              <Button onClick={handleContinue} className="group btn-cta-green text-base py-6 px-8">
                <span>{contextTeams && contextTeams.length > 0 ? 'Salvar e Continuar' : 'Gerar Times'}</span>
                <ArrowRight className="w-5 h-5 ml-1.5 arrow-nudge" />
              </Button>
            </div>
          </div>
        </main>

        {/* Fixed Continue Button - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-background via-background to-transparent z-30 sm:hidden">
          <Button onClick={handleContinue} className="group btn-cta-green w-full text-base py-6 px-8">
            <span>{contextTeams && contextTeams.length > 0 ? 'Salvar e Continuar' : 'Gerar Times'}</span>
            <ArrowRight className="w-5 h-5 ml-1.5 arrow-nudge" />
          </Button>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>;
};
export default ConfigureGame;