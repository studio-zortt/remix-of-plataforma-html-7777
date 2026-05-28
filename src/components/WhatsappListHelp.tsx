import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle, Key } from "lucide-react";

const EXAMPLE = `1: Valdir
2: Marcelo
3: Guilherme
4: João Pedro
5: Igor
6: Daniel
7: Mateus
8: Emanuel
9: Rodrigo
10: Pedro
11: Lionel
12: Tiago
13: Ronaldo
14: Marcos
15: Paulo
16: Lucas

Goleiros
🥅1: Rafael
🥅2: Gabriel
🥅3: Breno
🥅4: Vanderson`;

export const WhatsappListHelp = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/70 bg-background/30 hover:bg-background/40 rounded-xl py-2"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-xs">Como formatar a lista?</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-3xl max-w-lg w-[calc(100%-2rem)] sm:w-full mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Como formatar a lista
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Copie a lista direto do grupo do WhatsApp. Se precisar, ajuste seguindo o formato abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <section className="space-y-1.5">
              <h4 className="font-semibold text-foreground">Jogadores de linha</h4>
              <p className="text-muted-foreground">
                Uma pessoa por linha. Números, pontos, dois-pontos ou hífens no começo são removidos automaticamente.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-semibold text-foreground">Goleiros</h4>
              <p className="text-muted-foreground">
                Comece a seção dos goleiros com a palavra <span className="text-foreground font-medium">Goleiros</span> (ou "Goleiros:") em uma linha sozinha. Tudo que vier depois é tratado como goleiro.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-star-gold" /> Níveis de equilíbrio (cabeças de chave)
              </h4>
              <p className="text-muted-foreground">
                Para times equilibrados, marque os melhores jogadores com <span className="text-foreground font-medium">@</span>, <span className="text-foreground font-medium">*</span> ou <span className="text-foreground font-medium">#</span>:
              </p>
              <ul className="text-muted-foreground space-y-1 pl-4 list-disc">
                <li><span className="text-foreground">@</span> ou <span className="text-foreground">@1</span> — cabeça de chave (top do nível)</li>
                <li><span className="text-foreground">@2</span> — 2º melhor nível</li>
                <li><span className="text-foreground">@3</span>, <span className="text-foreground">@4</span>, <span className="text-foreground">@5</span>… — níveis seguintes</li>
              </ul>
              <p className="text-xs text-muted-foreground/80">
                Jogadores do mesmo nível são distribuídos em times diferentes para equilibrar o jogo.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="font-semibold text-foreground">Exemplo</h4>
              <pre className="bg-muted/40 border border-border/40 rounded-xl p-3 text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
{EXAMPLE}
              </pre>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsappListHelp;
