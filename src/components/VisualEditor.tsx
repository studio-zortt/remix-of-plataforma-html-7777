import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Settings, Type, Link, Image, Palette, Code, Brush, X, AlignLeft, AlignCenter, AlignRight, Box } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VisualEditorProps {
  selectedElement: HTMLElement | null;
  onElementUpdate: (element: HTMLElement, changes: Record<string, any>) => void;
  onClose: () => void;
  htmlContent: string;
  onHTMLChange: (html: string) => void;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({ 
  selectedElement, 
  onElementUpdate,
  onClose,
  htmlContent,
  onHTMLChange
}) => {
  const [textContent, setTextContent] = useState('');
  const [fontSize, setFontSize] = useState('16');
  const [fontWeight, setFontWeight] = useState('normal');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [textAlign, setTextAlign] = useState('left');
  const [linkHref, setLinkHref] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [imageHeight, setImageHeight] = useState('');
  const [customCSS, setCustomCSS] = useState('');
  const [useTextGradient, setUseTextGradient] = useState(false);
  const [useBackgroundGradient, setUseBackgroundGradient] = useState(false);
  const [textGradientColor1, setTextGradientColor1] = useState('#ff0000');
  const [textGradientColor2, setTextGradientColor2] = useState('#0000ff');
  const [textGradientDirection, setTextGradientDirection] = useState('to right');
  const [backgroundGradientColor1, setBackgroundGradientColor1] = useState('#ff0000');
  const [backgroundGradientColor2, setBackgroundGradientColor2] = useState('#0000ff');
  const [backgroundGradientDirection, setBackgroundGradientDirection] = useState('to right');
  const [padding, setPadding] = useState('0');
  const [margin, setMargin] = useState('0');
  const [borderRadius, setBorderRadius] = useState('0');
  const [borderWidth, setBorderWidth] = useState('0');
  const [borderColor, setBorderColor] = useState('#000000');

  useEffect(() => {
    if (!selectedElement) return;

    const computedStyle = window.getComputedStyle(selectedElement);
    
    // Load text content
    setTextContent(selectedElement.textContent || selectedElement.innerText || '');
    
    // Load typography properties
    setFontSize(String(parseInt(computedStyle.fontSize) || 16));
    setFontWeight(computedStyle.fontWeight || 'normal');
    setTextAlign(computedStyle.textAlign || 'left');
    
    // Load colors - treat them separately
    setTextColor(rgbToHex(computedStyle.color) || '#000000');
    
    // Background color - start as transparent by default
    const bgColor = computedStyle.backgroundColor;
    if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
      setBackgroundColor('transparent');
    } else {
      setBackgroundColor(rgbToHex(bgColor) || 'transparent');
    }
    
    // Load spacing and borders
    setPadding(computedStyle.padding || '0px');
    setMargin(computedStyle.margin || '0px');
    setBorderRadius(computedStyle.borderRadius || '0px');
    setBorderWidth(computedStyle.borderWidth || '0px');
    setBorderColor(rgbToHex(computedStyle.borderColor) || '#000000');
    
    // Check for gradients
    const backgroundImage = computedStyle.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && backgroundImage.includes('gradient')) {
      if (computedStyle.webkitBackgroundClip === 'text' || computedStyle.backgroundClip === 'text') {
        setUseTextGradient(true);
        setUseBackgroundGradient(false);
      } else {
        setUseBackgroundGradient(true);
        setUseTextGradient(false);
      }
    } else {
      setUseTextGradient(false);
      setUseBackgroundGradient(false);
    }
    
    // Element-specific settings
    if (selectedElement.tagName === 'A') {
      setLinkHref((selectedElement as HTMLAnchorElement).href || '');
    }
    
    if (selectedElement.tagName === 'IMG') {
      const img = selectedElement as HTMLImageElement;
      setImageSrc(img.src || '');
      setImageAlt(img.alt || '');
      setImageWidth(img.style.width || img.width?.toString() || '');
      setImageHeight(img.style.height || img.height?.toString() || '');
    }

    console.log('Properties loaded:', {
      tag: selectedElement.tagName,
      text: selectedElement.textContent,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      textColor: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      textAlign: computedStyle.textAlign
    });
  }, [selectedElement]);

  const rgbToHex = (rgb: string): string => {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return 'transparent';
    
    // If already hex, return as is
    if (rgb.startsWith('#')) return rgb;
    
    const result = rgb.match(/\d+/g);
    if (!result) return 'transparent';
    
    const [r, g, b] = result.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const applyChangesToElement = () => {
    if (!selectedElement) return;

    console.log('Applying changes to element:', selectedElement.tagName);

    // Apply text content
    if (textContent.trim() !== '') {
      if (selectedElement.tagName === 'INPUT') {
        (selectedElement as HTMLInputElement).value = textContent;
      } else {
        selectedElement.textContent = textContent;
      }
      console.log('Text content applied:', textContent);
    }
    
    // Apply typography
    selectedElement.style.fontSize = `${fontSize}px`;
    selectedElement.style.fontWeight = fontWeight;
    selectedElement.style.textAlign = textAlign;
    console.log('Typography applied:', { fontSize: `${fontSize}px`, fontWeight, textAlign });
    
    // Clear previous styles
    selectedElement.style.background = '';
    selectedElement.style.backgroundImage = '';
    selectedElement.style.color = '';
    selectedElement.style.backgroundColor = '';
    selectedElement.style.backgroundClip = '';
    selectedElement.style.webkitBackgroundClip = '';
    
    // Apply text gradient
    if (useTextGradient) {
      const gradient = `linear-gradient(${textGradientDirection}, ${textGradientColor1}, ${textGradientColor2})`;
      selectedElement.style.background = gradient;
      selectedElement.style.color = 'transparent';
      selectedElement.style.backgroundClip = 'text';
      selectedElement.style.webkitBackgroundClip = 'text';
      console.log('Text gradient applied:', gradient);
    }
    // Apply background gradient
    else if (useBackgroundGradient) {
      const gradient = `linear-gradient(${backgroundGradientDirection}, ${backgroundGradientColor1}, ${backgroundGradientColor2})`;
      selectedElement.style.background = gradient;
      selectedElement.style.color = textColor;
      console.log('Background gradient applied:', gradient);
    }
    // Apply solid colors - handle them separately
    else {
      // Always apply text color
      selectedElement.style.color = textColor;
      
      // Only apply background color if it's not transparent
      if (backgroundColor !== 'transparent') {
        selectedElement.style.backgroundColor = backgroundColor;
      } else {
        selectedElement.style.backgroundColor = 'transparent';
      }
      
      console.log('Solid colors applied:', { textColor, backgroundColor });
    }
    
    // Apply spacing and borders
    selectedElement.style.padding = padding.includes('px') ? padding : `${padding}px`;
    selectedElement.style.margin = margin.includes('px') ? margin : `${margin}px`;
    selectedElement.style.borderRadius = borderRadius.includes('px') ? borderRadius : `${borderRadius}px`;
    selectedElement.style.borderWidth = borderWidth.includes('px') ? borderWidth : `${borderWidth}px`;
    selectedElement.style.borderColor = borderColor;
    selectedElement.style.borderStyle = borderWidth !== '0' && borderWidth !== '0px' ? 'solid' : 'none';
    
    console.log('Spacing/borders applied:', { padding, margin, borderRadius, borderWidth, borderColor });
    
    // Apply custom CSS
    if (customCSS) {
      try {
        const cssRules = customCSS.split(';').filter(rule => rule.trim());
        cssRules.forEach(rule => {
          const [property, value] = rule.split(':').map(s => s.trim());
          if (property && value) {
            const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
            (selectedElement.style as any)[camelCaseProperty] = value;
          }
        });
        console.log('Custom CSS applied:', customCSS);
      } catch (error) {
        console.error('Error applying custom CSS:', error);
      }
    }
    
    // Handle specific element types
    if (selectedElement.tagName === 'A' && linkHref) {
      (selectedElement as HTMLAnchorElement).href = linkHref;
      console.log('Link href applied:', linkHref);
    }
    
    if (selectedElement.tagName === 'IMG') {
      const img = selectedElement as HTMLImageElement;
      if (imageSrc) img.src = imageSrc;
      if (imageAlt) img.alt = imageAlt;
      if (imageWidth) img.style.width = imageWidth.includes('px') ? imageWidth : `${imageWidth}px`;
      if (imageHeight) img.style.height = imageHeight.includes('px') ? imageHeight : `${imageHeight}px`;
      console.log('Image properties applied:', { src: imageSrc, alt: imageAlt, width: imageWidth, height: imageHeight });
    }
    
    // Ensure element maintains visual selection
    selectedElement.classList.add('selected');
    
    // Update HTML content
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentDocument) {
      const updatedHTML = iframe.contentDocument.body.innerHTML;
      onHTMLChange(updatedHTML);
      console.log('HTML updated');
    }
    
    // Notify parent component
    onElementUpdate(selectedElement, {
      textContent,
      fontSize,
      fontWeight,
      textColor,
      backgroundColor,
      textAlign,
      useTextGradient,
      useBackgroundGradient,
      textGradientColor1,
      textGradientColor2,
      textGradientDirection,
      backgroundGradientColor1,
      backgroundGradientColor2,
      backgroundGradientDirection,
      padding,
      margin,
      borderRadius,
      borderWidth,
      borderColor,
      customCSS,
      linkHref,
      imageSrc,
      imageAlt,
      imageWidth,
      imageHeight
    });

    toast({
      title: "Alterações aplicadas",
      description: "As mudanças foram aplicadas ao elemento selecionado",
    });
  };

  const isTextElement = () => {
    if (!selectedElement) return false;
    const textTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'STRONG', 'EM', 'I', 'B'];
    return textTags.includes(selectedElement.tagName);
  };

  const isImageElement = () => {
    return selectedElement?.tagName === 'IMG';
  };

  const isButtonElement = () => {
    return selectedElement?.tagName === 'BUTTON';
  };

  const isDivElement = () => {
    return selectedElement?.tagName === 'DIV';
  };

  const renderTextOptions = () => (
    <>
      {/* Text Content */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Type className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Conteúdo</Label>
        </div>
        <Textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Texto do elemento"
          className="bg-editor-background border-border text-sm rounded-component"
          rows={2}
        />
      </div>

      <Separator />

      {/* Typography */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipografia</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Tamanho</Label>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="bg-editor-background border-border text-sm h-8 rounded-component"
              min="8"
              max="72"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Peso</Label>
            <Select value={fontWeight} onValueChange={setFontWeight}>
              <SelectTrigger className="bg-editor-background border-border h-8 rounded-component">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-component">
                <SelectItem value="100">100 - Thin</SelectItem>
                <SelectItem value="200">200 - Extra Light</SelectItem>
                <SelectItem value="300">300 - Light</SelectItem>
                <SelectItem value="400">400 - Normal</SelectItem>
                <SelectItem value="500">500 - Medium</SelectItem>
                <SelectItem value="600">600 - Semi Bold</SelectItem>
                <SelectItem value="700">700 - Bold</SelectItem>
                <SelectItem value="800">800 - Extra Bold</SelectItem>
                <SelectItem value="900">900 - Black</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="lighter">Lighter</SelectItem>
                <SelectItem value="bolder">Bolder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Alinhamento</Label>
        <div className="grid grid-cols-3 gap-1">
          <Button
            variant={textAlign === 'left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTextAlign('left')}
            className="h-8 px-2"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={textAlign === 'center' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTextAlign('center')}
            className="h-8 px-2"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant={textAlign === 'right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTextAlign('right')}
            className="h-8 px-2"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Text Gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brush className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Gradiente de Texto</Label>
          </div>
          <Switch
            checked={useTextGradient}
            onCheckedChange={(checked) => {
              setUseTextGradient(checked);
              if (checked) setUseBackgroundGradient(false);
            }}
          />
        </div>
        {useTextGradient && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Cor 1</Label>
                <Input
                  type="color"
                  value={textGradientColor1}
                  onChange={(e) => setTextGradientColor1(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cor 2</Label>
                <Input
                  type="color"
                  value={textGradientColor2}
                  onChange={(e) => setTextGradientColor2(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direção</Label>
              <Select value={textGradientDirection} onValueChange={setTextGradientDirection}>
                <SelectTrigger className="bg-editor-background border-border h-8 rounded-component">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-component">
                  <SelectItem value="to right">Para direita</SelectItem>
                  <SelectItem value="to left">Para esquerda</SelectItem>
                  <SelectItem value="to bottom">Para baixo</SelectItem>
                  <SelectItem value="to top">Para cima</SelectItem>
                  <SelectItem value="45deg">Diagonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Text Color */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Cor do Texto</Label>
        </div>
        <Input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="bg-editor-background border-border h-8 rounded-component"
          disabled={useTextGradient}
        />
      </div>

      <Separator />

      {/* Link Settings */}
      {selectedElement?.tagName === 'A' && (
        <>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Link className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Link</Label>
            </div>
            <Input
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="https://exemplo.com"
              className="bg-editor-background border-border text-sm rounded-component"
            />
          </div>
          <Separator />
        </>
      )}
    </>
  );

  const renderImageOptions = () => (
    <>
      {/* Image Settings */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Image className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Imagem</Label>
        </div>
        <div className="space-y-2">
          <Input
            value={imageSrc}
            onChange={(e) => setImageSrc(e.target.value)}
            placeholder="URL da imagem"
            className="bg-editor-background border-border text-sm rounded-component"
          />
          <Input
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Texto alternativo"
            className="bg-editor-background border-border text-sm rounded-component"
          />
        </div>
      </div>

      <Separator />

      {/* Image Size */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tamanho da Imagem</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Largura (px)</Label>
            <Input
              type="number"
              value={imageWidth}
              onChange={(e) => setImageWidth(e.target.value)}
              placeholder="400"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
              min="1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Altura (px)</Label>
            <Input
              type="number"
              value={imageHeight}
              onChange={(e) => setImageHeight(e.target.value)}
              placeholder="300"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
              min="1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Image Borders */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Bordas da Imagem</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Espessura</Label>
            <Input
              value={borderWidth}
              onChange={(e) => setBorderWidth(e.target.value)}
              placeholder="1px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <Input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="bg-editor-background border-border h-8 rounded-component"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Arredondamento</Label>
          <Input
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
            placeholder="5px"
            className="bg-editor-background border-border text-sm h-8 rounded-component"
          />
        </div>
      </div>

      <Separator />
    </>
  );

  const renderButtonOptions = () => (
    <>
      {/* Button Text */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Type className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Texto do Botão</Label>
        </div>
        <Textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Texto do botão"
          className="bg-editor-background border-border text-sm rounded-component"
          rows={2}
        />
      </div>

      <Separator />

      {/* Button Colors */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Cores do Botão</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Cor do Texto</Label>
            <Input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="bg-editor-background border-border h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cor de Fundo</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="bg-editor-background border-border h-8 rounded-component flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBackgroundColor('transparent')}
                className="h-8 px-2 text-xs"
              >
                T
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Button Background Gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Gradiente de Fundo</Label>
          </div>
          <Switch
            checked={useBackgroundGradient}
            onCheckedChange={setUseBackgroundGradient}
          />
        </div>
        {useBackgroundGradient && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Cor 1</Label>
                <Input
                  type="color"
                  value={backgroundGradientColor1}
                  onChange={(e) => setBackgroundGradientColor1(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cor 2</Label>
                <Input
                  type="color"
                  value={backgroundGradientColor2}
                  onChange={(e) => setBackgroundGradientColor2(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direção</Label>
              <Select value={backgroundGradientDirection} onValueChange={setBackgroundGradientDirection}>
                <SelectTrigger className="bg-editor-background border-border h-8 rounded-component">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-component">
                  <SelectItem value="to right">Para direita</SelectItem>
                  <SelectItem value="to left">Para esquerda</SelectItem>
                  <SelectItem value="to bottom">Para baixo</SelectItem>
                  <SelectItem value="to top">Para cima</SelectItem>
                  <SelectItem value="45deg">Diagonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Button Size and Spacing */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tamanho e Espaçamento</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Padding</Label>
            <Input
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
              placeholder="12px 24px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Margin</Label>
            <Input
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="10px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Button Borders */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Bordas do Botão</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Espessura</Label>
            <Input
              value={borderWidth}
              onChange={(e) => setBorderWidth(e.target.value)}
              placeholder="1px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <Input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="bg-editor-background border-border h-8 rounded-component"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Arredondamento</Label>
          <Input
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
            placeholder="6px"
            className="bg-editor-background border-border text-sm h-8 rounded-component"
          />
        </div>
      </div>

      <Separator />
    </>
  );

  const renderDivOptions = () => (
    <>
      {/* Div Content */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Conteúdo do Div</Label>
        </div>
        <Textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Conteúdo do div"
          className="bg-editor-background border-border text-sm rounded-component"
          rows={2}
        />
      </div>

      <Separator />

      {/* Div Colors */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Cor de Fundo</Label>
        </div>
        <div className="flex gap-1">
          <Input
            type="color"
            value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="bg-editor-background border-border h-8 rounded-component flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBackgroundColor('transparent')}
            className="h-8 px-2 text-xs"
          >
            T
          </Button>
        </div>
      </div>

      <Separator />

      {/* Div Background Gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Gradiente de Fundo</Label>
          </div>
          <Switch
            checked={useBackgroundGradient}
            onCheckedChange={setUseBackgroundGradient}
          />
        </div>
        {useBackgroundGradient && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Cor 1</Label>
                <Input
                  type="color"
                  value={backgroundGradientColor1}
                  onChange={(e) => setBackgroundGradientColor1(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cor 2</Label>
                <Input
                  type="color"
                  value={backgroundGradientColor2}
                  onChange={(e) => setBackgroundGradientColor2(e.target.value)}
                  className="bg-editor-background border-border h-8 rounded-component"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direção</Label>
              <Select value={backgroundGradientDirection} onValueChange={setBackgroundGradientDirection}>
                <SelectTrigger className="bg-editor-background border-border h-8 rounded-component">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-component">
                  <SelectItem value="to right">Para direita</SelectItem>
                  <SelectItem value="to left">Para esquerda</SelectItem>
                  <SelectItem value="to bottom">Para baixo</SelectItem>
                  <SelectItem value="to top">Para cima</SelectItem>
                  <SelectItem value="45deg">Diagonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Div Size and Spacing */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tamanho e Espaçamento</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Padding</Label>
            <Input
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
              placeholder="20px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Margin</Label>
            <Input
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="10px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Div Borders */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Bordas do Div</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Espessura</Label>
            <Input
              value={borderWidth}
              onChange={(e) => setBorderWidth(e.target.value)}
              placeholder="1px"
              className="bg-editor-background border-border text-sm h-8 rounded-component"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <Input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="bg-editor-background border-border h-8 rounded-component"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Arredondamento</Label>
          <Input
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
            placeholder="8px"
            className="bg-editor-background border-border text-sm h-8 rounded-component"
          />
        </div>
      </div>

      <Separator />
    </>
  );

  if (!selectedElement) {
    return (
      <div className="h-full bg-editor-panel border-border rounded-component">
        <div className="p-6 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Editor Visual</h3>
          <p className="text-muted-foreground">
            Clique em um elemento na visualização para editá-lo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-editor-panel border-border rounded-component">
      <div className="flex items-center justify-between p-4 border-b border-border nav-hover editor-transition rounded-t-component">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Editando: {selectedElement.tagName.toLowerCase()}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="action-button-hover rounded-button editor-transition"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4 overflow-auto h-full">
        {/* Render context-specific options */}
        {isTextElement() && renderTextOptions()}
        {isImageElement() && renderImageOptions()}
        {isButtonElement() && renderButtonOptions()}
        {isDivElement() && renderDivOptions()}
        
        {/* Custom CSS - Always available */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">CSS Personalizado</Label>
          </div>
          <Textarea
            value={customCSS}
            onChange={(e) => setCustomCSS(e.target.value)}
            placeholder="color: red; font-size: 20px;"
            className="bg-editor-background border-border text-sm font-mono rounded-component min-h-[80px] max-h-[120px] overflow-y-auto"
            rows={3}
          />
        </div>

        {/* Apply Changes Button */}
        <div className="pt-4 pb-6">
          <Button 
            onClick={applyChangesToElement}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-component transition-colors"
          >
            Aplicar Alterações
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>💡 Clique em "Aplicar Alterações" para ver as mudanças</p>
        </div>
      </div>
    </div>
  );
};
