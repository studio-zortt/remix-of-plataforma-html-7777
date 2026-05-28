import React, { useState, useCallback } from 'react';
import { LivePreview } from '@/components/LivePreview';
import { VisualEditor } from '@/components/VisualEditor';
import { CodeEditorDialog } from '@/components/CodeEditorDialog';
import { Code2, Zap } from 'lucide-react';
const Index = () => {
  const [htmlContent, setHtmlContent] = useState(`<div style="padding: 20px; max-width: 800px; margin: 0 auto;">
  <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Bem-vindo ao Editor Visual HTML</h1>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #555; margin-bottom: 15px;">Como usar:</h2>
    <p style="color: #666; line-height: 1.6;">
      1. Cole seu código HTML clicando em "Editar Código HTML"<br>
      2. Clique nos elementos na visualização para editá-los<br>
      3. Use o painel lateral para fazer alterações visuais<br>
      4. Copie ou baixe o código HTML final
    </p>
  </div>
  
  <button style="background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px;">
    Botão de Exemplo
  </button>
  
  <img src="https://via.placeholder.com/400x200/007bff/ffffff?text=Clique+para+editar" 
       alt="Imagem de exemplo" 
       style="display: block; margin: 20px auto; border-radius: 8px; max-width: 100%;">
  
  <p style="color: #666; text-align: center; margin-top: 20px;">
    <a href="https://exemplo.com" style="color: #007bff; text-decoration: none;">
      Link de exemplo - clique para editar
    </a>
  </p>
</div>`);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const handleHTMLChange = useCallback((html: string) => {
    setHtmlContent(html);
  }, []);
  const handleElementSelect = useCallback((element: HTMLElement) => {
    setSelectedElement(element);
  }, []);
  const handleElementUpdate = useCallback((element: HTMLElement, changes: Record<string, any>) => {
    console.log('Element updated:', element.tagName, changes);
  }, []);
  const handleEditorClose = useCallback(() => {
    setSelectedElement(null);
  }, []);
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-editor-background border-b border-border">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-component">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                HTML Visual Editor
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <CodeEditorDialog htmlContent={htmlContent} onHTMLChange={handleHTMLChange} onElementSelect={handleElementSelect} />
              
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex flex-col xl:flex-row h-[calc(100vh-88px)]">
        {/* Live Preview - Main area */}
        <div className="flex-1 border-r xl:border-r border-b xl:border-b-0 border-border min-h-[60vh] xl:min-h-full">
          <LivePreview htmlContent={htmlContent} onElementSelect={handleElementSelect} />
        </div>

        {/* Visual Editor Panel - Responsive sidebar */}
        <div className="w-full xl:w-80 2xl:w-96 flex-shrink-0 h-[40vh] xl:h-full overflow-hidden">
          <VisualEditor selectedElement={selectedElement} onElementUpdate={handleElementUpdate} onClose={handleEditorClose} htmlContent={htmlContent} onHTMLChange={handleHTMLChange} />
        </div>
      </div>
    </div>;
};
export default Index;