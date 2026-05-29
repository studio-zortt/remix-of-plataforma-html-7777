import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Footer from '@/components/Footer';
import AudioControls from '@/components/AudioControls';
import BallLoader from '@/components/BallLoader';
import logoHeader from '@/assets/logo-header-v2.svg';
import logoBabaPlay from '@/assets/logo-babaplay.svg';
import ballIcon from '@/assets/ball-icon.svg';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      navigate(redirect === 'full-baba' ? '/start' : '/start');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error('Ocorreu um erro ao entrar. Tente novamente.');
          }
        } else {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error('Ocorreu um erro ao criar a conta. Tente novamente.');
          }
        } else {
          toast.success('Conta criada com sucesso!');
          navigate('/');
        }
      }
    } catch (err) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BallLoader />
      </div>
    );
  }

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

      {/* Audio Controls - Fixed Bottom Right */}
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
                {isLogin ? 'Entrar' : 'Criar Conta'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                {isLogin 
                  ? 'Acesse sua conta para gerenciar seus babas' 
                  : 'Crie sua conta para começar a organizar seus babas'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
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

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Senha</Label>
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
                )}

                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="group btn-cta-green w-full py-6 text-lg"
                >
                  {isSubmitting ? (
                    <BallLoader size="sm" variant="white" />
                  ) : isLogin ? (
                    <>
                      <span>Entrar agora</span>
                      <img src={ballIcon} alt="" className="w-5 h-5 ml-1.5 animate-spin-ball" />
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5 mr-1.5" />
                      <span>Criar Conta</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-white hover:text-primary text-sm underline-offset-4 hover:underline transition-colors"
                >
                  {isLogin 
                    ? 'Não tem conta? Criar agora' 
                    : 'Já tem conta? Entrar'}
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

export default Auth;
