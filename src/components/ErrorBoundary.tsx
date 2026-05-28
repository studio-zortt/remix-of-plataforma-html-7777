import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    try {
      localStorage.setItem(
        "lastCrash",
        JSON.stringify({
          message: error?.message,
          stack: error?.stack?.split("\n").slice(0, 10).join("\n"),
          componentStack: errorInfo.componentStack?.split("\n").slice(0, 5).join("\n"),
          path: window.location.pathname,
          time: new Date().toISOString(),
        })
      );
    } catch (e) {
      // Ignore storage errors
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Path: ${window.location.pathname}
Time: ${new Date().toISOString()}
    `.trim();
    navigator.clipboard.writeText(errorDetails);
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      // Debug mode: ?debug=1 in URL enables developer details for end users too
      const isDebug =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("debug") === "1";

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Não foi possível carregar
            </h1>
            <p className="text-muted-foreground mb-8">
              Verifique sua conexão e tente novamente.
            </p>

            <div className="flex justify-center">
              <Button
                onClick={this.handleReload}
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow animate-pulse-glow rounded-2xl px-8"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>

            {isDebug && (
              <div className="mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleDetails}
                  className="text-muted-foreground gap-1"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {this.state.showDetails ? "Ocultar detalhes" : "Ver detalhes"}
                </Button>

                {this.state.showDetails && (
                  <div className="mt-3 text-left bg-muted/50 rounded-lg p-3 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-destructive">Erro:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={this.handleCopyError}
                        className="h-6 px-2"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-muted-foreground overflow-auto max-h-40">
                      {this.state.error?.message}
                    </pre>
                    {this.state.error?.stack && (
                      <pre className="whitespace-pre-wrap text-muted-foreground/70 mt-2 overflow-auto max-h-32 text-[10px]">
                        {this.state.error.stack.split("\n").slice(0, 5).join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
