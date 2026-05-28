import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AppMenu from '@/components/AppMenu';
import BallLoader from '@/components/BallLoader';
import logoHeader from '@/assets/logo-header-v2.svg';

interface TutorialVideo {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  display_order: number;
}

const Tutorials = () => {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [tutorials, setTutorials] = useState<TutorialVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        const { data, error } = await supabase
          .from('tutorials')
          .select('id, title, description, youtube_id, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setTutorials(data || []);
      } catch (err) {
        console.error('Error fetching tutorials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, []);

  const getYouTubeThumbnail = (youtubeId: string) => {
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/lovable-uploads/stadium-background.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/95" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header - Fixed */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-muted/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoHeader} alt="Baba Play" className="h-7" />
          </div>
          <AppMenu />
        </header>

        {/* Main Content */}
        <main className="px-4 pb-8 pt-6">
          <div className="mb-6 mt-3">
            <h1 className="text-2xl font-bold text-foreground mb-2">Tutoriais</h1>
            <p className="text-muted-foreground">Aprenda a usar o Baba Play com nossos vídeos</p>
          </div>

          {/* Video Grid */}
          {tutorials.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border-border/30">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum tutorial disponível no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tutorials.map((tutorial) => (
                <Card 
                  key={tutorial.id}
                  className="bg-card/80 backdrop-blur-sm border-border/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedVideo(tutorial)}
                >
                  {/* Thumbnail with Play Button */}
                  <div className="relative aspect-video">
                    <img
                      src={getYouTubeThumbnail(tutorial.youtube_id)}
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to medium quality thumbnail if maxres fails
                        e.currentTarget.src = `https://img.youtube.com/vi/${tutorial.youtube_id}/mqdefault.jpg`;
                      }}
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/40" />
                    {/* Custom Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg hover:bg-primary transition-colors hover:scale-105">
                        <Play className="w-7 h-7 text-primary-foreground fill-current ml-1" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{tutorial.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{tutorial.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-4xl p-0 bg-card border-border/30 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">
            {selectedVideo?.title ?? 'Tutorial'}
          </DialogTitle>
          {selectedVideo && (
            <div className="relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedVideo(null)}
                className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              
              {/* YouTube Embed */}
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtube_id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              {/* Video Info */}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-foreground mb-1">{selectedVideo.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutorials;