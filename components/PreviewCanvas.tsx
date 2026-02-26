import React, { useState, useRef, useEffect } from 'react';
import { AdContent, DesignConfig, FontFamily, TextAlign } from '../types';
import { Move, Maximize2, Sparkles, AlertCircle } from 'lucide-react';

interface PreviewCanvasProps {
  content: AdContent;
  setContent: React.Dispatch<React.SetStateAction<AdContent>>;
  design: DesignConfig;
  setDesign: React.Dispatch<React.SetStateAction<DesignConfig>>;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ content, setContent, design, setDesign }) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x: boolean, y: boolean }>({ x: false, y: false });

  const canvasRef = useRef<HTMLDivElement>(null);
  const width = 1080;
  const height = design.size === '1080x1350' ? 1350 : 1920;
  const aspectRatio = width / height;

  const handleMouseDown = (element: string, e: React.MouseEvent) => {
    // 🔥 IMPORTANTE: Se o clique foi no texto editável, NÃO inicia o drag imediatamente
    // Permitir que o navegador foque no texto
    if ((e.target as HTMLElement).isContentEditable) {
      return;
    }

    e.stopPropagation();
    setDragging(element);
    setSelected(element);
  };

  const handleResizeStart = (element: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(element);
  };

  const handleContentBlur = (field: keyof AdContent, e: React.FocusEvent<HTMLElement>) => {
    setContent(prev => ({ ...prev, [field]: e.currentTarget.innerText }));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || (!dragging && !resizing)) return;
      const rect = canvasRef.current.getBoundingClientRect();

      if (dragging) {
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;

        const snap = 2;
        let sx = false, sy = false;
        if (Math.abs(x - 50) < snap) { x = 50; sx = true; }
        if (Math.abs(y - 50) < snap) { y = 50; sy = true; }
        setSnapLines({ x: sx, y: sy });

        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        const field = `${dragging}Pos` as keyof DesignConfig;
        setDesign(p => ({ ...p, [field]: { x: Math.round(x), y: Math.round(y) } }));
      }

      if (resizing) {
        const fieldPos = `${resizing}Pos` as keyof DesignConfig;
        const pos = design[fieldPos] as { x: number, y: number };
        const elCenterX = rect.left + (pos.x / 100) * rect.width;
        const dist = Math.abs(e.clientX - elCenterX);
        const newScale = (dist / rect.width) * 12;
        const fieldScale = `${resizing}Scale` as keyof DesignConfig;
        setDesign(p => ({ ...p, [fieldScale]: Math.max(0.3, Math.min(10, newScale)) }));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
      setSnapLines({ x: false, y: false });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, design, setDesign]);

  const DraggableElement = ({ id, label, value, field, config }: { id: string, label: string, value: string, field: keyof AdContent, config: { pos: { x: number, y: number }, color: string, bgColor: string, font: FontFamily, scale: number, weight: string, align: TextAlign } }) => {
    const isSelected = selected === id;
    const fontClass = config.font === 'Bebas Neue' ? 'font-bebas tracking-wide' : 'font-montserrat';

    return (
      <div
        className={`absolute z-10 w-fit max-w-[95%] transition-all ${isSelected ? 'z-50' : ''}`}
        style={{
          top: `${config.pos.y}%`,
          left: `${config.pos.x}%`,
          transform: 'translate(-50%, -50%)',
          cursor: isSelected ? 'default' : 'move'
        }}
        onMouseDown={(e) => handleMouseDown(id, e)}
      >
        {/* Hover/Selection Guide */}
        {isSelected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-op7-navy text-white text-[9px] px-3 py-1.5 rounded-full font-black flex items-center gap-2 whitespace-nowrap shadow-xl border border-white/20 select-none">
            <Move size={10} className="text-op7-blue" />
            <span>{label}</span>
            <span className="opacity-30">|</span>
            <span className="text-op7-blue">CLIQUE PARA EDITAR</span>
          </div>
        )}

        <div
          className={`relative px-10 py-6 rounded-[32px] transition-all border-2 ${isSelected ? 'border-op7-blue bg-white shadow-2xl' : 'border-transparent hover:border-op7-blue/30 hover:bg-white/50'}`}
          style={{
            backgroundColor: isSelected ? 'white' : `rgba(255,255,255, ${design.cardOpacity})`,
            backdropFilter: 'blur(20px)',
            boxShadow: isSelected ? '0 30px 60px -15px rgba(26, 115, 232, 0.4)' : '0 10px 30px -5px rgba(0,0,0,0.1)'
          }}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleContentBlur(field, e)}
            onFocus={() => setSelected(id)}
            className={`outline-none break-words ${fontClass} text-center block cursor-text`}
            style={{
              color: config.color,
              fontSize: `${config.scale}rem`,
              fontWeight: config.weight,
              lineHeight: '1.2',
              minWidth: '100px',
              textTransform: id === 'headline' ? 'uppercase' : 'none'
            }}
          >
            {value}
          </div>

          {/* Resize Handles */}
          {isSelected && (
            <>
              <div
                className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
                onMouseDown={(e) => handleResizeStart(id, e)}
              ><Maximize2 size={10} className="text-op7-blue" /></div>
            </>
          )}
        </div>
      </div>
    );
  };

  const DraggableCTA = () => {
    const isSelected = selected === 'cta';
    const fontClass = design.ctaFont === 'Bebas Neue' ? 'font-bebas tracking-wide' : 'font-montserrat';
    return (
      <div
        className={`absolute z-40 transition-shadow`}
        style={{
          top: `${design.ctaPos.y}%`,
          left: `${design.ctaPos.x}%`,
          transform: 'translate(-50%, -50%)',
          cursor: isSelected ? 'default' : 'move'
        }}
        onMouseDown={(e) => handleMouseDown('cta', e)}
      >
        <div
          className={`relative px-12 py-5 rounded-full text-white font-black shadow-2xl flex items-center gap-4 border-4 transition-all ${isSelected ? 'border-white scale-105 ring-4 ring-op7-accent/30' : 'border-transparent'}`}
          style={{
            backgroundColor: design.ctaBgColor,
            fontSize: `${design.ctaScale}rem`,
          }}
        >
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleContentBlur('cta', e)}
            onFocus={() => setSelected('cta')}
            className={`outline-none uppercase tracking-widest ${fontClass} cursor-text`}
            style={{ fontWeight: design.ctaWeight }}
          >
            {content.cta}
          </span>
          <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M14 5l7 7-7 7" /></svg>

          {isSelected && (
            <div
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-op7-accent rounded-full shadow-lg cursor-pointer"
              onMouseDown={(e) => handleResizeStart('cta', e)}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-transparent outline-none" onMouseDown={() => setSelected(null)}>
      <div
        className="relative bg-white p-4 rounded-[56px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-op7-border select-none"
        style={{ width: '100%', maxWidth: '620px', aspectRatio: `${aspectRatio}` }}
      >
        <div
          ref={canvasRef}
          className="relative w-full h-full overflow-hidden rounded-[44px] bg-[#F8FAFC] shadow-inner"
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          {/* Smart Guides */}
          {snapLines.x && <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-op7-blue/40 z-[100] animate-pulse pointer-events-none" />}
          {snapLines.y && <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-op7-blue/40 z-[100] animate-pulse pointer-events-none" />}

          {/* Canvas View Content */}
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${588 / width})` }}
            id="ad-canvas"
          >
            {design.backgroundImage ? (
              <img src={design.backgroundImage} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="absolute inset-0 bg-[#F8FAFC] flex items-center justify-center flex-col gap-8 opacity-[0.05]">
                <Sparkles size={250} className="text-op7-navy" />
                <span className="text-7xl font-black uppercase tracking-[1em] text-op7-navy text-center ml-10">OP7 IA - IMAGENS</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" style={{ opacity: design.overlayOpacity }} />
          </div>

          {/* Interaction Elements */}
          <DraggableElement
            id="headline"
            label="TÍTULO"
            value={content.headline}
            field="headline"
            config={{ pos: design.headlinePos, color: design.headlineColor, bgColor: design.headlineBgColor, font: design.headlineFont, scale: design.headlineScale, weight: design.headlineWeight, align: design.headlineAlign }}
          />
          <DraggableElement
            id="tagline"
            label="DESCRIÇÃO"
            value={content.tagline}
            field="tagline"
            config={{ pos: design.taglinePos, color: design.taglineColor, bgColor: 'transparent', font: design.taglineFont, scale: design.taglineScale, weight: design.taglineWeight, align: design.taglineAlign }}
          />
          <DraggableCTA />
        </div>
      </div>
    </div>
  );
};