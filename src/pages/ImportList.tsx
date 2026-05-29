import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Key, Copy, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { useBaba } from "@/contexts/BabaContext";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import BallLoader from "@/components/BallLoader";
import logoHeader from "@/assets/logo-header-v2.svg";
import stadiumBg from "@/assets/stadium-background.webp";
import { WhatsappListHelp } from "@/components/WhatsappListHelp";

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

const ImportList = () => {
  const navigate = useNavigate();
  const {
    setParsedPlayers, 
    parsedPlayers: contextPlayers, 
    rawPlayerList, 
    setRawPlayerList,
    currentBaba,
    savePlayers,
    updateBaba,
    hydrated: contextHydrated,
    loading: contextLoading,
  } = useBaba();
  const [whatsappList, setWhatsappList] = useState("");
  const [localParsedPlayers, setLocalParsedPlayers] = useState<ParsedPlayers | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Debounce timer ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save raw list to database with debounce
  const autoSaveRawList = useCallback(async (text: string) => {
    if (!currentBaba?.id || !text.trim()) return;
    
    setIsSaving(true);
    try {
      await updateBaba({ rawPlayerList: text });
      setRawPlayerList(text);
    } catch (error) {
      console.error('Error auto-saving raw list:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentBaba?.id, updateBaba, setRawPlayerList]);

  // Handle text change with debounced save
  const handleTextChange = (text: string) => {
    setWhatsappList(text);
    
    // Clear previous timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // Set new timer for debounced save (1.5 seconds)
    if (currentBaba?.id && text.trim()) {
      saveTimerRef.current = setTimeout(() => {
        autoSaveRawList(text);
      }, 1500);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Load existing data when returning to this page or when switching babas
  useEffect(() => {
    // Aguardar hidratação COMPLETA antes de tomar qualquer decisão
    if (!contextHydrated) return;

    // Se temos a lista bruta salva no baba atual, usar ela
    if (rawPlayerList) {
      setWhatsappList(rawPlayerList);
      const parsed = parseWhatsAppList(rawPlayerList);
      setLocalParsedPlayers(parsed);
      return;
    }

    // Se temos jogadores parseados mas sem raw list, ao menos mostra os detectados
    if (contextPlayers) {
      setLocalParsedPlayers(contextPlayers);
      return;
    }

    // Baba novo ou sem dados - começar limpo
    if (currentBaba && !rawPlayerList) {
      setWhatsappList("");
      setLocalParsedPlayers(null);
    }
  }, [rawPlayerList, contextPlayers, currentBaba?.id, contextHydrated]);

  // Show loading while hydrating
  if (contextLoading || !contextHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  // If no baba exists yet, show loader (baba is being created)
  if (!currentBaba) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  const parseWhatsAppList = (text: string): ParsedPlayers => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const main: ParsedPlayer[] = [];
    const goalkeepers: ParsedPlayer[] = [];
    const substitutes: ParsedPlayer[] = [];
    let currentSection: 'main' | 'goalkeepers' | 'substitutes' = 'main';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();

      if (lowerLine.startsWith('goleiro') || lowerLine === 'goleiros:' || lowerLine === 'goleiros') {
        currentSection = 'goalkeepers';
        return;
      }
      if (lowerLine.startsWith('suplente') || lowerLine.startsWith('reserva') || lowerLine === 'suplentes:' || lowerLine === 'suplentes' || lowerLine === 'reservas:' || lowerLine === 'reservas') {
        currentSection = 'substitutes';
        return;
      }

      const isSeed = /[*#@]/.test(trimmedLine);
      
      let seedLevel = 0;
      if (isSeed) {
        const levelMatch = trimmedLine.match(/[*#@](\d+)/);
        if (levelMatch) {
          seedLevel = parseInt(levelMatch[1], 10);
        } else {
          seedLevel = 1;
        }
      }
      
      let cleanedName = trimmedLine.replace(/^[\d\.\-\)]+\s*/, '').replace(/^[:\-\s]+/, '').replace(/[*#@]\d*/g, '').trim();
      if (cleanedName.includes(':')) {
        cleanedName = cleanedName.split(':').pop()?.trim() || '';
      }
      cleanedName = cleanedName.replace(/[^\p{L}\s]/gu, '').trim();

      if (cleanedName && cleanedName.length > 1) {
        const player: ParsedPlayer = {
          name: cleanedName,
          isSeed,
          seedLevel
        };
        if (currentSection === 'main' && main.length < 30) {
          main.push(player);
        } else if (currentSection === 'goalkeepers') {
          goalkeepers.push(player);
        } else {
          substitutes.push(player);
        }
      }
    });

    return { main, goalkeepers, substitutes };
  };

  const handleParse = async () => {
    if (!whatsappList.trim()) {
      toast.error("Cole a lista do WhatsApp primeiro!");
      return;
    }
    const parsed = parseWhatsAppList(whatsappList);
    if (parsed.main.length === 0) {
      toast.error("Nenhum jogador detectado na lista!");
      return;
    }
    setLocalParsedPlayers(parsed);

    // Mobile: auto-scroll to preview card so user sees "Continuar para Configuração"
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    // Save immediately when processing
    if (currentBaba?.id) {
      setIsSaving(true);
      try {
        await updateBaba({ rawPlayerList: whatsappList });
        setRawPlayerList(whatsappList);
        toast.success(`${parsed.main.length} jogadores detectados e salvos!`);
      } catch {
        toast.success(`${parsed.main.length} jogadores detectados!`);
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.success(`${parsed.main.length} jogadores detectados!`);
    }
  };

  const handleContinue = async () => {
    if (!localParsedPlayers) return;

    // Save both raw list and parsed players to context
    setRawPlayerList(whatsappList);
    setParsedPlayers(localParsedPlayers);

    // Persist immediately for the current baba
    if (currentBaba?.id) {
      try {
        await savePlayers(currentBaba.id, localParsedPlayers, whatsappList);
        // Update setup_status to 'config'
        await updateBaba({ setupStatus: 'config' } as any);
      } catch {
        toast.error("Erro ao salvar a lista/jogadores");
        return;
      }
    }

    navigate('/configure-game');
  };

  const displayPlayers = localParsedPlayers;

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Background Image - Fixed */}
      <div className="fixed-bg" style={{ backgroundImage: `url(${stadiumBg})` }} />
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
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">Importar Lista</h1>
                <p className="text-sm text-muted-foreground">Cole a lista do grupo do WhatsApp</p>
              </div>
              {isSaving && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Save className="w-4 h-4 animate-pulse" />
                  <span>Salvando...</span>
                </div>
              )}
              <img src={logoHeader} alt="Baba Play" className="h-7 hidden md:block" />
              <AppMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Section */}
            <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-card rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Copy className="w-5 h-5 text-primary" />
                  Cole a lista do Whatsapp   
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Copie a lista de confirmados do WhatsApp e cole aqui
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={whatsappList}
                  onChange={e => handleTextChange(e.target.value)}
                  className="min-h-[300px] font-mono text-sm bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                  placeholder={`1. João Silva *
2. Pedro Santos
3. Carlos Oliveira #
4. Lucas Ferreira
5. Bruno Costa
...

Goleiros:
- Marcos
- Rafael`}
                />
                <WhatsappListHelp />
                <Button onClick={handleParse} className="group btn-cta-green w-full text-base py-6">
                  Processar Lista
                </Button>
              </CardContent>
            </Card>

            {/* Preview Section */}
            <Card ref={previewRef} className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-card rounded-3xl scroll-mt-24">
              <CardHeader>
                <CardTitle className="text-foreground">Jogadores Detectados</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Confira se todos foram identificados corretamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!displayPlayers ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-left text-slate-500 text-base font-mono">Cole e processe a lista para ver os jogadores aqui</p>
                  </div>
                ) : (
                  <>
                    {/* Main Players */}
                    <div>
                      <h3 className="font-semibold mb-2 text-base text-primary-hover">
                        Jogadores de Linha ({displayPlayers.main.length})
                      </h3>
                      <div className="bg-muted/30 rounded-xl p-3 max-h-[150px] overflow-y-auto space-y-1">
                        {displayPlayers.main.map((player, idx) => (
                          <div key={idx} className={`text-sm py-1.5 px-2 rounded-lg flex items-center justify-between ${player.isSeed && player.seedLevel === 1 ? 'bg-star-gold/20' : 'hover:bg-background/50'}`}>
                            <span className="text-foreground">{idx + 1}. {player.name}</span>
                            {player.isSeed && (
                              player.seedLevel === 1 ? (
                                <Badge className="bg-star-gold text-background text-xs flex items-center gap-1">
                                  <Key className="w-3 h-3" />
                                  Cabeça
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-xs border-muted-foreground/30">
                                  Nível {player.seedLevel}
                                </Badge>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Goalkeepers */}
                    {displayPlayers.goalkeepers.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-primary-hover text-sm">
                          Goleiros ({displayPlayers.goalkeepers.length})
                        </h3>
                        <div className="bg-muted/30 rounded-xl p-3 max-h-[100px] overflow-y-auto">
                          {displayPlayers.goalkeepers.map((player, idx) => (
                            <div key={idx} className="text-sm py-1 px-2 hover:bg-background/50 rounded-lg text-foreground">
                              {player.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={handleContinue} className="group btn-cta-green w-full py-6">
                      <span className="text-base">Continuar para Configuração</span>
                      <ArrowRight className="w-4 h-4 ml-1.5 arrow-nudge" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default ImportList;
