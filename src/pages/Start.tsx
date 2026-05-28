import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CircleCheckBig, UsersRound } from "lucide-react";
import { useBaba } from "@/contexts/BabaContext";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import AppMenu from "@/components/AppMenu";
import AudioControls from "@/components/AudioControls";
import logoHeader from "@/assets/logo-header-v2.svg";
import ballIcon from "@/assets/ball-icon.svg";
import iconSortear from "@/assets/icon-sortear-times.svg";
import iconBabaCompleto from "@/assets/icon-baba-completo.svg";
import fundoBabaCompleto from "@/assets/fundo-card-baba-completo.webp";
import fundoBabaCompletoMobile from "@/assets/fundo-card-baba-completo-mobile.webp";
import fundoSortearTimes from "@/assets/fundo-card-sortear-times.webp";
import fundoSortearTimesMobile from "@/assets/fundo-card-sortear-times-mobile.webp";

const Start = () => {
  const navigate = useNavigate();
  const { startNewBabaDraft } = useBaba();
  const { user } = useAuth();
  const [isStartingFull, setIsStartingFull] = useState(false);

  const handleFullBaba = async () => {
    if (!user) {
      navigate('/auth?redirect=full-baba');
      return;
    }
    setIsStartingFull(true);
    await startNewBabaDraft();
    navigate('/import-list');
  };

  const handleQuickSort = () => {
    sessionStorage.removeItem('quickRawList');
    sessionStorage.removeItem('quickPlayers');
    sessionStorage.removeItem('quickConfig');
    sessionStorage.removeItem('quickTeams');
    sessionStorage.removeItem('quickQueue');
    navigate('/quick/import');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 fixed">
        <source src="https://darkturquoise-sandpiper-894009.hostingersite.com/wp-content/uploads/2025/12/video-de-futebel.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/60 z-10 fixed" />

      <AudioControls />

      <div className="relative z-20 flex-1 flex flex-col">
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4 sticky top-0 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1" />

              <img src={logoHeader} alt="Baba Play" className="h-7" />
              <AppMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground text-center mb-3">
            Como você quer prosseguir?
          </h2>
          <p className="text-muted-foreground text-center mb-8 md:mb-10">
            Escolha a melhor opção para o seu momento
          </p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl w-full">
            {/* CARD 1 — Sortear Times (prata) */}
            <div className="relative rounded-3xl bg-card/60 backdrop-blur-xl border border-[hsl(214_15%_82%/0.4)] shadow-elevated overflow-hidden flex flex-col pt-10">
              <div
                className="absolute inset-0 z-0 bg-no-repeat opacity-90 pointer-events-none hidden lg:block bg-[length:auto_115%] bg-[position:right_center]"
                style={{ backgroundImage: `url(${fundoSortearTimes})` }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 z-0 bg-no-repeat opacity-90 pointer-events-none lg:hidden bg-cover bg-[position:right_center]"
                style={{ backgroundImage: `url(${fundoSortearTimesMobile})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-card via-card/70 to-card/30 lg:from-card lg:via-card/70 lg:to-transparent" aria-hidden="true" />

              <div className="absolute z-10 top-0 left-0 right-0 flex items-center justify-center py-2 bg-[hsl(214_15%_82%/0.15)] border-b border-[hsl(214_15%_82%/0.25)] min-h-[36px]">
                <span className="text-sm font-semibold text-[hsl(214_15%_82%)] leading-none">Rápido e prático</span>
              </div>

              <div className="relative z-10 p-6 md:p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[hsl(214_15%_82%/0.12)] border border-[hsl(214_15%_82%/0.25)] flex items-center justify-center flex-shrink-0">
                    <img src={iconSortear} alt="" className="w-14 h-14" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                    Sortear <br /><span className="text-[hsl(214_15%_82%)]">Times</span>
                  </h3>
                </div>

                <p className="text-muted-foreground mb-5">
                  Monte os times em segundos sem<br /> precisar gerenciar a partida.
                </p>

                <div className="h-px my-3 rounded-full bg-gradient-to-r from-[hsl(214_15%_82%/0.45)] to-transparent to-60%" />

                <ul className="space-y-3 my-5 flex-1 -ml-1">
                  {["Cole os nomes da lista", "Times equilibrados automaticamente", "Refazer quantas vezes quiser", "Copiar ou baixar os times"].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                      <CircleCheckBig className="w-4 h-4 text-[hsl(214_15%_82%)] flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleQuickSort}
                  className="group w-full py-6 text-base font-semibold rounded-2xl border border-[hsl(214_15%_92%/0.6)] text-background bg-[linear-gradient(135deg,hsl(214_15%_92%)_0%,hsl(214_15%_78%)_100%)] hover:bg-[linear-gradient(135deg,hsl(214_15%_94%)_0%,hsl(214_15%_80%)_100%)] hover:shadow-[0_0_24px_hsl(214_15%_92%/0.45)] hover:scale-[1.02] transition-all duration-500 ease-out"
                >
                  <span>Sortear Times Agora</span>
                  <UsersRound className="w-5 h-5 ml-1.5 animate-shake-icon" />
                </Button>
              </div>
            </div>

            {/* CARD 2 — Criar Baba Completo (verde) */}
            <div className="relative rounded-3xl bg-card/60 backdrop-blur-xl border border-[#3DC563]/40 shadow-elevated overflow-hidden flex flex-col pt-10">
              <div
                className="absolute inset-0 z-0 bg-no-repeat opacity-90 pointer-events-none hidden lg:block bg-[length:auto_115%] bg-[position:right_center]"
                style={{ backgroundImage: `url(${fundoBabaCompleto})` }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 z-0 bg-no-repeat opacity-90 pointer-events-none lg:hidden bg-cover bg-[position:right_center]"
                style={{ backgroundImage: `url(${fundoBabaCompletoMobile})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-card via-card/70 to-card/30 lg:from-card lg:via-card/70 lg:to-transparent" aria-hidden="true" />

              <div className="absolute z-10 top-0 left-0 right-0 flex items-center justify-center py-2 bg-[#3DC563]/15 border-b border-[#3DC563]/30 min-h-[36px]">
                <span className="text-sm font-semibold text-[#3DC563] leading-none">Mais completo</span>
              </div>

              <div className="relative z-10 p-6 md:p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#3DC563]/15 border border-[#3DC563]/30 flex items-center justify-center flex-shrink-0">
                    <img src={iconBabaCompleto} alt="" className="w-14 h-14" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                    Criar Baba <br /><span className="text-[#3DC563]">Completo</span>
                  </h3>
                </div>

                <p className="text-muted-foreground mb-5">
                  Gerencie sua pelada do início ao fim<br /> com placar, substituições e muito mais.
                </p>

                <div className="h-px my-3 rounded-full bg-gradient-to-r from-[#3DC563]/45 to-transparent to-60%" />

                <ul className="space-y-3 my-5 flex-1 -ml-1">
                  {["Sorteio com cabeças de chave", "Placar e cronômetro ao vivo", "Substituições e cartões", "Ranking de gols e assistências", "Histórico salvo para acessar depois"].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                      <CircleCheckBig className="w-4 h-4 text-[#3DC563] flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleFullBaba}
                  disabled={isStartingFull}
                  className="group btn-cta-green w-full py-6 text-base"
                >
                  <span>{isStartingFull ? 'Carregando...' : 'Criar Baba Completo'}</span>
                  <img src={ballIcon} alt="" className="w-5 h-5 ml-1.5 animate-spin-ball" />
                </Button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Start;
