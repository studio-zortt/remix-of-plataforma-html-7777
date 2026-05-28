import { Volume2, VolumeX, Music, Loader2 } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const AudioControls = () => {
  const { isMusicPlaying, isLoading, toggleMusic, currentTrack, tracks, changeTrack } = useAudio();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="audio-btn-floating"
            title="Configurar música"
          >
            <Music className="w-5 h-5 text-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-card/95 backdrop-blur-md border-border/50" side="top" align="end">
          <div className="space-y-2">
            {/* Music Selection */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1">Escolher música:</p>
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => changeTrack(track.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentTrack === track.id 
                      ? 'bg-primary/20 text-primary font-medium' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
            
            <Separator className="my-2" />
            
            {/* Play/Pause Control */}
            <div className="px-2">
              <p className="text-xs text-muted-foreground py-1">Controle de som:</p>
              <button 
                onClick={toggleMusic} 
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isMusicPlaying 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-muted text-muted-foreground'
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isMusicPlaying ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>{isMusicPlaying ? 'Som ativado' : 'Som desativado'}</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AudioControls;
