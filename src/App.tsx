import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AudioProvider } from "@/contexts/AudioContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BabaProvider } from "@/contexts/BabaContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Start from "./pages/Start";
import QuickSort from "./pages/QuickSort";
import ImportList from "./pages/ImportList";
import ConfigureGame from "./pages/ConfigureGame";
import Teams from "./pages/Teams";
import Game from "./pages/Game";
import Tutorials from "./pages/Tutorials";
import AdminTutorials from "./pages/AdminTutorials";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BabaProvider>
          <AudioProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/start" element={<Start />} />
                  <Route path="/quick/import" element={<QuickSort />} />
                  <Route path="/import-list" element={
                    <ProtectedRoute>
                      <ImportList />
                    </ProtectedRoute>
                  } />
                  <Route path="/configure-game" element={
                    <ProtectedRoute>
                      <ConfigureGame />
                    </ProtectedRoute>
                  } />
                  <Route path="/teams" element={
                    <ProtectedRoute>
                      <Teams />
                    </ProtectedRoute>
                  } />
                  <Route path="/game" element={
                    <ProtectedRoute>
                      <Game />
                    </ProtectedRoute>
                  } />
                  <Route path="/tutorials" element={
                    <ProtectedRoute>
                      <Tutorials />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/tutorials" element={
                    <ProtectedRoute>
                      <AdminTutorials />
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AudioProvider>
        </BabaProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
