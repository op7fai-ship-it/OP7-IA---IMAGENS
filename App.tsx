import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { AdContent, DesignConfig, FontFamily, TextAlign } from './types';

const App: React.FC = () => {
  // Application State
  const [creativePrompt, setCreativePrompt] = useState<string>('');

  const [content, setContent] = useState<AdContent>({
    headline: 'OP7 IA - IMAGENS',
    tagline: 'O Segredo dos Criativos que Escalavam 7 Dígitos',
    cta: 'VER PLANOS'
  });

  const [design, setDesign] = useState<DesignConfig>({
    size: '1080x1350',
    backgroundImage: null,
    referenceImage: null,
    logoImage: null,
    overlayOpacity: 0.15,
    cardOpacity: 0.8,
    cardColor: '#ffffff',

    // Scale percentages (relative to width)
    headlineScale: 2.5, // rem unit equivalent approx
    taglineScale: 1.2,
    ctaScale: 1.0,

    // Headline Defaults
    headlineColor: '#002B5B', // OP7 Navy
    headlineBgColor: 'transparent',
    headlineFont: 'Montserrat',
    headlineWeight: '900',
    headlineAlign: 'center',
    headlinePos: { x: 50, y: 30 },

    // Tagline Defaults
    taglineColor: '#1A73E8', // OP7 Blue
    taglineFont: 'Montserrat',
    taglineWeight: '600',
    taglineAlign: 'center',
    taglinePos: { x: 50, y: 55 },

    // CTA Defaults
    ctaColor: '#ffffff',
    ctaBgColor: '#FF7D3C', // OP7 Orange
    ctaFont: 'Montserrat',
    ctaWeight: '800',
    ctaAlign: 'center',
    ctaPos: { x: 50, y: 80 }
  });

  return (
    <div className="w-full h-screen flex overflow-hidden bg-op7-bg text-op7-text font-sans selection:bg-op7-blue selection:text-white">
      {/* Sidebar Controls */}
      <div className="flex-shrink-0 z-20 h-full border-r border-op7-border shadow-soft">
        <ControlPanel
          creativePrompt={creativePrompt}
          setCreativePrompt={setCreativePrompt}
          content={content}
          setContent={setContent}
          design={design}
          setDesign={setDesign}
        />
      </div>

      {/* Main Preview Area */}
      <main className="flex-1 relative bg-[#F1F5F9] flex flex-col items-center p-12 pt-16 overflow-auto scroll-smooth">
        {/* Top Header / Toolbar Area */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-op7-border flex items-center justify-between px-8 z-10 select-none">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-op7-navy uppercase tracking-widest leading-none">Workshop Ativo</span>
              <span className="text-[9px] font-bold text-op7-muted mt-0.5">ESTÚDIO DE INTELIGÊNCIA ARTIFICIAL</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-op7-navy uppercase tracking-widest leading-none">Formato Selecionado</span>
              <span className="text-[10px] font-bold text-op7-blue mt-0.5">{design.size === '1080x1350' ? 'POST FEED (4:5)' : 'STORIES (9:16)'}</span>
            </div>
            <div className="h-8 w-px bg-op7-border"></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-op7-navy text-white rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-op7-blue transition-colors shadow-lg shadow-op7-navy/10">
              Versão 1.0.4-AI
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl flex flex-col items-center">
          <div className="w-full mb-8 flex items-center justify-between border-b border-op7-border/50 pb-4">
            <h2 className="text-sm font-black text-op7-navy uppercase tracking-[0.2em]">Editor de Preview em Tempo Real</h2>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-op7-muted uppercase">Arraste e redimensione os blocos abaixo</span>
            </div>
          </div>

          <PreviewCanvas content={content} setContent={setContent} design={design} setDesign={setDesign} />

          {/* Visual Footer for Context */}
          <div className="mt-16 text-center pb-24 max-w-lg">
            <p className="text-xs text-op7-muted font-medium leading-relaxed">
              Este é um ambiente de criação assistida. Clique nos textos para editar inline ou arraste os blocos para redefinir o layout gerado pela IA.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;