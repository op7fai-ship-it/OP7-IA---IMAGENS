import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Sparkles, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { GenerationOptions, BackgroundStyle, ToneType, AdSize } from '../types';

interface ComposerProps {
    onGenerate: (prompt: string, images: string[], options: GenerationOptions) => void;
    isGenerating: boolean;
    lastPrompt?: string;
}

export const Composer: React.FC<ComposerProps> = ({ onGenerate, isGenerating, lastPrompt }) => {
    const [prompt, setPrompt] = useState(lastPrompt || '');
    const [images, setImages] = useState<string[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const [options, setOptions] = useState<GenerationOptions>({
        format: '1080x1350',
        language: 'PT-BR',
        tone: 'Premium',
        backgroundStyle: 'Clean'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!prompt.trim() || isGenerating) return;
        onGenerate(prompt, images, options);
    };

    const suggestions = [
        "Criativo para curso de tráfego pago",
        "Post para clínica de estética premium",
        "Oferta direta para e-commerce de moda",
        "Anúncio estilo lifestyle para mentorias"
    ];

    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-4">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-op7-blue to-op7-accent rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <form
                    onSubmit={handleSubmit}
                    className="relative bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-[28px] overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-op7-blue/20"
                >
                    {/* Image Thumbnails */}
                    {images.length > 0 && (
                        <div className="flex flex-wrap gap-3 p-4 border-b border-op7-border/10 bg-white/30">
                            {images.map((img, i) => (
                                <div key={i} className="relative group/img w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Descreva o criativo que você quer..."
                            className="w-full bg-transparent p-6 text-lg font-medium outline-none resize-none min-h-[120px] placeholder:text-slate-400"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-op7-blue hover:bg-white rounded-full transition-all text-sm font-bold shadow-sm border border-transparent hover:border-op7-blue/10"
                                >
                                    <ImageIcon size={18} />
                                    <span>Anexar Referências</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowOptions(!showOptions)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold shadow-sm border ${showOptions ? 'bg-op7-blue text-white' : 'text-slate-600 hover:text-op7-blue hover:bg-white border-transparent hover:border-op7-blue/10'}`}
                                >
                                    <Sliders size={18} />
                                    <span>Configurações</span>
                                    {showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={!prompt.trim() || isGenerating}
                                className={`flex items-center gap-3 px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-op7-blue/20 active:scale-95 ${!prompt.trim() || isGenerating ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-op7-navy text-white hover:bg-op7-blue'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="animate-pulse" />
                                        <span>Gerar Arte</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Options Panel */}
            {showOptions && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest">Formato</label>
                        <select
                            value={options.format}
                            onChange={(e) => setOptions({ ...options, format: e.target.value as AdSize })}
                            className="w-full bg-white border border-op7-border rounded-xl px-3 py-2 text-sm font-bold text-op7-navy focus:ring-2 focus:ring-op7-blue/20 outline-none"
                        >
                            <option value="1080x1350">Feed (4:5)</option>
                            <option value="1080x1920">Stories (9:16)</option>
                            <option value="1080x1080">Quadrado (1:1)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest">Tom</label>
                        <select
                            value={options.tone}
                            onChange={(e) => setOptions({ ...options, tone: e.target.value as ToneType })}
                            className="w-full bg-white border border-op7-border rounded-xl px-3 py-2 text-sm font-bold text-op7-navy focus:ring-2 focus:ring-op7-blue/20 outline-none"
                        >
                            <option value="Premium">💎 Premium</option>
                            <option value="Direto">🎯 Direto</option>
                            <option value="Urgente">🔥 Urgente</option>
                            <option value="Elegante">✨ Elegante</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest">Estilo do Fundo</label>
                        <select
                            value={options.backgroundStyle}
                            onChange={(e) => setOptions({ ...options, backgroundStyle: e.target.value as BackgroundStyle })}
                            className="w-full bg-white border border-op7-border rounded-xl px-3 py-2 text-sm font-bold text-op7-navy focus:ring-2 focus:ring-op7-blue/20 outline-none"
                        >
                            <option value="Clean">⚪ Clean</option>
                            <option value="Tech">💻 Tech</option>
                            <option value="Clínica">🏥 Clínica</option>
                            <option value="Urbano">🏙️ Urbano</option>
                            <option value="Minimalista">♟️ Minimalista</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest">Idioma</label>
                        <select
                            value={options.language}
                            onChange={(e) => setOptions({ ...options, language: e.target.value })}
                            className="w-full bg-white border border-op7-border rounded-xl px-3 py-2 text-sm font-bold text-op7-navy focus:ring-2 focus:ring-op7-blue/20 outline-none"
                        >
                            <option value="PT-BR">Brasil (PT-BR)</option>
                            <option value="EN">English (EN)</option>
                            <option value="ES">Espanol (ES)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setPrompt(s)}
                        className="px-4 py-1.5 bg-white/40 hover:bg-white/80 border border-white/60 text-slate-600 hover:text-op7-blue rounded-full text-[11px] font-bold transition-all backdrop-blur-sm"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};
