import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import backgroundMusic1 from '@/assets/background-music.mp3';
import backgroundMusic2 from '@/assets/stereo-love.mp3';

const MUSIC_TRACKS = [
  { id: 1, name: 'Música 1', src: backgroundMusic1 },
  { id: 2, name: 'Música 2', src: backgroundMusic2 },
];

interface AudioContextType {
  isMusicPlaying: boolean;
  isLoading: boolean;
  volume: number;
  currentTrack: number;
  tracks: typeof MUSIC_TRACKS;
  toggleMusic: () => void;
  startMusic: () => void;
  stopMusic: () => void;
  setVolume: (volume: number) => void;
  changeTrack: (trackId: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.3);
  const [currentTrack, setCurrentTrack] = useState(() => {
    const saved = localStorage.getItem('currentMusicTrack');
    return saved ? parseInt(saved, 10) : 1;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const autoplayBlockedRef = useRef(false);
  const userInteractionListenerRef = useRef(false);

  // Create and configure audio element - preload immediately
  const createAudio = useCallback((trackId: number): HTMLAudioElement => {
    const track = MUSIC_TRACKS.find(t => t.id === trackId) || MUSIC_TRACKS[0];
    const audio = new Audio(track.src);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = volume;
    return audio;
  }, [volume]);

  // Attempt to play audio with error handling
  const attemptPlay = useCallback((audio: HTMLAudioElement): Promise<boolean> => {
    setIsLoading(true);
    return audio.play()
      .then(() => {
        setIsMusicPlaying(true);
        isPlayingRef.current = true;
        autoplayBlockedRef.current = false;
        localStorage.setItem('isMusicPlaying', 'true');
        setIsLoading(false);
        return true;
      })
      .catch((error) => {
        setIsLoading(false);
        if (error.name === 'NotAllowedError') {
          autoplayBlockedRef.current = true;
          console.log('Autoplay blocked by browser. Waiting for user interaction.');
        } else {
          console.error('Audio playback error:', error);
        }
        return false;
      });
  }, []);

  // Setup one-shot user interaction listener to unlock audio
  const setupUserInteractionListener = useCallback(() => {
    if (userInteractionListenerRef.current) return;
    
    const unlockAudio = () => {
      if (autoplayBlockedRef.current && audioRef.current && localStorage.getItem('isMusicPlaying') === 'true') {
        attemptPlay(audioRef.current);
      }
      // Remove listeners after first interaction
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      userInteractionListenerRef.current = false;
    };

    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    userInteractionListenerRef.current = true;
  }, [attemptPlay]);

  // Initialize audio on mount - NEVER auto-play. User must explicitly click play.
  useEffect(() => {
    // Create audio element (preloaded but paused)
    audioRef.current = createAudio(currentTrack);

    // Always start muted/paused. Clear any stale "isMusicPlaying=true" from previous sessions
    // so the music doesn't resume automatically on page load.
    localStorage.setItem('isMusicPlaying', 'false');

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  const startMusic = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudio(currentTrack);
    }
    
    if (!isPlayingRef.current) {
      attemptPlay(audioRef.current).then(success => {
        if (!success) {
          setupUserInteractionListener();
        }
      });
    }
  }, [currentTrack, createAudio, attemptPlay, setupUserInteractionListener]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
      isPlayingRef.current = false;
      localStorage.setItem('isMusicPlaying', 'false');
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (isPlayingRef.current) {
      stopMusic();
    } else {
      // Ensure we have an audio element
      if (!audioRef.current) {
        audioRef.current = createAudio(currentTrack);
      }
      attemptPlay(audioRef.current);
    }
  }, [currentTrack, createAudio, attemptPlay, stopMusic]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
  }, []);

  const changeTrack = useCallback((trackId: number) => {
    const wasPlaying = isPlayingRef.current;

    // Stop current audio immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Create new audio for the selected track
    const newAudio = createAudio(trackId);
    audioRef.current = newAudio;

    setCurrentTrack(trackId);
    localStorage.setItem('currentMusicTrack', trackId.toString());

    // Only resume playback if music was already playing
    if (wasPlaying) {
      attemptPlay(newAudio);
    } else {
      setIsMusicPlaying(false);
      isPlayingRef.current = false;
      localStorage.setItem('isMusicPlaying', 'false');
    }
  }, [createAudio, attemptPlay]);

  return (
    <AudioContext.Provider value={{ 
      isMusicPlaying, 
      isLoading,
      volume, 
      currentTrack, 
      tracks: MUSIC_TRACKS,
      toggleMusic, 
      startMusic, 
      stopMusic, 
      setVolume,
      changeTrack
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
