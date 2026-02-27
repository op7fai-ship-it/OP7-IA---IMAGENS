import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Composer } from './components/Composer';
import { CanvasEditor } from './components/CanvasEditor';
import { Sidebar, Conversation } from './components/Sidebar';
import { ChatStream } from './components/ChatStream';
import { DesignConfig, GenerationStatus, GenerationOptions, GenerationProgress, ProjectVersion } from './types';
import { generateCreative, regenerateLayer } from './services/geminiService';
import { Sparkles, MessageSquare, ChevronRight } from 'lucide-react';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // History / Versioning
  const [history, setHistory] = useState<DesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [errorModalInfo, setErrorModalInfo] = useState<{ title: string, message: string, details?: string } | null>(null);

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
  };

  const handleGenerate = async (prompt: string, images: string[], options: GenerationOptions) => {
    const isFirstMessage = messages.length === 0;
    setStatus(GenerationStatus.INTERPRETING);
    setLastPrompt(prompt);

    const tempUserMsg = { id: Date.now().toString(), role: 'user', content: { text: prompt } };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let currentConvId = activeConversationId;

      // Se for a primeira mensagem, cria a conversa e gera título
      if (!currentConvId) {
        try {
          // Gerar título simplificado no frontend caso o backend falhe em nos dar o objeto completo rápido
          const autoTitle = prompt.split(' ').slice(0, 5).join(' ').replace(/[#@*]/g, '') + (prompt.split(' ').length > 5 ? '...' : '');

          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, prompt: prompt, title: autoTitle })
          });

          if (res.ok) {
            const json = await res.json();
            if (json.ok) {
              currentConvId = json.data.id;
              setActiveConversationId(currentConvId);
              // Atualização otimista da sidebar
              fetchConversations();
            }
          }
        } catch (convErr) {
          console.warn("Conversations API Falhou:", convErr);
        }
      }

      const result = await generateCreative(prompt, images, { ...options, conversationId: currentConvId, userId }, (p) => setProgress(p));

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
          console.error("Erro base64:", err);
        }
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
        addToHistory(processedResult.config);
        setVersions(prev => [...prev, { id: `v${prev.length + 1}`, timestamp: Date.now(), config: processedResult.config }]);
        setStatus(GenerationStatus.SUCCESS);
        setTimeout(() => setView('editor'), 800);
      }
    } catch (error: any) {
      console.error("ERRO GERAÇÃO:", error);
      setStatus(GenerationStatus.ERROR);
      setErrorModalInfo({ title: "Erro na IA", message: "Não foi possível gerar no momento.", details: error.message });
    }
  };

  const addToHistory = useCallback((newConfig: DesignConfig) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newConfig]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleRegenerate = async (target: 'all' | 'text' | 'art' | 'layout') => {
    if (target === 'all') {
      handleGenerate(lastPrompt, [], { palette: config.palette, format: config.size });
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
    } catch (err) {
      setStatus(GenerationStatus.SUCCESS);
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white/95 backdrop-blur-3xl font-sans">

      {/* Sidebar - Fixed Left */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/20">

        {/* Tiny Header */}
        <header className="h-14 border-b border-op7-border/40 px-6 flex items-center justify-between bg-white/40 shrink-0">
          <h1 className="text-sm font-black text-op7-navy uppercase tracking-tighter">
            OP7 <span className="text-op7-blue">IA</span> Designer
          </h1>
          {view === 'editor' && (
            <button onClick={() => setView('chat')} className="text-[10px] font-bold text-op7-blue px-3 py-1 hover:bg-op7-blue/5 rounded-full transition-all">
              ← Refinar com Prompt
            </button>
          )}
        </header>

        {/* View Switcher Container */}
        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          {view === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              {/* Message List Area - The only scrollable part */}
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

              {/* Composer - Fixed Bottom */}
              <div className="w-full shrink-0 border-t border-op7-border/50 bg-white/60 backdrop-blur-xl pt-6 pb-4">
                <Composer
                  onGenerate={handleGenerate}
                  isGenerating={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR}
                  lastPrompt={lastPrompt}
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

      {/* Error Modal */}
      {errorModalInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-op7-navy/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white border-b-4 border-b-red-500">
            <h3 className="text-xl font-black text-op7-navy mb-2">{errorModalInfo.title}</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">{errorModalInfo.message}</p>
            <button onClick={() => setErrorModalInfo(null)} className="w-full bg-op7-navy text-white py-3 rounded-2xl font-bold shadow-lg">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;