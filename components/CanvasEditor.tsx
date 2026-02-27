import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DesignConfig, Layer, Position, GenerationStatus, GenerationProgress } from '../types';
import { Move, Maximize2, RotateCw, Type, Image as ImageIcon, MousePointer2, Layers, Settings2, Undo2, Redo2, ChevronLeft, Download, RefreshCw, Send, Sparkles, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [snapLines, setSnapLines] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
    const [sidebarTab, setSidebarTab] = useState<'props' | 'layers'>('props');
    const [showTooltip, setShowTooltip] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const lastClickTime = useRef<number>(0);

    // 🛡️ PANIC UNLOCK LOCAL
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedLayerId(null);
                setDraggingId(null);
                setResizingId(null);
                setEditingId(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const width = 1080;
    const height = config.size === '1080x1350' ? 1350 : config.size === '1080x1920' ? 1920 : 1080;
    const aspectRatio = width / height;

    const handleLayerAction = useCallback((id: string, action: 'visible' | 'locked') => {
        setConfig(prev => ({
            ...prev,
            layers: prev.layers.map(l => {
                if (l.id !== id) return l;
                if (action === 'visible') return { ...l, visible: l.visible === false };
                return { ...l, locked: !l.locked };
            })
        }));
    }, [setConfig]);

    const handleMouseDown = (layer: Layer, e: React.MouseEvent) => {
        if (layer?.locked || editingId === layer?.id) return;

        const now = Date.now();
        const isDoubleClick = now - lastClickTime.current < 300;
        lastClickTime.current = now;

        if (isDoubleClick && (layer.type === 'text' || layer.type === 'button')) {
            setEditingId(layer.id);
            setSelectedLayerId(layer.id);
            setDraggingId(null);
            return;
        }

        e.stopPropagation();
        setSelectedLayerId(layer.id);
        setDraggingId(layer.id);
        setEditingId(null);

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
        setEditingId(null);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current || (!draggingId && !resizingId)) return;
            const rect = canvasRef.current.getBoundingClientRect();

            if (draggingId) {
                let x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
                let y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;

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
                const rect = canvasRef.current.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
                const dist = Math.abs(mouseX - layer.position.x) * 2;
                setConfig(prev => ({
                    ...prev,
                    layers: prev.layers.map(l => l.id === resizingId ? {
                        ...l,
                        size: { ...(l?.size || {}), width: Math.max(5, dist) }
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

    // 🎯 AUTO-SELEÇÃO PÓS-GERAÇÃO
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
        <div className="flex h-full w-full overflow-hidden bg-[#F1F5F9] relative select-none">

            {/* Tool Sidebar */}
            <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-30 shadow-sm">
                <button className="p-3 text-op7-blue bg-op7-blue/10 rounded-xl transition-all shadow-sm"><MousePointer2 size={22} /></button>
                <button className="p-3 text-slate-400 hover:text-op7-navy hover:bg-slate-50 rounded-xl transition-all"><Type size={22} /></button>
                <button className="p-3 text-slate-400 hover:text-op7-navy hover:bg-slate-50 rounded-xl transition-all"><ImageIcon size={22} /></button>
                <div className="flex-1" />
                <button onClick={onUndo} disabled={!canUndo} className={`p-3 rounded-xl transition-all ${canUndo ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}><Undo2 size={18} /></button>
                <button onClick={onRedo} disabled={!canRedo} className={`p-3 rounded-xl transition-all ${canRedo ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}><Redo2 size={18} /></button>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-hidden bg-slate-50">

                {/* Status Badges */}
                {showTooltip && (
                    <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-op7-navy text-white px-6 py-3 rounded-2xl shadow-premium z-[110] animate-in slide-in-from-top-4 flex items-center gap-3 border border-white/10">
                        <Sparkles className="text-op7-accent" size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Editor Ativo • Dê duplo-clique no texto para editar</p>
                    </div>
                )}

                {/* Main Toolbar */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-2xl border border-white p-2 rounded-2xl shadow-premium z-30">
                    <button onClick={() => onRegenerate('all')} className="flex items-center gap-2 px-4 py-2 hover:bg-op7-blue/5 text-op7-navy font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-transparent hover:border-op7-blue/10">
                        <RefreshCw size={14} className="text-op7-blue" />
                        Regenerar Tudo
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                    <button onClick={() => onRegenerate('text')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <Type size={14} /> Texto
                    </button>
                    <button onClick={() => onRegenerate('art')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <ImageIcon size={14} /> Arte
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                    <button className="bg-op7-navy text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-op7-navy/20 hover:bg-op7-blue transition-all active:scale-95">
                        Download
                    </button>
                </div>

                {/* Canvas Area */}
                <div
                    className="relative bg-white shadow-[0_80px_100px_-30px_rgba(0,0,0,0.15)] transition-all duration-500 rounded-lg overflow-hidden border border-white"
                    style={{
                        width: '100%',
                        maxWidth: `${Math.min(height, 750) * aspectRatio}px`,
                        aspectRatio: `${aspectRatio}`,
                        pointerEvents: (status === GenerationStatus.IDLE || status === GenerationStatus.SUCCESS || status === GenerationStatus.ERROR) ? 'auto' : 'none'
                    }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) { setSelectedLayerId(null); setEditingId(null); } }}
                >
                    <div ref={canvasRef} className="w-full h-full relative overflow-hidden bg-slate-50">

                        {/* Background Layer */}
                        <div className={`absolute inset-0 transition-all ${selectedLayerId === 'background' ? 'ring-4 ring-inset ring-op7-blue/30' : ''}`}
                            onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId('background'); setEditingId(null); }}>
                            {config.backgroundImage ? (
                                <img src={config.backgroundImage} className="w-full h-full object-cover transition-opacity duration-700" crossOrigin="anonymous" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-white flex items-center justify-center">
                                    <Sparkles className="text-slate-200" size={80} />
                                </div>
                            )}
                            <div className="absolute inset-0" style={{ backgroundColor: config.overlayColor, opacity: config.overlayOpacity }} />
                        </div>

                        {/* Guides */}
                        {snapLines.x !== null && <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-op7-blue/50 z-[100] pointer-events-none" />}
                        {snapLines.y !== null && <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-op7-blue/50 z-[100] pointer-events-none" />}

                        {/* Creative Layers */}
                        {config?.layers?.map(layer => {
                            const isSelected = selectedLayerId === layer?.id;
                            const isEditing = editingId === layer?.id;
                            const isVisible = layer?.visible !== false;

                            return (
                                <div
                                    key={layer?.id}
                                    className={`absolute z-10 ${isSelected ? 'z-20' : ''} ${!isVisible ? 'opacity-0 pointer-events-none' : ''}`}
                                    style={{
                                        top: `${layer?.position?.y ?? 0}%`,
                                        left: `${layer?.position?.x ?? 0}%`,
                                        width: `${layer?.size?.width ?? 0}%`,
                                        transform: 'translate(-50%, -50%)',
                                        cursor: layer?.locked ? 'not-allowed' : (isEditing ? 'text' : 'move'),
                                        pointerEvents: layer?.locked ? 'none' : 'auto'
                                    }}
                                    onMouseDown={(e) => handleMouseDown(layer, e)}
                                >
                                    <div className={`relative w-full group transition-all ${isSelected ? (isEditing ? '' : 'ring-2 ring-op7-blue shadow-2xl') : 'hover:ring-1 hover:ring-op7-blue/20'}`}>

                                        {layer?.type === 'text' && (
                                            <div
                                                contentEditable={isEditing}
                                                suppressContentEditableWarning
                                                onBlur={(e) => {
                                                    setEditingId(null);
                                                    const newContent = e.currentTarget.innerText;
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        layers: prev.layers.map(l => l.id === layer?.id ? { ...l, content: newContent } : l)
                                                    }));
                                                }}
                                                className={`w-full outline-none break-words select-text ${isEditing ? 'cursor-text bg-white/10 ring-1 ring-op7-blue/50 p-1' : ''}`}
                                                style={{
                                                    color: layer?.style?.color || '#000000',
                                                    fontSize: `${layer?.style?.fontSize || 1}rem`,
                                                    fontWeight: layer?.style?.fontWeight || '400',
                                                    fontFamily: layer?.style?.fontFamily || 'sans-serif',
                                                    textAlign: (layer?.style?.textAlign || 'center') as any,
                                                    backgroundColor: layer?.style?.backgroundColor || 'transparent',
                                                    padding: `${layer?.style?.padding || 0}px`,
                                                    borderRadius: `${layer?.style?.borderRadius || 0}px`,
                                                    textTransform: (layer?.style?.textTransform || 'none') as any,
                                                    lineHeight: layer?.style?.lineHeight || '1.1',
                                                    letterSpacing: layer?.style?.letterSpacing || 'normal',
                                                    transform: `rotate(${layer?.style?.rotate || 0}deg)`
                                                }}
                                            >
                                                {layer?.content || ''}
                                            </div>
                                        )}

                                        {layer?.type === 'button' && (
                                            <div
                                                className="w-full text-center flex items-center justify-center tracking-widest shadow-lg overflow-hidden transition-all duration-300"
                                                style={{
                                                    color: layer?.style?.color || '#FFFFFF',
                                                    backgroundColor: layer?.style?.backgroundColor || '#000000',
                                                    fontSize: `${layer?.style?.fontSize || 1}rem`,
                                                    fontWeight: layer?.style?.fontWeight || '900',
                                                    fontFamily: layer?.style?.fontFamily || 'Montserrat',
                                                    padding: `${layer?.style?.padding || 14}px`,
                                                    borderRadius: `${layer?.style?.borderRadius || 12}px`,
                                                    letterSpacing: layer?.style?.letterSpacing || '0.05em',
                                                    textTransform: (layer?.style?.textTransform || 'uppercase') as any,
                                                    transform: `rotate(${layer?.style?.rotate || 0}deg)`,
                                                    border: 'none',
                                                    cursor: isEditing ? 'text' : 'pointer'
                                                }}
                                            >
                                                <span
                                                    contentEditable={isEditing}
                                                    suppressContentEditableWarning
                                                    className="outline-none"
                                                    onBlur={(e) => {
                                                        setEditingId(null);
                                                        const newContent = e.currentTarget.innerText;
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            layers: prev.layers.map(l => l.id === layer?.id ? { ...l, content: newContent } : l)
                                                        }));
                                                    }}
                                                >
                                                    {layer?.content || ''}
                                                </span>
                                            </div>
                                        )}

                                        {layer?.type === 'image' && (
                                            <img src={layer?.content || ''} className="w-full h-auto pointer-events-none transition-transform duration-500" />
                                        )}

                                        {/* Resize & UI Indicators */}
                                        {isSelected && !isEditing && (
                                            <>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-op7-navy text-white text-[9px] px-3 py-1.5 rounded-lg font-black whitespace-nowrap shadow-xl border border-white/10 flex items-center gap-2">
                                                    {layer?.locked ? <Lock size={10} /> : <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                                                    {layer?.name?.toUpperCase() || 'CAMADA'}
                                                </div>
                                                <div
                                                    className="absolute -bottom-3 -right-3 w-7 h-7 bg-white border-2 border-op7-blue rounded-lg flex items-center justify-center cursor-nwse-resize shadow-premium z-50 hover:scale-110 transition-transform"
                                                    onMouseDown={(e) => handleResizeStart(layer?.id, e)}
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

                {/* Progress Overlay */}
                {isGenerating && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px] z-[120] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-premium border border-slate-100 flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-100 rounded-full" />
                                <div className="absolute inset-0 border-4 border-op7-blue rounded-full border-t-transparent animate-spin" />
                                <Sparkles className="absolute inset-0 m-auto text-op7-blue animate-pulse" size={24} />
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-black text-op7-navy uppercase tracking-tighter mb-1">{progress.step}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Otimizando Design • {progress.percentage}%</p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-op7-blue transition-all duration-700" style={{ width: `${progress.percentage}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Inspector */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-30 shadow-sm">
                <div className="flex border-b border-slate-100 p-2">
                    <button onClick={() => setSidebarTab('props')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all ${sidebarTab === 'props' ? 'bg-op7-blue/5 text-op7-blue' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Settings2 size={14} /> Propriedades
                    </button>
                    <button onClick={() => setSidebarTab('layers')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all ${sidebarTab === 'layers' ? 'bg-op7-blue/5 text-op7-blue' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Layers size={14} /> Camadas
                    </button>
                </div>

                <div className="flex-1 overflow-auto px-6 py-8 space-y-8 h-full custom-scrollbar">
                    {sidebarTab === 'layers' ? (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Estrutura Visual</h3>
                            <div className="grid gap-2">
                                {config?.layers?.map(layer => (
                                    <div
                                        key={layer?.id}
                                        onClick={() => setSelectedLayerId(layer?.id)}
                                        className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${selectedLayerId === layer?.id ? 'bg-op7-blue/5 border-op7-blue/20 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${selectedLayerId === layer?.id ? 'bg-op7-blue text-white shadow-lg shadow-op7-blue/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                                {layer?.type === 'text' ? <Type size={16} /> : layer?.type === 'button' ? <Send size={16} /> : <ImageIcon size={16} />}
                                            </div>
                                            <div>
                                                <p className={`text-[11px] font-black uppercase tracking-tight ${selectedLayerId === layer?.id ? 'text-op7-navy' : 'text-slate-600'}`}>{layer?.name || 'Camada S/N'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{layer?.type || 'Elemento'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleLayerAction(layer?.id, 'visible'); }} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-op7-blue">
                                                {layer?.visible !== false ? <Eye size={14} /> : <EyeOff size={14} className="opacity-40" />}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleLayerAction(layer?.id, 'locked'); }} className={`p-2 hover:bg-white rounded-lg transition-colors ${layer?.locked ? 'text-op7-accent' : 'text-slate-400 hover:text-op7-blue'}`}>
                                                {layer?.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : selectedLayerId ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <DiagnosticProps layer={config?.layers?.find(l => l.id === selectedLayerId) || (null as any)} setConfig={setConfig} isBackground={selectedLayerId === 'background'} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 border border-dashed border-slate-200">
                                <MousePointer2 size={32} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-op7-navy uppercase tracking-widest mb-1">Nada Selecionado</h4>
                                <p className="text-[10px] text-slate-400 font-medium px-4">Selecione um elemento no canvas para ajustar suas propriedades.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DiagnosticProps: React.FC<{ layer: Layer; setConfig: any; isBackground?: boolean }> = ({ layer, setConfig, isBackground }) => {
    if (isBackground) return <div className="text-xs text-slate-400 font-bold uppercase tracking-widest py-10 text-center border border-dashed rounded-3xl">Propriedades de Fundo Global</div>;
    if (!layer) return null;
    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Transformar</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Posição X</label>
                        <input type="number" value={Math.round(layer?.position?.x || 0)} onChange={(e) => setConfig((p: any) => ({ ...p, layers: p?.layers?.map((l: any) => l.id === layer?.id ? { ...l, position: { ...(l?.position || {}), x: parseInt(e.target.value) } } : l) }))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Posição Y</label>
                        <input type="number" value={Math.round(layer?.position?.y || 0)} onChange={(e) => setConfig((p: any) => ({ ...p, layers: p?.layers?.map((l: any) => l.id === layer?.id ? { ...l, position: { ...(l?.position || {}), y: parseInt(e.target.value) } } : l) }))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black" />
                    </div>
                </div>
            </div>

            {(layer?.type === 'text' || layer?.type === 'button') && (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-op7-navy uppercase tracking-widest opacity-40">Estilo de Texto</h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Conteúdo</label>
                                <textarea
                                    value={layer?.content || ''}
                                    onChange={(e) => setConfig((p: any) => ({ ...p, layers: p.layers.map((l: any) => l.id === layer?.id ? { ...l, content: e.target.value } : l) }))}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium min-h-[100px] resize-none focus:bg-white focus:ring-2 focus:ring-op7-blue/10 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Tipografia</label>
                                <select
                                    value={layer?.style?.fontFamily || 'Montserrat'}
                                    onChange={(e) => setConfig((p: any) => ({ ...p, layers: p?.layers?.map((l: any) => l.id === layer?.id ? { ...l, style: { ...(l?.style || {}), fontFamily: e.target.value } } : l) }))}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black"
                                >
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Outfit">Outfit</option>
                                    <option value="Bebas Neue">Bebas Neue</option>
                                    <option value="Inter">Inter</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
