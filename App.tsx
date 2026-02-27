import React, { useState, useCallback, useRef, useEffect } from "react";
import { Composer } from "./components/Composer";
import { CanvasEditor } from "./components/CanvasEditor";
import { Sidebar, Conversation } from "./components/Sidebar";
import { ChatStream } from "./components/ChatStream";
import {
  DesignConfig,
  GenerationStatus,
  GenerationOptions,
  GenerationProgress,
  ProjectVersion,
} from "./types";
import { generateCreative, regenerateLayer } from "./services/geminiService";
import { Sparkles, MessageSquare, ChevronRight } from "lucide-react";

const INITIAL_CONFIG: DesignConfig = {
  size: "1080x1350",
  backgroundColor: "#F8FAFC",
  backgroundImage: null,
  overlayOpacity: 0.1,
  overlayColor: "#000000",
  layers: [],
};

const getUserId = () => {
  let uid = localStorage.getItem("op7_user_id");
  if (!uid) {
    uid = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("op7_user_id", uid);
  }
  return uid;
};

const App: React.FC = () => {
  const [userId] = useState(getUserId());
  const [view, setView] = useState<"chat" | "editor">("chat");
  const [config, setConfig] = useState<DesignConfig>(INITIAL_CONFIG);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState<GenerationProgress>({
    step: "Aguardando prompt...",
    percentage: 0,
  });
  const [lastPrompt, setLastPrompt] = useState("");

  // Sidebar Logic
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<any[]>([]);

  // History / Versioning
  const [history, setHistory] = useState<DesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [errorModalInfo, setErrorModalInfo] = useState<{
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  // Persistence for references
  const [references, setReferences] = useState<string[]>([]);

  // REHYDRATION (F5) & Initial Load
  const fetchConversations = useCallback(
    async (rehydrateId?: string | null) => {
      try {
        const res = await fetch(`/api/conversations?userId=${userId}`);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Erro HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.ok && json.data) {
          setConversations(json.data);
          const targetId =
            rehydrateId || localStorage.getItem("op7_active_conv");
          if (targetId && json.data.some((c: any) => c.id === targetId)) {
            handleSelectConversation(targetId);
          }
        }
      } catch (err: any) {
        console.warn("Conversations API Fail:", err);
        setErrorModalInfo({
          title: "Erro de Conexão",
          message: "Não foi possível carregar suas conversas.",
          details: err.message,
        });
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    localStorage.setItem("op7_active_conv", id);
    setView("chat");
    try {
      const res = await fetch(
        `/api/messages?conversationId=${id}&userId=${userId}`,
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const json = await res.json();
      if (json.ok && json.data) {
        setMessages(json.data);
        const lastAssistantMsg = [...json.data]
          .reverse()
          .find((m) => m.role === "assistant" && m.content && m.content.config);
        if (lastAssistantMsg) {
          setConfig(lastAssistantMsg.content.config);
          setLastPrompt(
            json.data.find((m: any) => m.role === "user")?.content?.text || "",
          );
        }
        const lastUserMsgWithRefs = [...json.data]
          .reverse()
          .find((m) => m.role === "user" && m.content?.references);
        if (lastUserMsgWithRefs) {
          setReferences(lastUserMsgWithRefs.content.references || []);
        } else {
          setReferences([]);
        }
      }
    } catch (err: any) {
      console.warn("Messages API Fail:", err);
      setErrorModalInfo({
        title: "Erro de Sincronização",
        message: "Não foi possível carregar o histórico.",
        details: err.message,
      });
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    localStorage.removeItem("op7_active_conv");
    setConfig(INITIAL_CONFIG);
    setView("chat");
    setLastPrompt("");
    setMessages([]);
    setVersions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setReferences([]);
  };

  // PANIC UNLOCK & GLOBAL ESC
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStatus(GenerationStatus.IDLE);
        setErrorModalInfo(null);
      }
    };
    window.addEventListener("keydown", handleGlobalEsc);
    return () => window.removeEventListener("keydown", handleGlobalEsc);
  }, [view]);

  const handleGenerate = async (
    prompt_text: string,
    images_ref: string[],
    options_req: GenerationOptions,
  ) => {
    // SECURITY: Panic Unlock Backup
    const panicTimer = setTimeout(() => {
      if (
        status !== GenerationStatus.IDLE &&
        status !== GenerationStatus.SUCCESS &&
        status !== GenerationStatus.ERROR
      ) {
        console.warn(
          "⚠️ PANIC UNLOCK: Geração demorou demais, destravando UI...",
        );
        setStatus(GenerationStatus.IDLE);
      }
    }, 55000);

    setStatus(GenerationStatus.INTERPRETING);
    setLastPrompt(prompt_text);
    setReferences(images_ref);

    // 1. Instantly Update UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: { text: prompt_text, references: images_ref },
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let currentConvId = activeConversationId;

      // 2. Ensure Conversation Exists
      if (!currentConvId) {
        try {
          const autoTitle =
            prompt_text.split(" ").slice(0, 5).join(" ").replace(/[#@*]/g, "") +
            (prompt_text.split(" ").length > 5 ? "..." : "");
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              prompt: prompt_text,
              title: autoTitle,
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error("Erro do Servidor: " + text);
          }
          const json = await res.json();
          if (json.ok) {
            currentConvId = json.data.id;
            setActiveConversationId(currentConvId);
            localStorage.setItem("op7_active_conv", currentConvId);
            fetchConversations(currentConvId); // Refresh sidebar immediately
          }
        } catch (convErr) {
          console.warn("Conversations API Falhou:", convErr);
        }
      }

      // 3. Save USER message to DB BEFORE calling AI (Persistence guarantee)
      if (currentConvId) {
        try {
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: currentConvId,
              user_id: userId,
              role: "user",
              content: { text: prompt_text, references: images_ref },
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error("Erro do Servidor: " + text);
          }
        } catch (dbSaveErr) {
          console.warn("Falha ao salvar msg do usuario:", dbSaveErr);
        }
      }
      // 4. CALL AI
      const result = await generateCreative(
        prompt_text,
        images_ref,
        { ...options_req, conversationId: currentConvId, userId },
        (p) => setProgress(p),
      );

      // 5. PROCESS AI RESPONSE
      const processedResult = { ...result };
      const apiImage = (processedResult as any).image;

      if (apiImage?.kind === "base64") {
        try {
          const { base64ToBlob } = await import("./lib/image");
          const blob = base64ToBlob(apiImage.base64, apiImage.mimeType);
          const objectUrl = URL.createObjectURL(blob);
          if (processedResult.config) {
            processedResult.config.backgroundImage = objectUrl;
            if (processedResult.config.layers) {
              processedResult.config.layers = processedResult.config.layers.map(
                (l: any) =>
                  l.type === "image" ? { ...l, content: objectUrl } : l,
              );
            }
          }
          processedResult.imageUrl = objectUrl;
        } catch (err) {
          console.error("Erro base64 processing:", err);
        }
      }

      // Update UI with real AI message
      const assistantMsg = {
        id: result.messageId || `asst-${Date.now()}`,
        role: "assistant",
        content: processedResult.config
          ? processedResult
          : {
              ...processedResult,
              config: processedResult.config || INITIAL_CONFIG,
            },
      };
      setMessages((prev) => [
        ...prev.filter((m) => !m.id.toString().startsWith("temp-")),
        assistantMsg,
      ]);

      if (processedResult.config) {
        const generationId = result.messageId || Date.now().toString();
        processedResult.config.generationId = generationId;
        setConfig(processedResult.config);
        setHistory((prev) => [
          ...prev.slice(0, historyIndex + 1),
          processedResult.config,
        ]);
        setHistoryIndex((prev) => prev + 1);
        setStatus(GenerationStatus.SUCCESS);
        setTimeout(() => setView("editor"), 800);
      }
    } catch (error: any) {
      console.error("ERRO GERAÇÃO:", error);
      console.error("Erro detalhado da invocação:", error);
      setStatus(GenerationStatus.ERROR);
      setErrorModalInfo({
        title: "Erro na Geração",
        message: "A IA encontrou um problema ao processar seu pedido.",
        details: error.message,
      });
    } finally {
      clearTimeout(panicTimer);
    }
  };

  const addToHistory = useCallback(
    (newConfig: DesignConfig) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newConfig]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const handleRegenerate = async (
    target: "all" | "text" | "art" | "layout",
  ) => {
    if (target === "all") {
      handleGenerate(lastPrompt, references, {
        format: config.size,
        palette: config.palette,
      } as any);
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
    <div className="flex w-full h-screen overflow-hidden bg-white/95 backdrop-blur-3xl font-sans relative">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={async (id) => {
          try {
            const res = await fetch(
              `/api/conversations?id=${id}&userId=${userId}`,
              { method: "DELETE" },
            );
            if (!res.ok) throw new Error("Falha ao excluir");
            fetchConversations();
          } catch (err: any) {
            setErrorModalInfo({
              title: "Erro ao Excluir",
              message: "Não foi possível apagar a conversa.",
              details: err.message,
            });
          }
        }}
        onRename={async (id, title) => {
          try {
            const res = await fetch(`/api/conversations?id=${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, userId }),
            });
            if (!res.ok) throw new Error("Falha ao renomear");
            fetchConversations();
          } catch (err: any) {
            setErrorModalInfo({
              title: "Erro ao Renomear",
              message: "Não foi possível salvar o novo nome.",
              details: err.message,
            });
          }
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/20">
        {/* Modern Unified Header */}
        <header className="h-14 border-b border-op7-border/40 px-6 flex items-center justify-between bg-white/40 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-black text-op7-navy uppercase tracking-tighter">
              OP7 <span className="text-op7-blue">IA</span> Designer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {view === "editor" && (
              <button
                onClick={() => setView("chat")}
                className="text-[10px] font-black uppercase tracking-widest text-op7-blue bg-op7-blue/5 px-4 py-2 rounded-full hover:bg-op7-blue hover:text-white transition-all shadow-sm"
              >
                ← Voltar ao Chat
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          {view === "chat" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                    <div className="w-16 h-16 bg-op7-navy rounded-[22px] flex items-center justify-center text-white mb-6 shadow-2xl shadow-op7-navy/20">
                      <Sparkles size={32} />
                    </div>
                    <h2 className="text-4xl font-black text-op7-navy tracking-tight mb-3">
                      O que vamos criar hoje?
                    </h2>
                    <p className="text-slate-400 text-sm max-w-sm">
                      Descreva seu produto ou serviço e transforme seu branding
                      em uma máquina de vendas.
                    </p>
                  </div>
                ) : (
                  <ChatStream
                    messages={messages}
                    onOpenEditor={(id) => {
                      const msg = messages.find((m) => m.id === id);
                      if (msg?.content?.config) {
                        setConfig(msg.content.config);
                        setView("editor");
                      }
                    }}
                    isGenerating={
                      status !== GenerationStatus.IDLE &&
                      status !== GenerationStatus.SUCCESS &&
                      status !== GenerationStatus.ERROR
                    }
                  />
                )}
              </div>

              <div className="w-full shrink-0 border-t border-op7-border/50 bg-white/60 backdrop-blur-xl pt-6 pb-4">
                <Composer
                  onGenerate={handleGenerate}
                  isGenerating={
                    status !== GenerationStatus.IDLE &&
                    status !== GenerationStatus.SUCCESS &&
                    status !== GenerationStatus.ERROR
                  }
                  lastPrompt={lastPrompt}
                  initialImages={references}
                  onImagesChange={(imgs) => setReferences(imgs)}
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
                onUndo={() =>
                  historyIndex > 0 && setConfig(history[historyIndex - 1])
                }
                onRedo={() =>
                  historyIndex < history.length - 1 &&
                  setConfig(history[historyIndex + 1])
                }
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            </div>
          )}
        </main>
      </div>

      {/* Overlays */}
      {errorModalInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-op7-navy/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white border-b-4 border-b-red-500">
            <h3 className="text-xl font-black text-op7-navy mb-2">
              {errorModalInfo.title}
            </h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              {errorModalInfo.message}
            </p>
            {errorModalInfo.details && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-mono text-slate-400 break-all overflow-auto max-h-32">
                {errorModalInfo.details}
              </div>
            )}
            <button
              onClick={() => setErrorModalInfo(null)}
              className="w-full bg-op7-navy text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
