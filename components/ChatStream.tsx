import React, { useRef, useEffect } from 'react';
import { Bot, User, ImageIcon, Palette, Edit } from 'lucide-react';

interface ChatStreamProps {
    messages: any[];
    onOpenEditor: (messageId: string) => void;
    isGenerating?: boolean;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ messages, onOpenEditor, isGenerating }) => {
    const EndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (messages.length > 0 || isGenerating) {
            EndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages.length, isGenerating]);

    return (
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scroll-smooth">
            {/* Center column with max-width */}
            <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-10">
                {messages.length === 0 && !isGenerating && (
                    <div className="h-20" /> // Spacer for empty state
                )}

                {messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {/* Avatar Assistant */}
                            {!isUser && (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-op7-navy to-op7-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-op7-blue/20 mr-3 mt-1">
                                    <Bot size={18} />
                                </div>
                            )}

                            <div className={`max-w-[85%] rounded-[24px] px-6 py-4 ${isUser ? 'bg-op7-blue text-white shadow-xl shadow-op7-blue/20 rounded-tr-sm' : 'bg-white shadow-premium border border-slate-100/80 rounded-tl-sm text-slate-700'}`}>

                                {isUser ? (
                                    <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                                        {msg.content?.text || msg.content}
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {msg.content?.headline && (
                                            <div>
                                                <h4 className="font-black text-op7-navy text-xl leading-tight mb-2 tracking-tight">{msg.content.headline}</h4>
                                                <p className="text-[14px] text-slate-500 leading-relaxed font-medium">{msg.content.description}</p>
                                            </div>
                                        )}

                                        {msg.content?.cta && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-op7-accent" />
                                                CTA: {msg.content.cta}
                                            </div>
                                        )}

                                        {msg.content?.config && (
                                            <div className="mt-4 pt-5 border-t border-slate-50">
                                                <div className="flex flex-wrap gap-2 mb-5">
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 border border-slate-100 px-2 py-1 rounded-md">
                                                        <ImageIcon size={10} /> {msg.content.config.size}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => onOpenEditor(msg.id)}
                                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-op7-navy hover:bg-op7-blue text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-sm"
                                                >
                                                    <Edit size={16} /> Abrir no Editor de Design
                                                </button>

                                                {/* Debug instrumentation */}
                                                <div className="mt-6 flex flex-wrap gap-3 opacity-20 hover:opacity-100 transition-opacity">
                                                    <span className="text-[9px] font-mono text-slate-400">MSG_ID: {msg.id.substring(0, 8)}</span>
                                                    {msg.content?.image && (
                                                        <span className="text-[9px] font-mono text-slate-400 uppercase">IMG: {msg.content.image.kind}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Avatar User */}
                            {isUser && (
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-sm ml-3 border border-slate-200 mt-1">
                                    <User size={18} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {isGenerating && (
                    <div className="flex justify-start w-full animate-in fade-in duration-500">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-op7-navy to-op7-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-op7-blue/20 mr-3 animate-pulse">
                            <Bot size={18} />
                        </div>
                        <div className="bg-white shadow-premium border border-slate-100/50 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-op7-blue/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-op7-blue/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-op7-blue/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                {/* Scroll Anchor */}
                <div ref={EndRef} className="h-4 w-full" />
            </div>
        </div>
    );
};
