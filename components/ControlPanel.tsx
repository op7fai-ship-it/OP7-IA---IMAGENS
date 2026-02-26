import React, { useState } from 'react';
import { AdContent, DesignConfig, GenerationStatus, FontFamily, TextAlign, Position } from '../types';
import { generateFullCreative, generateCreativeCopy, generateCreativeImage } from '../services/geminiService';
import html2canvas from 'html2canvas';
import {
  Wand2,
  Upload,
  Layout,
  Type,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Maximize2
} from 'lucide-react';

interface ControlPanelProps {
  creativePrompt: string;
  setCreativePrompt: (val: string) => void;
  content: AdContent;
  setContent: React.Dispatch<React.SetStateAction<AdContent>>;
  design: DesignConfig;
  setDesign: React.Dispatch<React.SetStateAction<DesignConfig>>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  creativePrompt,
  setCreativePrompt,
  content,
  setContent,
  design,
  setDesign
}) => {
  const [genStatus, setGenStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [downloading, setDownloading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'headline' | 'tagline' | 'cta' | 'background' | null>(null);

  const handleGenerateAll = async () => {
    console.log("🚀 [DEBUG] CLICK: handleGenerateAll");
    if (!creativePrompt) {
      alert("Por favor, descreva o que deseja criar no campo 'Prompt do Criativo'!");
      return;
    }

    setGenStatus(GenerationStatus.LOADING);

    try {
      const result = await generateFullCreative(creativePrompt);
      console.log("✅ [DEBUG] Resposta Completa AI:", result);

      // Update content
      setContent(result.content);

      // Update design with positions
      setDesign(prev => ({
        ...prev,
        headlinePos: result.layout.headlinePos,
        taglinePos: result.layout.taglinePos,
        ctaPos: result.layout.ctaPos,
      }));

      // Start image generation separately
      console.log("⏳ [DEBUG] Iniciando geração da imagem...");
      const imageUrl = await generateCreativeImage(result.imagePrompt);

      setDesign(prev => ({
        ...prev,
        backgroundImage: imageUrl
      }));

      setGenStatus(GenerationStatus.SUCCESS);
    } catch (e: any) {
      console.error("❌ [DEBUG] Erro Geração Completa:", e);
      setGenStatus(GenerationStatus.ERROR);
      alert(`Erro na geração: ${e.message}`);
    }
  };

  const handleRegenerateText = async () => {
    if (!creativePrompt) return;
    setGenStatus(GenerationStatus.LOADING);
    try {
      const generated = await generateCreativeCopy(creativePrompt, 'Geral');
      setContent(generated);
      setGenStatus(GenerationStatus.SUCCESS);
    } catch (e) {
      setGenStatus(GenerationStatus.ERROR);
    }
  };

  const handleRegenerateImage = async () => {
    if (!creativePrompt) return;
    setGenStatus(GenerationStatus.LOADING);
    try {
      // Create a simplified prompt for background refresh
      const imgUrl = await generateCreativeImage(`Advertising background based on: ${creativePrompt}`);
      setDesign(prev => ({ ...prev, backgroundImage: imgUrl }));
      setGenStatus(GenerationStatus.SUCCESS);
    } catch (e) {
      setGenStatus(GenerationStatus.ERROR);
    }
  };

  const handleDownload = async () => {
    const canvasElement = document.getElementById('ad-canvas');
    if (!canvasElement) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(canvasElement, { useCORS: true, scale: 2 });
      const link = document.createElement('a');
      link.download = `criativo-op7-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert("Erro ao baixar.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-[450px] h-full flex flex-col bg-white overflow-hidden relative select-none">
      {/* Header with OP7 Logo */}
      <div className="p-8 pb-3 border-b border-op7-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center">
            <img src="/logo op.png" alt="Logo OP7" className="h-12 w-auto object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-op7-navy leading-none tracking-tight">OP7 <span className="text-op7-blue">IA</span></h1>
            <p className="text-[10px] font-black text-op7-muted uppercase tracking-[0.3em] mt-1.5">Studio Imagens</p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          {[1, 2, 3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-op7-blue border-2 border-white text-[8px] flex items-center justify-center text-white font-black italic">AI</div>)}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12 pb-48 scroll-smooth">

        {/* Section 1: IA Main Console */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-op7-navy text-white flex items-center justify-center shadow-lg shadow-op7-navy/10">
              <Zap size={20} className="fill-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-op7-navy uppercase tracking-widest">Criação AI First</h2>
              <p className="text-[10px] font-bold text-op7-muted mt-0.5">Diga o que você quer vender e a IA faz tudo!</p>
            </div>
          </div>

          <div className="bg-op7-bg/40 p-1.5 rounded-3xl border border-op7-border shadow-soft">
            <div className="bg-white rounded-2xl p-6 space-y-4 border border-op7-border shadow-inner">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-op7-muted uppercase tracking-widest">Prompt do Criativo</label>
                <textarea
                  value={creativePrompt}
                  onChange={(e) => setCreativePrompt(e.target.value)}
                  placeholder="Ex: Anúncio de clínica odontológica em Maringá, foco em implantes e estética, público classe A..."
                  className="w-full h-32 bg-op7-bg/30 border border-op7-border rounded-2xl p-4 text-[13px] font-medium text-op7-text focus:border-op7-blue focus:ring-4 focus:ring-op7-blue/5 outline-none transition-all resize-none shadow-soft placeholder:text-gray-300"
                />
              </div>

              <button
                onClick={handleGenerateAll}
                disabled={genStatus === GenerationStatus.LOADING}
                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl
                       ${genStatus === GenerationStatus.LOADING
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-op7-navy hover:bg-op7-navy/95 text-white shadow-op7-navy/20'}`}
              >
                {genStatus === GenerationStatus.LOADING ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <>GERAR CRIATIVO COMPLETO <Sparkles size={20} className="text-op7-accent" /></>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-3 px-1">
            <button
              onClick={handleRegenerateText}
              className="flex-1 py-3 bg-white border border-op7-border rounded-xl text-[10px] font-black text-op7-navy uppercase tracking-widest hover:border-op7-blue hover:text-op7-blue transition-all flex items-center justify-center gap-2 shadow-soft active:scale-95"
            >
              <RefreshCw size={12} /> Regenerar Copy
            </button>
            <button
              onClick={handleRegenerateImage}
              className="flex-1 py-3 bg-white border border-op7-border rounded-xl text-[10px] font-black text-op7-navy uppercase tracking-widest hover:border-op7-blue hover:text-op7-blue transition-all flex items-center justify-center gap-2 shadow-soft active:scale-95"
            >
              <ImageIcon size={12} /> Novo Fundo
            </button>
          </div>
        </section>

        {/* Section 2: Fine Tuning - Folded */}
        <section className="space-y-6 pt-4 border-t border-op7-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-op7-blue/10 flex items-center justify-center text-op7-blue">
                <Palette size={18} />
              </div>
              <h2 className="text-xs font-black text-op7-navy uppercase tracking-widest">Refinamento Manual</h2>
            </div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'background' ? null : 'background')}
              className="text-xs font-bold text-op7-blue hover:underline"
            >
              Ajustar
            </button>
          </div>

          {expandedSection === 'background' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Layout Formats */}
              <div className="grid grid-cols-2 gap-4">
                {['1080x1350', '1080x1920'].map(size => (
                  <button
                    key={size}
                    onClick={() => setDesign(p => ({ ...p, size: size as any }))}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2
                            ${design.size === size ? 'border-op7-blue bg-op7-blue/5 shadow-inner' : 'border-op7-border bg-white hover:border-op7-blue/30'}`}
                  >
                    <span className={`text-[10px] font-black uppercase ${design.size === size ? 'text-op7-blue' : 'text-op7-muted'}`}>
                      {size === '1080x1350' ? 'Post Feed' : 'Stories'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Background Upload & Opacity */}
              <div className="bg-op7-bg/50 p-6 rounded-2xl border border-op7-border space-y-6">
                <label className="block w-full text-center p-4 bg-white border-2 border-dashed border-op7-border rounded-xl cursor-pointer hover:border-op7-blue transition-colors group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setDesign(p => ({ ...p, backgroundImage: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <div className="flex items-center justify-center gap-2">
                    <Upload size={14} className="text-op7-muted group-hover:text-op7-blue" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-op7-muted group-hover:text-op7-blue">Upload Fundo Manual</span>
                  </div>
                </label>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-op7-navy uppercase tracking-widest">Escurecimento de Fundo (Foco)</span>
                    <span className="text-[10px] font-bold text-op7-blue">{(design.overlayOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="0.9" step="0.05"
                    value={design.overlayOpacity}
                    onChange={(e) => setDesign(p => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                    className="w-full accent-op7-blue h-1.5 bg-op7-border rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Export Bar */}
      <div className="p-8 pb-10 border-t border-op7-border bg-white shadow-[0_-20px_40px_rgba(0,43,91,0.03)] selection:bg-none z-30">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-5 bg-op7-accent hover:bg-op7-accent/90 text-white rounded-[24px] font-black text-sm shadow-xl shadow-op7-accent/20 flex items-center justify-center gap-4 transition-all hover:-translate-y-1 active:scale-[0.98] border-b-4 border-orange-700"
        >
          <Download size={24} />
          {downloading ? 'PREPARANDO...' : 'EXPORTAR ALTA DEFINIÇÃO'}
        </button>
        <p className="text-[9px] text-center text-op7-muted font-bold uppercase tracking-[0.3em] mt-4 opacity-70">Sincronizado via OP7 Super-Engine v1.0</p>
      </div>
    </div>
  );
};