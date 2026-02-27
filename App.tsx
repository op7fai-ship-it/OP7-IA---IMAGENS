import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Composer } from './components/Composer';
import { CanvasEditor } from './components/CanvasEditor';
import { Sidebar, Conversation } from './components/Sidebar';
import { ChatStream } from './components/ChatStream';
import { DesignConfig, GenerationStatus, GenerationOptions, GenerationProgress, ProjectVersion } from './types';
import { generateCreative, regenerateLayer } from './services/geminiService';
import { Sparkles, MessageSquare, History, ChevronRight, Menu } from 'lucide-react';

const INITIAL_CONFIG: DesignConfig = {
  size: '1080x1350',
  backgroundColor: '#F8FAFC',
  backgroundImage: null,
  overlayOpacity: 0.1,
  overlayColor: '#000000',
  layers: []
};

const getUserId = () => {
  let uid = localStorage.getItem('op7_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('op7_user_id', uid);
  }
  return uid;
};

const App: React.FC = () => {
  const [userId] = useState(getUserId());
  const [view, setView] = useState<'chat' | 'editor'>('chat');
  const [config, setConfig] = useState<DesignConfig>(INITIAL_CONFIG);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState<GenerationProgress>({ step: 'Aguardando prompt...', percentage: 0 });
  const [lastPrompt, setLastPrompt] = useState('');

  // Sidebar Logic
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // History / Versioning Local
  const [history, setHistory] = useState<DesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  // Error Modal State
  const [errorModalInfo, setErrorModalInfo] = useState<{ title: string, message: string, details?: string } | null>(null);

  // --- CONVERSATIONS API INTEGRATION ---

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      if (!res.ok) return;

      const text = await res.text();
      if (!text) return;

      const json = JSON.parse(text);
      if (json.ok && json.data && json.data.length > 0) {
        setConversations(json.data);
        // Se estiver no primeiro load e não tiver conversa ativa, carregar a última
        if (!activeConversationId && view === 'chat') {
          handleSelectConversation(json.data[0].id, true);
        }
      }
    } catch (err) {
      console.warn("Conversations API não disponível localmente.", err);
    }
  }, [userId, activeConversationId, view]);

  useEffect(() => {
    fetchConversations();
  }, []); // Rodar apenas uma vez no mount

  const handleSelectConversation = async (id: string, isInitialLoad = false) => {
    setActiveConversationId(id);
    if (!isInitialLoad) setView('chat');

    try {
      const res = await fetch(`/api/messages?conversationId=${id}`);
      if (!res.ok) return;

      const text = await res.text();
      if (!text) return;

      const json = JSON.parse(text);
      if (json.ok && json.data) {
        setMessages(json.data);

        // Restore the last config if it exists
        const lastAssistantMsg = [...json.data].reverse().find(m => m.role === 'assistant' && m.content && m.content.config);
        if (lastAssistantMsg) {
          setConfig(lastAssistantMsg.content.config);
          setLastPrompt(json.data.find((m: any) => m.role === 'user')?.content?.text || '');
        }
      }
    } catch (err) {
      console.warn("Messages API não disponível localmente.", err);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setConfig(INITIAL_CONFIG);
    setView('chat');
    setLastPrompt('');
    setMessages([]);
    setVersions([]);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      if (activeConversationId === id) handleNewConversation();
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await fetch(`/api/conversations?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // 🛡️ MECANISMO DE DESTRAVAMENTO (PANIC UNLOCK)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.warn("🔐 [PANIC UNLOCK] Tecla ESC detectada. Resetando estados de trava.");
        setStatus(GenerationStatus.IDLE);
        setProgress({ step: 'Pronto', percentage: 100 });
        setErrorModalInfo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      let currentConvId = activeConversationId;
      if (!currentConvId) {
        try {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, title: prompt.substring(0, 30) + '...' })
          });

          if (res.ok) {
            const text = await res.text();
            if (text) {
              const json = JSON.parse(text);
              if (json.ok) {
                currentConvId = json.data.id;
                setActiveConversationId(currentConvId);
                fetchConversations();
              }
            }
          }
        } catch (convErr) {
          console.warn("Rota /api/conversations indisponível localmente, ignorando...", convErr);
        }
      }

      const tempUserMsg = { id: Date.now().toString(), role: 'user', content: { text: prompt } };
      setMessages(prev => [...prev, tempUserMsg]);

      const result = await generateCreative(prompt, images, { ...options, conversationId: currentConvId, userId }, (p) => setProgress(p));

      // Process result image for frontend performance
      const processedResult = { ...result };
      if (processedResult.data?.image?.kind === 'base64') {
        try {
          const { base64ToBlob } = await import('./lib/image');
          const blob = base64ToBlob(processedResult.data.image.base64, processedResult.data.image.mimeType);
          const objectUrl = URL.createObjectURL(blob);
          processedResult.config.backgroundImage = objectUrl;
          processedResult.imageUrl = objectUrl;
          if (processedResult.config.layers) {
            processedResult.config.layers = processedResult.config.layers.map((l: any) =>
              l.type === 'image' ? { ...l, content: objectUrl } : l
            );
          }
        } catch (err) {
          console.error("Erro ao converter base64 para ObjectURL:", err);
        }
      }

      // Construir mensagem do assistente garantindo o config
      const assistantMsg = {
        id: result.messageId || `asst-${Date.now()}`,
        role: 'assistant',
        content: processedResult.config ? processedResult : { ...processedResult, config: processedResult.config || INITIAL_CONFIG }
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (processedResult.config) {
        // Force refresh key to prevent canvas caching
        const generationId = result.messageId || Date.now().toString();
        processedResult.config.generationId = generationId;

        setConfig(processedResult.config);
        addToHistory(processedResult.config);
        setVersions(prev => [...prev, { id: `v${prev.length + 1}`, timestamp: Date.now(), config: processedResult.config }]);

        setStatus(GenerationStatus.SUCCESS);
        setTimeout(() => setView('editor'), 100);
      } else {
        throw new Error("A IA não retornou uma configuração de design válida.");
      }
    } catch (error: any) {
      console.error("🧨 [GERAÇÃO ABORTADA]", error);
      setStatus(GenerationStatus.ERROR);

      try {
        const parsedBody = JSON.parse(error.message);
        setErrorModalInfo({
          title: `Erro: ${parsedBody.code || 'Desconhecido'}`,
          message: parsedBody.message || "Ocorreu um erro no processamento.",
          details: parsedBody.details || error.message
        });
      } catch (e) {
        setErrorModalInfo({
          title: "Erro na IA",
          message: "A IA não conseguiu processar seu pedido. Tente simplificar o prompt.",
          details: error.message
        });
      }
    } finally {
      // Garantia de status final se não for erro
      setStatus(prev => (prev === GenerationStatus.ERROR ? GenerationStatus.ERROR : GenerationStatus.SUCCESS));
      setProgress({ step: 'Finalizado', percentage: 100 });
      console.log("🔓 [APP] UI reativada.");
    }
  };

  const loadPastGenerationEditor = async (messageId: string) => {
    console.log("📂 Carregando arte passada:", messageId);
    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`);
      const json = await res.json();

      if (json.ok && json.data && json.data.result) {
        const pastConfig = json.data.result.config;
        if (pastConfig) {
          setConfig(pastConfig);
          addToHistory(pastConfig);
          setView('editor');
          console.log("✅ Arte restaurada!");
        } else {
          console.warn("Mensagem encontrada, mas sem 'config'.", json.data);
        }
      }
    } catch (err) {
      console.error("Falha ao restaurar dados passados", err);
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
    <div className="flex w-full h-screen overflow-hidden bg-op7-bg font-sans">

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">

        {/* Dynamic Header */}
        <header className="h-20 bg-white/70 backdrop-blur-2xl border-b border-op7-border px-8 flex items-center justify-between z-40 shrink-0">
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

            <div
              className="flex flex-col items-end cursor-pointer group"
              onClick={() => {
                console.log("🛠️ [DEV] Force Reset Status triggered.");
                setStatus(GenerationStatus.IDLE);
                setProgress({ step: 'Pronto', percentage: 100 });
              }}
              title="Clique para destravar a UI em caso de erro"
            >
              <span className="text-[10px] font-black text-op7-navy uppercase tracking-widest leading-none group-hover:text-op7-blue transition-colors">Motor de IA</span>
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

        <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/50">
          {view === 'chat' ? (
            <div className="flex-1 overflow-y-auto scroll-smooth bg-gradient-to-b from-white to-slate-50/30">
              <div className={`min-h-full w-full flex flex-col items-center p-6 md:p-12 ${messages.length === 0 ? 'justify-center' : 'justify-start'}`}>

                {/* Content Wrapper */}
                <div className="w-full max-w-4xl flex flex-col gap-8">

                  {/* Hero Section (only if no messages) */}
                  {messages.length === 0 && (
                    <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-op7-navy text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-lg shadow-op7-navy/20">
                        <Sparkles size={12} className="text-op7-accent" />
                        Powered by OP7 Intelligence
                      </div>
                      <h2 className="text-5xl md:text-6xl font-black text-op7-navy tracking-tight leading-[0.9]">
                        Transforme ideias em <br />
                        <span className="text-op7-blue bg-clip-text text-transparent bg-gradient-to-r from-op7-blue to-cyan-500">Criativos de Elite</span>
                      </h2>
                      <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                        A primeira IA do mercado focada em design psicológico para tráfego pago. Descreva seu produto e nós fazemos o resto.
                      </p>
                    </div>
                  )}

                  {/* Messages Stream */}
                  {messages.length > 0 && (
                    <div className="flex-1 min-h-[300px] flex flex-col">
                      <ChatStream
                        messages={messages}
                        onOpenEditor={loadPastGenerationEditor}
                        isGenerating={status === GenerationStatus.INTERPRETING || status === GenerationStatus.GENERATING_ART || status === GenerationStatus.GENERATING_TEXT || status === GenerationStatus.ASSEMBLING}
                      />
                    </div>
                  )}

                  {/* Composer Section */}
                  <div className="w-full mt-auto pt-4 pb-20">
                    <Composer
                      onGenerate={handleGenerate}
                      isGenerating={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR}
                      lastPrompt={lastPrompt}
                    />
                  </div>

                  {/* Onboarding Steps (only if no messages) */}
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center gap-8 text-slate-300 pb-12">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold">1</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Prompt</span>
                      </div>
                      <ChevronRight size={14} className="opacity-50" />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold">2</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Geração</span>
                      </div>
                      <ChevronRight size={14} className="opacity-50" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-op7-blue text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-op7-blue/20">3</div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-op7-navy">Editor</span>
                      </div>
                    </div>
                  )}
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

          {errorModalInfo && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                  <h3 className="text-red-600 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {errorModalInfo.title}
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-slate-700 font-medium mb-4">{errorModalInfo.message}</p>

                  {errorModalInfo.details && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">
                        {errorModalInfo.details}
                      </pre>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setErrorModalInfo(null)}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-lg shadow-slate-900/20 text-sm"
                    >
                      Entendi e Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;