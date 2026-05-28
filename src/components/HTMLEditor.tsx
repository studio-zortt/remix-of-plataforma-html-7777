import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Code, Eye, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HTMLEditorProps {
  onHTMLChange: (html: string) => void;
  onElementSelect: (element: HTMLElement) => void;
  htmlContent: string;
}

export const HTMLEditor: React.FC<HTMLEditorProps> = ({ 
  onHTMLChange, 
  onElementSelect, 
  htmlContent 
}) => {
  const [isCodeView, setIsCodeView] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    onHTMLChange(newHtml);
  }, [onHTMLChange]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "Copiado!",
        description: "Código HTML copiado para a área de transferência",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código",
        variant: "destructive",
      });
    }
  }, [htmlContent]);

  const downloadHTML = useCallback(() => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
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
      description: "Arquivo HTML baixado com sucesso",
    });
  }, [htmlContent]);

  return (
    <Card className="h-full bg-editor-background border-border">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Editor HTML</h2>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCodeView(!isCodeView)}
            className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
          >
            {isCodeView ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadHTML}
            className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="p-3 h-full">
        <Textarea
          ref={textareaRef}
          value={htmlContent}
          onChange={handleCodeChange}
          placeholder="Cole seu código HTML aqui..."
          className="code-editor h-full resize-none text-xs leading-relaxed"
          spellCheck={false}
        />
      </div>
    </Card>
  );
};