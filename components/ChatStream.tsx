import React, { useRef, useEffect } from 'react';
import { Bot, User, ImageIcon, Palette, Edit } from 'lucide-react';

interface ChatStreamProps {
    messages: any[];
    onOpenEditor: (messageId: string) => void;
    isGenerating?: boolean;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ messages, onOpenEditor, isGenerating }) => {
    const EndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        EndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGenerating]);

    return (
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-32">
            {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                    <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
                        {/* Avatar Assistant */}
                        {!isUser && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-op7-navy to-op7-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-op7-blue/20 mr-3">
                                <Bot size={14} />
                            </div>
                        )}

                        <div className={`max-w-[75%] rounded-2xl p-4 ${isUser ? 'bg-op7-blue text-white shadow-xl shadow-op7-blue/20 rounded-tr-sm' : 'bg-white shadow-premium border border-slate-100/50 rounded-tl-sm text-slate-700'}`}>

                            {isUser ? (
                                // USER MESSAGE
                                <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
                                    {msg.content?.text || msg.content}
                                </div>
                            ) : (
                                // ASSISTANT MESSAGE
                                <div className="space-y-4">
                                    {msg.content?.headline && (
                                        <div>
                                            <h4 className="font-black text-op7-navy text-lg leading-tight mb-2">{msg.content.headline}</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{msg.content.description}</p>
                                        </div>
                                    )}

                                    {msg.content?.cta && (
                                        <div className="inline-block px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 mt-2">
                                            CTA: {msg.content.cta}
                                        </div>
                                    )}

                                    {msg.content?.config && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                                                    <ImageIcon size={10} /> {msg.content.config.size}
                                                </span>
                                                {msg.content.config.backgroundColor && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                                                        <Palette size={10} /> Cor de Fundo
                                                        <div className="w-3 h-3 rounded-full border border-black/10 ml-1" style={{ backgroundColor: msg.content.config.backgroundColor }} />
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => onOpenEditor(msg.id)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-op7-navy hover:bg-op7-blue text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl text-sm"
                                            >
                                                <Edit size={16} /> Abrir no Editor VisuaI
                                            </button>

                                            {/* Debug Instrumentation (Subtle) */}
                                            <div className="mt-4 flex flex-wrap gap-2 opacity-30 hover:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-mono text-slate-400">
                                                    ID: {msg.id.substring(0, 6)}
                                                </span>
                                                {msg.content?.image && (
                                                    <span className="text-[8px] font-mono text-slate-400">
                                                        TYPE: {msg.content.image.kind} | {msg.content.image.mimeType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Avatar User */}
                        {isUser && (
                            <div className="w-8 h-8 rounded-full bg-slate-gradient flex items-center justify-center text-slate-400 shrink-0 shadow-sm ml-3 border border-slate-200">
                                <User size={14} />
                            </div>
                        )}
                    </div>
                );
            })}

            {isGenerating && (
                <div className="flex justify-start w-full animate-in fade-in duration-500">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-op7-navy to-op7-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-op7-blue/20 mr-3 animate-pulse">
                        <Bot size={14} />
                    </div>
                    <div className="bg-white shadow-premium border border-slate-100/50 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}

            <div ref={EndRef} />
        </div>
    );
};
