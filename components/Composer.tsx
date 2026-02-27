import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Sparkles, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { GenerationOptions, BackgroundStyle, ToneType, AdSize, ColorPalette } from '../types';

interface ComposerProps {
    onGenerate: (prompt: string, images: string[], options: GenerationOptions) => void;
    isGenerating: boolean;
    lastPrompt?: string;
    initialImages?: string[];
    onImagesChange?: (images: string[]) => void;
}

export const Composer: React.FC<ComposerProps> = ({ onGenerate, isGenerating, lastPrompt, initialImages = [], onImagesChange }) => {
    const [prompt, setPrompt] = useState(lastPrompt || '');
    const [images, setImages] = useState<string[]>(initialImages);
    const [showOptions, setShowOptions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImages(initialImages);
    }, [initialImages]);

    useEffect(() => {
        if (!isGenerating && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isGenerating]);

    const updateImages = (newImages: string[]) => {
        setImages(newImages);
        if (onImagesChange) onImagesChange(newImages);
    };

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
        useReferences: true,
        engine: 'nano'
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const maxFiles = 5;
        const availableSlots = maxFiles - images.length;
        if (availableSlots <= 0) return;

        const filesToProcess = files.slice(0, availableSlots);
        filesToProcess.forEach((file: File) => {
            if (file.size > 10 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                updateImages([...images, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        updateImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!prompt.trim() || isGenerating) return;
        onGenerate(prompt, images, options);
        setPrompt(''); // Limpar após envio
    };

    const suggestions = [
        "Criativo para curso de tráfego pago",
        "Post para clínica de estética premium",
        "Oferta direta para e-commerce de moda"
    ];

    return (
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">

            {showOptions && (
                <div className="mb-4 p-6 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[32px] shadow-premium animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Motor</label>
                            <select value={options.engine} onChange={(e) => setOptions({ ...options, engine: e.target.value as any })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold ring-op7-blue/10 focus:ring-2 outline-none">
                                <option value="nano">🍌 Nano (Fast)</option>
                                <option value="imagen">🔥 Imagen (Top)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Formato</label>
                            <select value={options.format} onChange={(e) => setOptions({ ...options, format: e.target.value as any })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="1080x1350">Feed (4:5)</option>
                                <option value="1080x1920">Stories (9:16)</option>
                                <option value="1080x1080">Quadrado (1:1)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Tom de Voz</label>
                            <select value={options.tone} onChange={(e) => setOptions({ ...options, tone: e.target.value as any })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="Premium">💎 Premium</option>
                                <option value="Direto">🎯 Direto</option>
                                <option value="Urgente">🔥 Urgente</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Background</label>
                            <select value={options.backgroundStyle} onChange={(e) => setOptions({ ...options, backgroundStyle: e.target.value as any })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="Clean">⚪ Clean</option>
                                <option value="Tech">💻 Tech</option>
                                <option value="Minimalista">♟️ Minimalista</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-op7-blue/20 to-op7-accent/20 rounded-[35px] blur-lg opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                <div className="relative bg-white border border-slate-200 shadow-premium rounded-[32px] overflow-hidden focus-within:border-op7-blue/30 transition-all">

                    {images.length > 0 && (
                        <div className="flex gap-3 p-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto custom-scrollbar">
                            {images.map((img, i) => (
                                <div key={i} className="relative shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm group/img">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Descreva o anúncio perfeito para o seu negócio..."
                            className="w-full bg-transparent p-6 text-base font-medium outline-none resize-none min-h-[100px] placeholder:text-slate-300"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-op7-blue hover:bg-white rounded-2xl transition-all"><ImageIcon size={20} /></button>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
                                <button type="button" onClick={() => setShowOptions(!showOptions)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showOptions ? 'bg-op7-blue text-white shadow-lg shadow-op7-blue/20' : 'text-slate-400 hover:bg-white border border-transparent hover:border-slate-100'}`}><Sliders size={14} /> Opções</button>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!prompt.trim() || isGenerating}
                                className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 ${!prompt.trim() || isGenerating ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-op7-navy text-white hover:bg-op7-blue shadow-op7-navy/20'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        <span>Gerar Criativo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {suggestions.map((s, i) => (
                    <button key={i} onClick={() => setPrompt(s)} className="px-4 py-1.5 bg-white border border-slate-100 text-slate-400 hover:text-op7-blue hover:border-op7-blue rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95">
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};
