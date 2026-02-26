import React, { useState, useRef, useEffect } from 'react';
import { AdContent, DesignConfig, FontFamily, TextAlign } from '../types';
import { Image as ImageIcon, Sparkles, Move, Maximize2, RotateCcw } from 'lucide-react';

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

  // Dimensions
  const width = 1080;
  const height = design.size === '1080x1350' ? 1350 : 1920;
  const aspectRatio = width / height;

  const getFontClass = (font: FontFamily) => font === 'Bebas Neue' ? 'font-bebas tracking-wide' : 'font-montserrat';
  const getJustifyClass = (align: TextAlign) => {
    switch (align) {
      case 'left': return 'justify-start text-left';
      case 'right': return 'justify-end text-right';
      default: return 'justify-center text-center';
    }
  };

  const handleMouseDown = (element: string, e: React.MouseEvent) => {
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
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      if (dragging) {
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        const snap = 3;
        let sx = false, sy = false;
        if (Math.abs(x - 50) < snap) { x = 50; sx = true; }
        if (Math.abs(y - 50) < snap) { y = 50; sy = true; }
        setSnapLines({ x: sx, y: sy });
        x = Math.max(2, Math.min(98, x));
        y = Math.max(2, Math.min(98, y));
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
        setDesign(p => ({ ...p, [fieldScale]: Math.max(0.4, Math.min(8, newScale)) }));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
      setSnapLines({ x: false, y: false });
    };

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, design, setDesign]);

  const DraggableElement = ({ id, label, value, field, config }: { id: string, label: string, value: string, field: keyof AdContent, config: { pos: { x: number, y: number }, color: string, bgColor: string, font: FontFamily, scale: number, weight: string, align: TextAlign } }) => {
    const isSelected = selected === id;

    return (
      <div
        className={`absolute z-10 w-fit max-w-[95%] group transition-all duration-75 ${isSelected ? 'z-50' : 'z-10'}`}
        style={{
          top: `${config.pos.y}%`,
          left: `${config.pos.x}%`,
          transform: 'translate(-50%, -50%)',
          cursor: dragging === id ? 'grabbing' : 'default'
        }}
        onMouseDown={(e) => handleMouseDown(id, e)}
      >
        {/* Helper UI */}
        {isSelected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-op7-navy px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl border border-white/20 whitespace-nowrap animate-in zoom-in duration-200">
            <Move size={12} className="text-op7-blue" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
            <div className="w-px h-3 bg-white/20"></div>
            <span className="text-[9px] font-bold text-white/60 italic">ARRASTE PARA MOVER | DUPLO CLIQUE PARA TEXTO</span>
          </div>
        )}

        <div className={`relative flex ${getJustifyClass(config.align)}`}>
          <div
            className={`relative px-12 py-8 rounded-[40px] transition-all duration-300 ${isSelected ? 'ring-4 ring-op7-blue shadow-2xl border-transparent' : 'border border-white/30 shadow-xl'}`}
            style={{
              backgroundColor: config.bgColor === 'transparent' ? `rgba(255,255,255, ${design.cardOpacity})` : config.bgColor,
              backdropFilter: 'blur(24px)',
              boxShadow: isSelected ? '0 30px 60px -15px rgba(26, 115, 232, 0.3)' : '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleContentBlur(field, e)}
              className={`outline-none break-words ${getFontClass(config.font)} text-center block cursor-text`}
              style={{
                color: config.color,
                fontSize: `${config.scale}rem`,
                fontWeight: config.weight,
                lineHeight: '1.15',
                minWidth: '120px',
                textTransform: id === 'headline' ? 'uppercase' : 'none'
              }}
            >
              {value}
            </div>

            {/* Resize Handles - All Corners */}
            {isSelected && (
              <>
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full shadow-lg cursor-nwse-resize z-50 flex items-center justify-center transform hover:scale-125 transition-transform" onMouseDown={(e) => handleResizeStart(id, e)}><div className="w-1.5 h-1.5 bg-op7-blue rounded-full"></div></div>
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full shadow-lg cursor-nesw-resize z-50 flex items-center justify-center transform hover:scale-125 transition-transform" onMouseDown={(e) => handleResizeStart(id, e)}><div className="w-1.5 h-1.5 bg-op7-blue rounded-full"></div></div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full shadow-lg cursor-nesw-resize z-50 flex items-center justify-center transform hover:scale-125 transition-transform" onMouseDown={(e) => handleResizeStart(id, e)}><div className="w-1.5 h-1.5 bg-op7-blue rounded-full"></div></div>
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full shadow-lg cursor-nwse-resize z-50 flex items-center justify-center transform hover:scale-125 transition-transform" onMouseDown={(e) => handleResizeStart(id, e)}><div className="w-1.5 h-1.5 bg-op7-blue rounded-full"></div></div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DraggableCTA = () => {
    const isSelected = selected === 'cta';
    return (
      <div
        className={`absolute z-40 transition-all duration-75`}
        style={{
          top: `${design.ctaPos.y}%`,
          left: `${design.ctaPos.x}%`,
          transform: 'translate(-50%, -50%)',
          cursor: dragging === 'cta' ? 'grabbing' : 'default'
        }}
        onMouseDown={(e) => handleMouseDown('cta', e)}
      >
        <div
          className={`relative px-14 py-6 rounded-full text-white font-black shadow-2xl transition-all flex items-center gap-5 border-4 ${isSelected ? 'border-white scale-105 ring-4 ring-op7-accent/30' : 'border-white/20'}`}
          style={{
            backgroundColor: design.ctaBgColor,
            fontSize: `${design.ctaScale}rem`,
          }}
        >
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleContentBlur('cta', e)}
            className={`outline-none uppercase tracking-[0.2em] ${getFontClass(design.ctaFont)} cursor-text`}
            style={{ fontWeight: design.ctaWeight }}
          >
            {content.cta}
          </span>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M14 5l7 7-7 7" /></svg>
          </div>

          {/* Resize handle */}
          {isSelected && (
            <div
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-op7-accent rounded-full shadow-lg cursor-pointer transform hover:scale-110"
              onMouseDown={(e) => handleResizeStart('cta', e)}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-transparent outline-none" onMouseDown={() => setSelected(null)}>
      <div
        className="relative bg-white p-4 rounded-[64px] shadow-[0_50px_100px_-20px_rgba(0,43,91,0.15)] border border-op7-border select-none"
        style={{ width: '100%', maxWidth: '640px', aspectRatio: `${aspectRatio}` }}
      >
        <div
          ref={canvasRef}
          className="relative w-full h-full overflow-hidden rounded-[52px] bg-[#FDFDFF] shadow-inner"
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          {/* Smart Guides */}
          {snapLines.x && <div className="absolute top-0 bottom-0 left-1/2 w-[3px] bg-op7-blue/40 z-[100] animate-pulse pointer-events-none" />}
          {snapLines.y && <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-op7-blue/40 z-[100] animate-pulse pointer-events-none" />}

          {/* Canvas View Content */}
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${608 / width})` }}
            id="ad-canvas"
          >
            {design.backgroundImage ? (
              <img src={design.backgroundImage} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="absolute inset-0 bg-[#F8FAFC]">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23002B5B' fill-opacity='1'/%3E%3C/svg%3E")` }}></div>
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-10 opacity-[0.06] selection:bg-none">
                  <Sparkles size={240} className="text-op7-navy" />
                  <span className="text-7xl font-black uppercase tracking-[1.2em] text-op7-navy">OP7 IA</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-op7-navy/30 via-transparent to-op7-blue/10" style={{ opacity: design.overlayOpacity }} />
          </div>

          {/* Interaction Elements */}
          <DraggableElement
            id="headline"
            label="TÍTULO PRINCIPAL"
            value={content.headline}
            field="headline"
            config={{ pos: design.headlinePos, color: design.headlineColor, bgColor: design.headlineBgColor, font: design.headlineFont, scale: design.headlineScale, weight: design.headlineWeight, align: design.headlineAlign }}
          />
          <DraggableElement
            id="tagline"
            label="SUB-TÍTULO / DESCRIÇÃO"
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