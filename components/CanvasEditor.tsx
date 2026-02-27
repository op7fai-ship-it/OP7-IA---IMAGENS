import React, { useState, useRef, useEffect } from 'react';
import { DesignConfig, Layer, Position, GenerationStatus, GenerationProgress } from '../types';
import { Move, Maximize2, RotateCw, Type, Image as ImageIcon, MousePointer2, Layers, Settings2, Undo2, Redo2, ChevronLeft, Download, RefreshCw, Send, Sparkles } from 'lucide-react';

interface CanvasEditorProps {
    config: DesignConfig;
    setConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
    status: GenerationStatus;
    progress: GenerationProgress;
    onRegenerate: (type: 'all' | 'text' | 'art' | 'layout') => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
    config, setConfig, status, progress, onRegenerate, onUndo, onRedo, canUndo, canRedo
}) => {
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [snapLines, setSnapLines] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
    const [sidebarTab, setSidebarTab] = useState<'props' | 'layers'>('props');
    const [showTooltip, setShowTooltip] = useState(false);

    // 🛡️ PANIC UNLOCK LOCAL
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedLayerId(null);
                setDraggingId(null);
                setResizingId(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const toggleLayerVisibility = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfig(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, visible: l.visible === false } : l)
        }));
    };

    const toggleLayerLock = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfig(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
        }));
    };

    const canvasRef = useRef<HTMLDivElement>(null);

    const width = 1080;
    const height = config.size === '1080x1350' ? 1350 : config.size === '1080x1920' ? 1920 : 1080;
    const aspectRatio = width / height;

    const handleMouseDown = (layer: Layer, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).isContentEditable) return;
        e.stopPropagation();
        setSelectedLayerId(layer.id);
        setDraggingId(layer.id);

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
            const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
            setDragOffset({
                x: mouseX - layer.position.x,
                y: mouseY - layer.position.y
            });
        }
    };

    const handleResizeStart = (layerId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingId(layerId);
        setSelectedLayerId(layerId);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current || (!draggingId && !resizingId)) return;
            const rect = canvasRef.current.getBoundingClientRect();

            if (draggingId) {
                let x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
                let y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;

                // Snapping
                const snap = 2;
                let sx: number | null = null;
                let sy: number | null = null;
                if (Math.abs(x - 50) < snap) { x = 50; sx = 50; }
                if (Math.abs(y - 50) < snap) { y = 50; sy = 50; }
                setSnapLines({ x: sx, y: sy });

                setConfig(prev => ({
                    ...prev,
                    layers: prev.layers.map(l => l.id === draggingId ? { ...l, position: { x, y } } : l)
                }));
            }

            if (resizingId) {
                const layer = config.layers.find(l => l.id === resizingId);
                if (!layer) return;

                const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
                const dist = Math.abs(mouseX - layer.position.x) * 2;

                setConfig(prev => ({
                    ...prev,
                    layers: prev.layers.map(l => l.id === resizingId ? {
                        ...l,
                        size: { ...l.size, width: Math.max(5, dist) }
                    } : l)
                }));
            }
        };

        const handleMouseUp = () => {
            setDraggingId(null);
            setResizingId(null);
            setSnapLines({ x: null, y: null });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingId, resizingId, dragOffset, config.layers, setConfig]);

    const selectedLayer = config.layers.find(l => l.id === selectedLayerId);

    // 🎯 AUTO-SELEÇÃO: Focar na imagem gerada assim que terminar
    useEffect(() => {
        if (status === GenerationStatus.SUCCESS && !selectedLayerId) {
            const artLayer = config.layers.find(l => l.id === 'art');
            if (artLayer) {
                setSelectedLayerId(artLayer.id);
                setShowTooltip(true);
                setTimeout(() => setShowTooltip(false), 5000);
            }
        }
    }, [status, config.layers]);

    const isGenerating = status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR;

    return (
        <div
            className="flex h-full w-full overflow-hidden bg-slate-100 relative"
            style={{ pointerEvents: isGenerating ? 'none' : 'auto' }}
        >
            {/* Tooltip Alert */}
            {showTooltip && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-op7-navy text-white px-6 py-3 rounded-2xl shadow-2xl z-[110] animate-in slide-in-from-top-4 duration-500 flex items-center gap-3">
                    <Sparkles className="text-op7-accent" size={18} />
                    <p className="text-xs font-bold">Arraste para mover • Use cantos para redimensionar • Duplo clique para editar texto</p>
                </div>
            )}

            {/* Tool Sidebar */}
            <div className="w-16 bg-white border-r border-op7-border flex flex-col items-center py-6 gap-6 z-30">
                <button className="p-3 text-op7-blue bg-op7-blue/10 rounded-xl"><MousePointer2 size={24} /></button>
                <button className="p-3 text-slate-400 hover:text-op7-navy"><Type size={24} /></button>
                <button className="p-3 text-slate-400 hover:text-op7-navy"><ImageIcon size={24} /></button>
                <div className="flex-1" />
                <button onClick={onUndo} disabled={!canUndo} className={`p-3 ${canUndo ? 'text-slate-600 hover:text-op7-navy' : 'text-slate-200'}`}><Undo2 size={20} /></button>
                <button onClick={onRedo} disabled={!canRedo} className={`p-3 ${canRedo ? 'text-slate-600 hover:text-op7-navy' : 'text-slate-200'}`}><Redo2 size={20} /></button>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-auto">
                {/* Progress Bar (when generating) */}
                {status !== GenerationStatus.SUCCESS && status !== GenerationStatus.IDLE && status !== GenerationStatus.ERROR && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center pointer-events-none">
                        <div className="w-full max-w-md space-y-4 p-8 bg-white/90 rounded-3xl shadow-2xl border border-white pointer-events-auto">
                            <div className="flex items-center justify-between text-[10px] font-black text-op7-navy uppercase tracking-widest">
                                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-op7-blue rounded-full animate-ping" /> {progress.step}</span>
                                <span>{progress.percentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-op7-blue to-op7-accent transition-all duration-500"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-white p-1.5 rounded-full shadow-premium z-30">
                    <button onClick={() => onRegenerate('all')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-all">
                        <RefreshCw size={14} className="text-op7-blue" />
                        Regenerar Tudo
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                    <button onClick={() => onRegenerate('text')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-all">
                        <Type size={14} className="text-op7-blue" />
                        Só Texto
                    </button>
                    <button onClick={() => onRegenerate('art')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-all">
                        <ImageIcon size={14} className="text-op7-blue" />
                        Só Arte
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                    <button className="bg-op7-navy text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg shadow-op7-navy/20 hover:bg-op7-blue transition-all">
                        Exportar
                    </button>
                </div>

                {/* Canvas Container */}
                <div
                    className="relative bg-white shadow-[0_60px_100px_-20px_rgba(0,0,0,0.2)] transition-all duration-500 rounded-sm overflow-hidden"
                    style={{
                        width: '100%',
                        maxWidth: `${Math.min(height, 800) * aspectRatio}px!important`,
                        aspectRatio: `${aspectRatio}`,
                        pointerEvents: (status === GenerationStatus.SUCCESS || status === GenerationStatus.IDLE) ? 'auto' : 'none'
                    }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setSelectedLayerId(null);
                    }}
                >
                    <div
                        ref={canvasRef}
                        className="w-full h-full relative overflow-hidden"
                    >
                        {/* Background */}
                        <div className={`absolute inset-0 bg-white ${selectedLayerId === 'background' ? 'ring-4 ring-inset ring-op7-blue/50' : ''}`}
                            onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId('background'); }}>
                            {config.backgroundImage ? (
                                <img src={config.backgroundImage} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
                                    <Sparkles className="text-slate-300" size={100} />
                                </div>
                            )}
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: config.overlayColor, opacity: config.overlayOpacity }}
                            />
                        </div>

                        {/* Smart Guides */}
                        {snapLines.x !== null && <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-op7-blue z-[100] pointer-events-none" />}
                        {snapLines.y !== null && <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-op7-blue z-[100] pointer-events-none" />}

                        {/* Layers */}
                        {config.layers.map(layer => {
                            const isSelected = selectedLayerId === layer.id;
                            const isDragging = draggingId === layer.id;

                            return (
                                <div
                                    key={layer.id}
                                    className={`absolute z-10 transition-shadow ${isSelected ? 'z-20' : ''}`}
                                    style={{
                                        top: `${layer.position.y}%`,
                                        left: `${layer.position.x}%`,
                                        width: `${layer.size.width}%`,
                                        transform: 'translate(-50%, -50%)',
                                        cursor: isSelected ? 'default' : 'move',
                                        visibility: (layer.visible !== false) ? 'visible' : 'hidden',
                                        pointerEvents: layer.locked ? 'none' : 'auto'
                                    }}
                                    onMouseDown={(e) => handleMouseDown(layer, e)}
                                >
                                    <div className={`relative w-full ${isSelected ? 'ring-2 ring-op7-blue shadow-2xl' : 'hover:ring-1 hover:ring-op7-blue/30'}`}>
                                        {layer.type === 'text' && (
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => {
                                                    const newContent = e.currentTarget.innerText;
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        layers: prev.layers.map(l => l.id === layer.id ? { ...l, content: newContent } : l)
                                                    }));
                                                }}
                                                className="w-full outline-none break-words"
                                                style={{
                                                    color: layer.style.color,
                                                    fontSize: `${layer.style.fontSize}rem`,
                                                    fontWeight: layer.style.fontWeight,
                                                    fontFamily: layer.style.fontFamily,
                                                    textAlign: layer.style.textAlign,
                                                    backgroundColor: layer.style.backgroundColor,
                                                    padding: `${layer.style.padding}px`,
                                                    borderRadius: `${layer.style.borderRadius}px`,
                                                    textTransform: layer.style.textTransform,
                                                    lineHeight: layer.style.lineHeight,
                                                    letterSpacing: layer.style.letterSpacing,
                                                    transform: `rotate(${layer.style.rotate || 0}deg)`
                                                }}
                                            >
                                                {layer.content}
                                            </div>
                                        )}

                                        {layer.type === 'button' && (
                                            <div
                                                className="w-full text-center flex items-center justify-center font-black uppercase tracking-widest shadow-xl"
                                                style={{
                                                    color: layer.style.color,
                                                    backgroundColor: layer.style.backgroundColor,
                                                    fontSize: `${layer.style.fontSize}rem`,
                                                    padding: `${layer.style.padding}px`,
                                                    borderRadius: `${layer.style.borderRadius}px`,
                                                    transform: `rotate(${layer.style.rotate || 0}deg)`
                                                }}
                                            >
                                                <span
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const newContent = e.currentTarget.innerText;
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            layers: prev.layers.map(l => l.id === layer.id ? { ...l, content: newContent } : l)
                                                        }));
                                                    }}
                                                    className="outline-none"
                                                >
                                                    {layer.content}
                                                </span>
                                            </div>
                                        )}

                                        {layer.type === 'image' && (
                                            <img src={layer.content} className="w-full h-auto pointer-events-none" />
                                        )}

                                        {/* Controls */}
                                        {isSelected && (
                                            <>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-op7-navy text-white text-[10px] px-3 py-1.5 rounded-full font-black whitespace-nowrap shadow-xl">
                                                    {layer.name.toUpperCase()}
                                                </div>
                                                <div
                                                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-op7-blue rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg z-50 hover:scale-125 transition-transform"
                                                    onMouseDown={(e) => handleResizeStart(layer.id, e)}
                                                >
                                                    <Maximize2 size={12} className="text-op7-blue" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Sidebar (Layers & Properties) */}
            <div className="w-72 bg-white border-l border-op7-border flex flex-col z-30">
                <div className="flex border-b border-op7-border">
                    <button
                        onClick={() => setSidebarTab('props')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${sidebarTab === 'props' ? 'text-op7-blue border-b-2 border-op7-blue' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Settings2 size={14} /> Propriedades
                    </button>
                    <button
                        onClick={() => setSidebarTab('layers')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${sidebarTab === 'layers' ? 'text-op7-blue border-b-2 border-op7-blue' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Layers size={14} /> Camadas
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-8">
                    {sidebarTab === 'layers' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-[0.2em]">Lista de Camadas</h3>
                            </div>
                            <div className="space-y-2">
                                {config.layers.map(layer => (
                                    <div
                                        key={layer.id}
                                        onClick={() => setSelectedLayerId(layer.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedLayerId === layer.id ? 'bg-op7-blue/5 border-op7-blue/30' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                                {layer.type === 'text' ? <Type size={14} /> : layer.type === 'button' ? <Send size={14} /> : <ImageIcon size={14} />}
                                            </div>
                                            <span className={`text-xs font-bold ${selectedLayerId === layer.id ? 'text-op7-blue' : 'text-op7-navy'}`}>{layer.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => toggleLayerVisibility(layer.id, e)}
                                                className={`p-1.5 transition-colors ${layer.visible !== false ? 'text-slate-400 hover:text-op7-blue' : 'text-slate-200'}`}
                                            >
                                                {layer.visible !== false ? <ImageIcon size={14} /> : <ImageIcon size={14} className="opacity-40" />}
                                            </button>
                                            <button
                                                onClick={(e) => toggleLayerLock(layer.id, e)}
                                                className={`p-1.5 transition-colors ${layer.locked ? 'text-op7-accent' : 'text-slate-400 hover:text-op7-blue'}`}
                                            >
                                                {layer.locked ? <Maximize2 size={14} /> : <Move size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div
                                    onClick={() => setSelectedLayerId('background')}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedLayerId === 'background' ? 'bg-op7-blue/5 border-op7-blue/30' : 'bg-slate-50 border-slate-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                            <Sparkles size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${selectedLayerId === 'background' ? 'text-op7-blue' : 'text-op7-navy'}`}>Plano de Fundo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : !selectedLayer && selectedLayerId !== 'background' ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-2 mb-8 text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <MousePointer2 size={24} className="opacity-50" />
                                <p className="text-xs font-semibold">Clique num elemento para editá-lo</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-[0.2em]">Paleta Global</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const defaultPalette = {
                                                primary: '#002B5B',
                                                secondary: '#1A73E8',
                                                background: '#F8FAFC',
                                                text: '#002B5B',
                                                accent: '#FF7D3C',
                                                gradientEnabled: false,
                                                gradientStart: '#002B5B',
                                                gradientEnd: '#1A73E8',
                                            };
                                            setConfig(prev => ({ ...prev, palette: defaultPalette }));
                                        }}
                                        className="text-[10px] font-bold text-op7-blue hover:underline"
                                    >
                                        Reset OP7
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(['primary', 'secondary', 'background', 'text', 'accent'] as const).map(colorKey => (
                                        <div key={colorKey} className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase flex-1">{colorKey}</span>
                                            <div className="flex items-center overflow-hidden rounded-lg border border-op7-border bg-white w-32">
                                                <input
                                                    type="color"
                                                    value={config.palette?.[colorKey] || '#000000'}
                                                    onChange={e => setConfig(prev => ({
                                                        ...prev,
                                                        palette: {
                                                            ...(prev.palette || {
                                                                primary: '#002B5B', secondary: '#1A73E8', background: '#F8FAFC', text: '#002B5B', accent: '#FF7D3C', gradientEnabled: false, gradientStart: '#002B5B', gradientEnd: '#1A73E8'
                                                            }),
                                                            [colorKey]: e.target.value
                                                        }
                                                    }))}
                                                    className="w-6 h-6 p-0 border-0 rounded-none cursor-pointer shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={config.palette?.[colorKey] || '#000000'}
                                                    onChange={e => setConfig(prev => ({
                                                        ...prev,
                                                        palette: {
                                                            ...(prev.palette || {
                                                                primary: '#002B5B', secondary: '#1A73E8', background: '#F8FAFC', text: '#002B5B', accent: '#FF7D3C', gradientEnabled: false, gradientStart: '#002B5B', gradientEnd: '#1A73E8'
                                                            }),
                                                            [colorKey]: e.target.value
                                                        }
                                                    }))}
                                                    className="w-full text-xs font-medium px-2 py-1 outline-none uppercase"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (!config.palette) return;
                                    setConfig(prev => ({
                                        ...prev,
                                        backgroundColor: config.palette!.background,
                                        layers: prev.layers.map(l => {
                                            if (l.id === 'headline') return { ...l, style: { ...l.style, color: config.palette!.text } };
                                            if (l.id === 'subheadline') return { ...l, style: { ...l.style, color: config.palette!.secondary } };
                                            if (l.type === 'button') return { ...l, style: { ...l.style, backgroundColor: config.palette!.accent, color: '#FFFFFF' } };
                                            return l;
                                        })
                                    }));
                                }}
                                className="w-full py-3 bg-op7-blue/10 text-op7-blue font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-op7-blue hover:text-white transition-all"
                            >
                                Aplicar no Criativo Inteiro
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Common Properties */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-[0.2em]">Transformação</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Posição X</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedLayer.position.x)}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setConfig(prev => ({
                                                    ...prev,
                                                    layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, position: { ...l.position, x: val } } : l)
                                                }));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Posição Y</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedLayer.position.y)}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setConfig(prev => ({
                                                    ...prev,
                                                    layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, position: { ...l.position, y: val } } : l)
                                                }));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {selectedLayer.type === 'text' || selectedLayer.type === 'button' ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-[0.2em]">Conteúdo</label>
                                        <textarea
                                            value={selectedLayer.content}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setConfig(prev => ({
                                                    ...prev,
                                                    layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, content: val } : l)
                                                }));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium min-h-[80px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-op7-navy uppercase tracking-[0.2em]">Tipografia</label>
                                        <select
                                            value={selectedLayer.style.fontFamily}
                                            onChange={(e) => {
                                                const val = e.target.value as any;
                                                setConfig(prev => ({
                                                    ...prev,
                                                    layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, style: { ...l.style, fontFamily: val } } : l)
                                                }));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                                        >
                                            <option value="Montserrat">Montserrat</option>
                                            <option value="Bebas Neue">Bebas Neue</option>
                                            <option value="Outfit">Outfit</option>
                                            <option value="Inter">Inter</option>
                                            <option value="Playfair Display">Playfair Display</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tamanho</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={selectedLayer.style.fontSize}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, style: { ...l.style, fontSize: val } } : l)
                                                    }));
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Cor</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={selectedLayer.style.color}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, style: { ...l.style, color: val } } : l)
                                                        }));
                                                    }}
                                                    className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden"
                                                />
                                                <input
                                                    type="text"
                                                    value={selectedLayer.style.color}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            layers: prev.layers.map(l => l.id === selectedLayer.id ? { ...l, style: { ...l.style, color: val } } : l)
                                                        }));
                                                    }}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
