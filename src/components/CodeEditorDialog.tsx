
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Code, Copy, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CodeEditorDialogProps {
  htmlContent: string;
  onHTMLChange: (html: string) => void;
  onElementSelect: (element: HTMLElement) => void;
}

export const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({
  htmlContent,
  onHTMLChange,
  onElementSelect
}) => {
  const [localHtmlContent, setLocalHtmlContent] = React.useState(htmlContent);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalHtmlContent(htmlContent);
  }, [htmlContent]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setLocalHtmlContent(newHtml);
    onHTMLChange(newHtml);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(localHtmlContent);
      toast({
        title: "Copiado!",
        description: "Código HTML copiado para a área de transferência"
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código",
        variant: "destructive"
      });
    }
  };

  const downloadHTML = () => {
    const blob = new Blob([localHtmlContent], {
      type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado",
      description: "Arquivo HTML baixado com sucesso"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2 rounded-lg button-hover editor-transition">
          <Code className="w-4 h-4" />
          <span>Editar Código HTML</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] bg-editor-background border-border rounded-xl p-0 flex flex-col">
        <DialogHeader className="border-b border-border px-6 py-3 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="w-6 h-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">Editor de Código HTML</span>
            </div>
            <div className="flex items-center space-x-3 mr-8">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyToClipboard} 
                className="text-muted-foreground hover:text-primary-foreground hover:bg-primary rounded-lg button-hover editor-transition px-4 py-2"
              >
                <Copy className="w-4 h-4" />
                <span className="ml-2">Copiar</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadHTML} 
                className="text-muted-foreground hover:text-primary-foreground hover:bg-primary rounded-lg button-hover editor-transition px-4 py-2"
              >
                <Download className="w-4 h-4" />
                <span className="ml-2">Baixar</span>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-6 min-h-0">
          <Textarea
            value={localHtmlContent}
            onChange={handleCodeChange}
            placeholder="Cole seu código HTML aqui..."
            className="code-editor h-full w-full resize-none text-sm leading-relaxed border-0 bg-editor-background focus:ring-0 focus:outline-none custom-scrollbar"
            spellCheck={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
