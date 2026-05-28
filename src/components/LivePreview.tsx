
import React, { useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LivePreviewProps {
  htmlContent: string;
  onElementSelect: (element: HTMLElement) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ 
  htmlContent, 
  onElementSelect 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const injectClickHandler = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    
    // Remove existing event listeners
    doc.removeEventListener('click', handleElementClick);
    doc.addEventListener('click', handleElementClick);
    
    // Add enhanced styling for element selection
    const existingStyle = doc.getElementById('editor-selection-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = doc.createElement('style');
    style.id = 'editor-selection-styles';
    style.textContent = `
      [data-editable]:hover {
        outline: 2px solid #00FF00 !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
        transition: all 0.15s ease-out !important;
      }
      [data-editable].selected {
        outline: 3px solid #00FF00 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5) !important;
        position: relative !important;
      }
      [data-editable].selected::before {
        content: "✏️ Editando";
        position: absolute !important;
        top: -25px !important;
        left: 0 !important;
        background: #00FF00 !important;
        color: black !important;
        padding: 2px 6px !important;
        font-size: 11px !important;
        border-radius: 3px !important;
        font-weight: bold !important;
        z-index: 1000 !important;
      }
      [data-editable] {
        transition: all 0.2s ease !important;
      }
    `;
    doc.head.appendChild(style);
    
    // Mark all editable elements
    const editableElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, img, div, strong, em, i, b');
    editableElements.forEach((element) => {
      element.setAttribute('data-editable', 'true');
      element.classList.add('element-selectable');
    });

    console.log(`Marked ${editableElements.length} elements as editable`);
  }, []);

  const handleElementClick = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    
    // Remove previous selection
    const previousSelected = iframe.contentDocument.querySelectorAll('.selected');
    previousSelected.forEach(el => el.classList.remove('selected'));
    
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-editable')) {
      target.classList.add('selected');
      onElementSelect(target);
      
      console.log('Element selected:', {
        tag: target.tagName,
        text: target.textContent,
        id: target.id,
        className: target.className
      });
    }
  }, [onElementSelect]);

  // Update iframe content when htmlContent changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const updateContent = () => {
      if (iframe.contentDocument) {
        // Store currently selected element
        const selectedElement = iframe.contentDocument.querySelector('.selected');
        const selectedElementPath = selectedElement ? getElementPath(selectedElement) : null;
        
        // Update content
        iframe.contentDocument.body.innerHTML = htmlContent;
        
        // Restore handlers and styles
        injectClickHandler();
        
        // Try to restore selection
        if (selectedElementPath) {
          try {
            const restoredElement = getElementByPath(iframe.contentDocument, selectedElementPath);
            if (restoredElement) {
              restoredElement.classList.add('selected');
            }
          } catch (error) {
            console.log('Could not restore element selection:', error);
          }
        }
        
        console.log('Updated iframe content');
      }
    };

    const handleLoad = () => {
      updateContent();
    };

    iframe.addEventListener('load', handleLoad);
    
    // Update content immediately if iframe is already loaded
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      updateContent();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [htmlContent, injectClickHandler]);

  // Helper function to get element path
  const getElementPath = (element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(c => c && !c.includes('selected'));
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      // Add nth-child if necessary
      const siblings = Array.from(current.parentNode?.children || []);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  };

  // Helper function to get element by path
  const getElementByPath = (doc: Document, path: string): Element | null => {
    try {
      return doc.querySelector(path);
    } catch (error) {
      console.log('Invalid selector path:', path);
      return null;
    }
  };

  const getViewportStyles = () => {
    switch (viewMode) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  return (
    <div className="h-full bg-editor-background border-border rounded-component">
      <div className="flex items-center justify-between p-4 border-b border-border rounded-t-component">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Visualização</h2>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('desktop')}
            className="px-3 rounded-button editor-transition"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('tablet')}
            className="px-3 rounded-button editor-transition"
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mobile')}
            className="px-3 rounded-button editor-transition"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className={`p-4 h-full overflow-auto bg-muted/10 ${viewMode === 'mobile' ? 'mobile-preview-scrollbar' : 'custom-scrollbar'}`}>
        <div className="h-full flex items-center justify-center">
          <iframe
            ref={iframeRef}
            className="border border-border bg-background shadow-lg editor-transition rounded-component"
            style={getViewportStyles()}
            srcDoc={`<!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { 
                      margin: 0; 
                      padding: 20px; 
                      font-family: system-ui, -apple-system, sans-serif; 
                      position: relative;
                    }
                    * {
                      box-sizing: border-box;
                    }
                  </style>
                </head>
                <body>${htmlContent}</body>
              </html>`}
            title="HTML Preview"
          />
        </div>
      </div>
    </div>
  );
};
