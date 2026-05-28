import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import Footer from '@/components/Footer';
import AudioControls from '@/components/AudioControls';
import BallLoader from '@/components/BallLoader';
import logoHeader from '@/assets/logo-header-v2.svg';
import logoBabaPlay from '@/assets/logo-babaplay.svg';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('Email de recuperação enviado!');
      }
    } catch (err) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 fixed"
      >
        <source src="https://darkturquoise-sandpiper-894009.hostingersite.com/wp-content/uploads/2025/12/video-de-futebel.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/50 z-10 fixed" />

      {/* Audio Controls */}
      <AudioControls />

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card/30 backdrop-blur-md border-b border-border/50 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center">
              <img src={logoHeader} alt="Baba Play" className="h-7" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-elevated max-w-md w-full animate-fade-up rounded-3xl">
            <CardHeader className="text-center pb-4">
              <img src={logoBabaPlay} alt="Baba Play" className="h-16 mx-auto mb-6" />
              <CardTitle className="text-2xl text-foreground">
                {emailSent ? 'Email Enviado!' : 'Recuperar Senha'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                {emailSent 
                  ? 'Verifique sua caixa de entrada e clique no link para redefinir sua senha.' 
                  : 'Informe seu email para receber o link de recuperação'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {emailSent ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                    <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
                    <p className="text-foreground text-sm">
                      Enviamos um email para <strong>{email}</strong>
                    </p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Não recebeu? Verifique a pasta de spam ou tente novamente.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full py-6 text-lg font-semibold rounded-2xl border-border/50 hover:bg-card/80"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Enviar novamente
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-input/70 border-border/50 text-foreground rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground py-6 text-lg font-semibold animate-pulse-green-light transition-all duration-300 rounded-2xl"
                  >
                    {isSubmitting ? (
                      <BallLoader size="sm" variant="white" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        <span>Enviar Link</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-white hover:text-primary text-sm underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para login
                </button>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default ForgotPassword;
