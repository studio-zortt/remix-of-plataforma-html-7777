import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAudio } from "@/contexts/AudioContext";
import { useBaba } from "@/contexts/BabaContext";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import logoHeader from "@/assets/logo-header-v2.svg";
import logoBabaPlay from "@/assets/logo-babaplay.svg";
import ballIcon from "@/assets/ball-icon.svg";
import { Play, X } from "lucide-react";

interface FeaturedTutorial {
  youtube_id: string;
  video_url: string | null;
  title: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { startMusic } = useAudio();
  const { startNewBabaDraft, clearCurrentBaba } = useBaba();
  const [featuredTutorial, setFeaturedTutorial] = useState<FeaturedTutorial | null>(null);
  const [isLoadingTutorial, setIsLoadingTutorial] = useState(true);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Clear any active baba when landing on the home page (run only once on mount)
  useEffect(() => {
    clearCurrentBaba();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch featured tutorial
  useEffect(() => {
    const fetchFeaturedTutorial = async () => {
      const { data } = await supabase
        .from('tutorials')
        .select('youtube_id, video_url, title')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (data) setFeaturedTutorial(data);
      setIsLoadingTutorial(false);
    };
    fetchFeaturedTutorial();
  }, []);

  const handleStart = () => {
    setIsStarting(true);
    navigate('/start');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Video Background */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 fixed">
        <source src="https://darkturquoise-sandpiper-894009.hostingersite.com/wp-content/uploads/2025/12/video-de-futebel.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/50 z-10 fixed" />

      {/* Audio Controls - Fixed Bottom Right */}
      <AudioControls />

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <img src={logoHeader} alt="Baba Play" className="h-8" loading="eager" decoding="sync" />
              <AppMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
          {/* Container with min-height to prevent layout shift on mobile */}
          <div className="flex flex-col gap-4 max-w-md w-full min-h-[400px] sm:min-h-0">
            <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-elevated transition-all duration-500 group rounded-3xl animate-border-rotate">
              <CardHeader className="text-center pb-4">
                <img src={logoBabaPlay} alt="Baba Play" className="h-16 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300" loading="eager" decoding="sync" />
                <CardTitle className="text-foreground text-3xl">Criar Baba</CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  Importe a lista do WhatsApp e monte os times dinamicamente de forma rápida e prática.     
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button onClick={handleStart} disabled={isStarting} className="group btn-cta-green w-full py-6 text-lg">
                  <span>{isStarting ? 'Carregando...' : 'Começar Agora'}</span>
                  <img src={ballIcon} alt="" className="w-5 h-5 ml-1.5 animate-spin-ball" />
                </Button>
              </CardContent>
            </Card>

            {/* Tutorial Preview Section - Sempre renderizado para evitar layout shift */}
            {isLoadingTutorial ? (
              <div className="w-full p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/20 min-h-[76px] sm:min-h-[72px]">
                <div className="flex items-center gap-4 h-full">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted-foreground/20 rounded mb-2 animate-pulse" />
                    <div className="h-3 w-48 bg-muted-foreground/10 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse shrink-0" />
                </div>
              </div>
            ) : featuredTutorial ? (
              <button 
                onClick={() => setShowTutorialModal(true)}
                className="w-full group focus:outline-none rounded-2xl"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/20 hover:border-primary/30 transition-all shadow-lg min-h-[76px] sm:min-h-[72px]">
                  {/* Left side: Text */}
                  <div className="flex-1 text-left">
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      Como usar?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Assista ao tutorial e aprenda a usar a plataforma
                    </p>
                  </div>
                  
                  {/* Right side: Play button */}
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-300 shrink-0">
                    <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
                  </div>
                </div>
              </button>
            ) : null}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Tutorial Modal - Vertical Video (9:16) */}
      <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
        <DialogContent 
          className="p-0 bg-transparent border-none shadow-none max-w-none w-full h-full flex items-center justify-center" 
          hideClose
        >
          {/* Container - large on mobile, slightly smaller on desktop */}
          <div className="relative w-full max-w-[calc(100%-20px)] sm:max-w-sm mx-[10px] sm:mx-4 max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-80px)]">
            {/* Vertical video (9:16) */}
            <div className="relative aspect-[9/16] max-h-[calc(100vh-60px)] sm:max-h-[calc(100vh-100px)] rounded-2xl overflow-hidden bg-card border border-border/30 shadow-2xl">
              {/* Close button - inside the card */}
              <button 
                onClick={() => setShowTutorialModal(false)}
                className="absolute top-3 right-3 text-white/80 hover:text-white z-20 p-2 bg-black/50 rounded-full backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
              {showTutorialModal && featuredTutorial && (
                featuredTutorial.video_url ? (
                  <video
                    src={featuredTutorial.video_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    controls
                    playsInline
                  />
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${featuredTutorial.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={featuredTutorial.title}
                  />
                )
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
