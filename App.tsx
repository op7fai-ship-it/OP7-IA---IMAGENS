import React, { useState, useCallback, useRef } from 'react';
import { Composer } from './components/Composer';
import { CanvasEditor } from './components/CanvasEditor';
import { DesignConfig, GenerationStatus, GenerationOptions, GenerationProgress, ProjectVersion } from './types';
import { generateCreative, regenerateLayer } from './services/geminiService';
import { Sparkles, MessageSquare, History, ChevronRight } from 'lucide-react';

const INITIAL_CONFIG: DesignConfig = {
  size: '1080x1350',
  backgroundColor: '#F8FAFC',
  backgroundImage: null,
  overlayOpacity: 0.1,
  overlayColor: '#000000',
  layers: []
};

const App: React.FC = () => {
  const [view, setView] = useState<'chat' | 'editor'>('chat');
  const [config, setConfig] = useState<DesignConfig>(INITIAL_CONFIG);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState<GenerationProgress>({ step: 'Aguardando prompt...', percentage: 0 });
  const [lastPrompt, setLastPrompt] = useState('');

  // History / Versioning
  const [history, setHistory] = useState<DesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  const addToHistory = useCallback((newConfig: DesignConfig) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newConfig];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleGenerate = async (prompt: string, images: string[], options: GenerationOptions) => {
    setStatus(GenerationStatus.INTERPRETING);
    setLastPrompt(prompt);

    try {
      const result = await generateCreative(prompt, images, options, (p) => setProgress(p));

      setConfig(result.config);
      addToHistory(result.config);
      setVersions(prev => [...prev, { id: `v${prev.length + 1}`, timestamp: Date.now(), config: result.config }]);

      setStatus(GenerationStatus.SUCCESS);
      setView('editor');
    } catch (error: any) {
      console.error(error);
      setStatus(GenerationStatus.ERROR);
      alert("Falha ao gerar o criativo: " + error.message);
    }
  };

  const handleRegenerate = async (target: 'all' | 'text' | 'art' | 'layout') => {
    if (target === 'all') {
      // Redo the whole thing with same prompt, persisting user selected palette and size
      handleGenerate(lastPrompt, [], { palette: config.palette, format: config.size });
      return;
    }

    try {
      setStatus(GenerationStatus.GENERATING_TEXT);
      const newConfig = await regenerateLayer(config, target);
      setConfig(newConfig);
      addToHistory(newConfig);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err) {
      alert("Erro ao regenerar parte do criativo.");
      setStatus(GenerationStatus.SUCCESS);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setConfig(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setConfig(history[historyIndex + 1]);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-op7-bg overflow-hidden font-sans">
      {/* Dynamic Header */}
      <header className="h-20 bg-white/70 backdrop-blur-2xl border-b border-op7-border px-8 flex items-center justify-between z-40">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-op7-navy tracking-tighter flex items-center gap-2">
              OP7 <span className="text-op7-blue">IA</span>
              <span className="text-[10px] bg-op7-blue/10 text-op7-blue px-2 py-0.5 rounded-full tracking-widest font-bold ml-2 uppercase">Imagens</span>
            </h1>
          </div>

          {view === 'editor' && (
            <div className="flex items-center gap-2 ml-4">
              <div className="h-4 w-px bg-slate-200" />
              <button
                onClick={() => setView('chat')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-all"
              >
                <MessageSquare size={14} /> Refinar Prompt
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {versions.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setConfig(v.config);
                    addToHistory(v.config);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${config === v.config ? 'bg-white text-op7-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  V{i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="h-10 w-px bg-slate-100" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-op7-navy uppercase tracking-widest leading-none">Motor de IA</span>
            <span className={`text-[10px] font-bold mt-1 uppercase flex items-center gap-1.5 ${status === GenerationStatus.SUCCESS ? 'text-green-500' : 'text-op7-blue animate-pulse'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status === GenerationStatus.SUCCESS ? 'bg-green-500' : 'bg-op7-blue shadow-[0_0_8px_rgba(26,115,232,0.5)]'}`} />
              {status === GenerationStatus.IDLE ? 'Pronto' :
                status === GenerationStatus.INTERPRETING ? 'Interpretando prompt...' :
                  status === GenerationStatus.GENERATING_TEXT ? 'Gerando texto...' :
                    status === GenerationStatus.GENERATING_ART ? 'Gerando arte...' :
                      status === GenerationStatus.ASSEMBLING ? 'Montando layout...' :
                        status === GenerationStatus.ERROR ? 'Erro na Geração' : 'Processando...'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {view === 'chat' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-slate-50">
            <div className="w-full max-w-2xl text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-op7-navy text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <Sparkles size={12} className="text-op7-accent" />
                Powered by OP7 Intelligence
              </div>
              <h2 className="text-5xl font-black text-op7-navy tracking-tight leading-[0.9]">
                Transforme ideias em <br />
                <span className="text-op7-blue">Criativos de Elite</span>
              </h2>
              <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                A primeira IA do mercado focada em design psicológico para tráfego pago. Descreva seu produto e nós fazemos o resto.
              </p>
            </div>

            <Composer
              onGenerate={handleGenerate}
              isGenerating={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR}
              lastPrompt={lastPrompt}
            />

            <div className="mt-12 flex items-center gap-8 text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold">1</div>
                <span className="text-[10px] font-black uppercase tracking-widest">Prompt</span>
              </div>
              <ChevronRight size={14} />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold">2</div>
                <span className="text-[10px] font-black uppercase tracking-widest">Geração</span>
              </div>
              <ChevronRight size={14} />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-op7-blue text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-op7-blue/20">3</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-op7-navy">Editor</span>
              </div>
            </div>
          </div>
        ) : (
          <CanvasEditor
            config={config}
            setConfig={setConfig}
            status={status}
            progress={progress}
            onRegenerate={handleRegenerate}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        )}
      </main>
    </div>
  );
};

export default App;