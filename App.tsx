import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Composer } from './components/Composer';
import { CanvasEditor } from './components/CanvasEditor';
import { Sidebar, Conversation } from './components/Sidebar';
import { ChatStream } from './components/ChatStream';
import { Diagnostics } from './components/Diagnostics';
import { DesignConfig, GenerationStatus, GenerationOptions, GenerationProgress, ProjectVersion } from './types';
import { generateCreative, regenerateLayer } from './services/geminiService';
import { Sparkles, MessageSquare, ChevronRight, Activity, ShieldCheck } from 'lucide-react';

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
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(true);

  // Sidebar Logic
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // History / Versioning
  const [history, setHistory] = useState<DesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [errorModalInfo, setErrorModalInfo] = useState<{ title: string, message: string, details?: string } | null>(null);

  // Persistence for references
  const [references, setReferences] = useState<string[]>([]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && json.data) {
        setConversations(json.data);
      }
    } catch (err) {
      console.warn("Conversations API não disponível.", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setView('chat');
    try {
      const res = await fetch(`/api/messages?conversationId=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && json.data) {
        setMessages(json.data);
        const lastAssistantMsg = [...json.data].reverse().find(m => m.role === 'assistant' && m.content && m.content.config);
        if (lastAssistantMsg) {
          setConfig(lastAssistantMsg.content.config);
          setLastPrompt(json.data.find((m: any) => m.role === 'user')?.content?.text || '');
        }
        const lastUserMsgWithRefs = [...json.data].reverse().find(m => m.role === 'user' && m.content?.references);
        if (lastUserMsgWithRefs) {
          setReferences(lastUserMsgWithRefs.content.references || []);
        } else {
          setReferences([]);
        }
      }
    } catch (err) {
      console.warn("Messages API não disponível.", err);
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
    setReferences([]);
  };

  // PANIC UNLOCK: Reset status if stuck
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStatus(GenerationStatus.IDLE);
        setErrorModalInfo(null);
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, []);

  const handleGenerate = async (prompt_text: string, images_ref: string[], options_req: GenerationOptions) => {
    // SECURITY: Panic Unlock Backup
    const panicTimer = setTimeout(() => {
      if (status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR) {
        console.warn("⚠️ PANIC UNLOCK: Geração demorou demais, destravando UI...");
        setStatus(GenerationStatus.IDLE);
      }
    }, 45000); // 45s safety

    setStatus(GenerationStatus.INTERPRETING);
    setLastPrompt(prompt_text);
    setReferences(images_ref);

    const tempUserMsg = { id: Date.now().toString(), role: 'user', content: { text: prompt_text, references: images_ref } };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let currentConvId = activeConversationId;
      if (!currentConvId) {
        try {
          const autoTitle = prompt_text.split(' ').slice(0, 5).join(' ').replace(/[#@*]/g, '') + (prompt_text.split(' ').length > 5 ? '...' : '');
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, prompt: prompt_text, title: autoTitle })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.ok) {
              currentConvId = json.data.id;
              setActiveConversationId(currentConvId);
              fetchConversations();
            }
          }
        } catch (convErr) { console.warn("Conversations API Falhou:", convErr); }
      }

      const result = await generateCreative(prompt_text, images_ref, { ...options_req, conversationId: currentConvId, userId }, (p) => setProgress(p));

      if (currentConvId) {
        try {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: currentConvId,
              user_id: userId,
              role: 'user',
              content: { text: prompt_text, references: images_ref }
            })
          });
        } catch (dbSaveErr) { console.warn("Falha ao salvar msg:", dbSaveErr); }
      }

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
        } catch (err) { console.error("Erro base64:", err); }
      }

      const assistantMsg = {
        id: result.messageId || `asst-${Date.now()}`,
        role: 'assistant',
        content: processedResult.config ? processedResult : { ...processedResult, config: processedResult.config || INITIAL_CONFIG }
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (processedResult.config) {
        const generationId = result.messageId || Date.now().toString();
        processedResult.config.generationId = generationId;
        setConfig(processedResult.config);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), processedResult.config]);
        setHistoryIndex(prev => prev + 1);
        setVersions(prev => [...prev, { id: `v${prev.length + 1}`, timestamp: Date.now(), config: processedResult.config }]);
        setStatus(GenerationStatus.SUCCESS);
        setTimeout(() => setView('editor'), 800);
      }
    } catch (error: any) {
      console.error("ERRO GERAÇÃO:", error);
      setStatus(GenerationStatus.ERROR);
      setErrorModalInfo({ title: "Erro na IA", message: "Não foi possível gerar no momento.", details: error.message });
    } finally {
      clearTimeout(panicTimer);
    }
  };

  const addToHistory = useCallback((newConfig: DesignConfig) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newConfig]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleRegenerate = async (target: 'all' | 'text' | 'art' | 'layout') => {
    if (target === 'all') {
      handleGenerate(lastPrompt, references, { format: config.size, palette: config.palette } as any);
      return;
    }
    try {
      setStatus(GenerationStatus.GENERATING_TEXT);
      const newConfig = await regenerateLayer(config, target);
      if (newConfig) {
        setConfig(newConfig);
        addToHistory(newConfig);
      }
      setStatus(GenerationStatus.SUCCESS);
    } catch (err) { setStatus(GenerationStatus.SUCCESS); }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white/95 backdrop-blur-3xl font-sans relative">

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={(id) => fetch(`/api/conversations?id=${id}`, { method: 'DELETE' }).then(() => fetchConversations())}
        onRename={(id, title) => fetch(`/api/conversations?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        }).then(() => fetchConversations())}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/20">

        {/* Modern Unified Header */}
        <header className="h-14 border-b border-op7-border/40 px-6 flex items-center justify-between bg-white/40 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-black text-op7-navy uppercase tracking-tighter">
              OP7 <span className="text-op7-blue">IA</span> Designer
            </h1>
            {isSafeMode && (
              <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full text-yellow-600">
                <ShieldCheck size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest">Safe Mode ON</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all group"
              title="Status do Sistema"
            >
              <Activity size={14} className="text-op7-blue group-hover:animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saúde</span>
            </button>

            {view === 'editor' && (
              <button onClick={() => setView('chat')} className="text-[10px] font-black uppercase tracking-widest text-op7-blue bg-op7-blue/5 px-4 py-2 rounded-full hover:bg-op7-blue hover:text-white transition-all shadow-sm">
                ← Voltar ao Chat
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          {view === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              <div className="flex-1 overflow-hidden flex flex-col h-full">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                    <div className="w-16 h-16 bg-op7-navy rounded-[22px] flex items-center justify-center text-white mb-6 shadow-2xl shadow-op7-navy/20">
                      <Sparkles size={32} />
                    </div>
                    <h2 className="text-4xl font-black text-op7-navy tracking-tight mb-3">O que vamos criar hoje?</h2>
                    <p className="text-slate-400 text-sm max-w-sm">Descreva seu produto ou serviço e transforme seu branding em uma máquina de vendas.</p>
                  </div>
                ) : (
                  <ChatStream
                    messages={messages}
                    onOpenEditor={(id) => {
                      const msg = messages.find(m => m.id === id);
                      if (msg?.content?.config) {
                        setConfig(msg.content.config);
                        setView('editor');
                      }
                    }}
                    isGenerating={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR}
                  />
                )}
              </div>

              <div className="w-full shrink-0 border-t border-op7-border/50 bg-white/60 backdrop-blur-xl pt-6 pb-4">
                <Composer
                  onGenerate={handleGenerate}
                  isGenerating={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR}
                  lastPrompt={lastPrompt}
                  initialImages={references}
                  onImagesChange={setReferences}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 h-full overflow-hidden">
              <CanvasEditor
                config={config}
                setConfig={setConfig}
                status={status}
                progress={progress}
                onRegenerate={handleRegenerate}
                onUndo={() => historyIndex > 0 && setConfig(history[historyIndex - 1])}
                onRedo={() => historyIndex < history.length - 1 && setConfig(history[historyIndex + 1])}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            </div>
          )}
        </main>
      </div>

      {/* Overlays */}
      <Diagnostics isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />

      {errorModalInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-op7-navy/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white border-b-4 border-b-red-500">
            <h3 className="text-xl font-black text-op7-navy mb-2">{errorModalInfo.title}</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">{errorModalInfo.message}</p>
            {errorModalInfo.details && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-mono text-slate-400 break-all overflow-auto max-h-32">
                {errorModalInfo.details}
              </div>
            )}
            <button onClick={() => setErrorModalInfo(null)} className="w-full bg-op7-navy text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;