import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Sparkles, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { GenerationOptions, BackgroundStyle, ToneType, AdSize, ColorPalette } from '../types';

interface ComposerProps {
    onGenerate: (prompt: string, images: string[], options: GenerationOptions) => void;
    isGenerating: boolean;
    lastPrompt?: string;
}

export const Composer: React.FC<ComposerProps> = ({ onGenerate, isGenerating, lastPrompt }) => {
    const [prompt, setPrompt] = useState(lastPrompt || '');
    const [images, setImages] = useState<string[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const defaultPalette: ColorPalette = {
        primary: '#002B5B',
        secondary: '#1A73E8',
        background: '#F8FAFC',
        text: '#002B5B',
        accent: '#FF7D3C',
        gradientEnabled: false,
        gradientStart: '#002B5B',
        gradientEnd: '#1A73E8',
    };

    const [options, setOptions] = useState<GenerationOptions>({
        format: '1080x1350',
        language: 'PT-BR',
        tone: 'Premium',
        backgroundStyle: 'Clean',
        palette: defaultPalette,
        useReferences: true
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const maxFiles = 5;
        const availableSlots = maxFiles - images.length;

        if (availableSlots <= 0) {
            alert(`Você só pode anexar até ${maxFiles} imagens.`);
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);

        filesToProcess.forEach((file: File) => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`A imagem ${file.name} excede o limite de 5MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
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
                    {/* Image Thumbnails & References UI */}
                    {images.length > 0 && (
                        <div className="flex flex-col gap-3 p-4 border-b border-op7-border/10 bg-white/30">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-op7-navy uppercase tracking-widest bg-op7-blue/10 px-2 py-1 rounded-md">
                                    Referências Anexadas: {images.length}/5
                                </span>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${options.useReferences ? 'text-op7-blue' : 'text-slate-400'}`}>
                                        {options.useReferences ? 'Usando Referências' : 'Ignorar Referências'}
                                    </span>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={options.useReferences}
                                            onChange={(e) => setOptions({ ...options, useReferences: e.target.checked })}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-op7-blue"></div>
                                    </div>
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-3">
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
                                {images.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-op7-blue hover:border-op7-blue transition-colors bg-white/50"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                )}
                            </div>
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
                <div className="flex flex-col gap-4 p-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                    <div className="border-t border-op7-border/20 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest">Paleta de Cores</label>
                            <button
                                type="button"
                                onClick={() => setOptions({ ...options, palette: defaultPalette })}
                                className="text-[10px] font-bold text-op7-blue hover:underline"
                            >
                                Reset OP7
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {(['primary', 'secondary', 'background', 'text', 'accent'] as const).map(colorKey => (
                                <div key={colorKey} className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{colorKey}</span>
                                    <div className="flex items-center overflow-hidden rounded-lg border border-op7-border bg-white">
                                        <input
                                            type="color"
                                            value={options.palette?.[colorKey] || '#000000'}
                                            onChange={e => setOptions({
                                                ...options,
                                                palette: { ...options.palette!, [colorKey]: e.target.value }
                                            })}
                                            className="w-6 h-6 p-0 border-0 rounded-none cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={options.palette?.[colorKey] || '#000000'}
                                            onChange={e => setOptions({
                                                ...options,
                                                palette: { ...options.palette!, [colorKey]: e.target.value }
                                            })}
                                            className="w-full text-xs font-medium px-2 py-1 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
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
