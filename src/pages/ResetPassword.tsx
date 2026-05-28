import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Footer from '@/components/Footer';
import AudioControls from '@/components/AudioControls';
import BallLoader from '@/components/BallLoader';
import logoHeader from '@/assets/logo-header-v2.svg';
import logoBabaPlay from '@/assets/logo-babaplay.svg';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Check if we have a valid session from the password reset link
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If there's no session and we're on the reset password page,
      // the user may have an expired or invalid link
      if (!session && window.location.hash.includes('error')) {
        setSessionError(true);
      }
    };

    // Listen for auth state changes (when user clicks the reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked the password reset link and is now authenticated
          setSessionError(false);
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('session')) {
          setSessionError(true);
          toast.error('Link expirado ou inválido. Solicite um novo link.');
        } else {
          toast.error('Não foi possível redefinir a senha. Tente novamente.');
        }
      } else {
        setResetSuccess(true);
        toast.success('Senha redefinida com sucesso!');
        
        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/auth');
        }, 3000);
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
                {resetSuccess ? 'Senha Redefinida!' : sessionError ? 'Link Expirado' : 'Nova Senha'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                {resetSuccess 
                  ? 'Sua senha foi alterada com sucesso. Redirecionando para login...' 
                  : sessionError
                    ? 'O link de recuperação expirou ou é inválido.'
                    : 'Digite sua nova senha'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {resetSuccess ? (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-foreground text-sm">
                    Você será redirecionado para a página de login em instantes...
                  </p>
                </div>
              ) : sessionError ? (
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                    <p className="text-foreground text-sm">
                      O link de recuperação expirou ou já foi utilizado.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/forgot-password')}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground py-6 text-lg font-semibold rounded-2xl"
                  >
                    Solicitar novo link
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-input/70 border-border/50 text-foreground rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 bg-input/70 border-border/50 text-foreground rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
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
                      <span>Redefinir Senha</span>
                    )}
                  </Button>
                </form>
              )}

              {!resetSuccess && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="text-white hover:text-primary text-sm underline-offset-4 hover:underline transition-colors"
                  >
                    Voltar para login
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default ResetPassword;
