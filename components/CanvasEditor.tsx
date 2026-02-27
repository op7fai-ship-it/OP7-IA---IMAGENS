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

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-100">
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
                {status !== GenerationStatus.SUCCESS && status !== GenerationStatus.IDLE && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-md space-y-3 z-50">
                        <div className="flex items-center justify-between text-[10px] font-black text-op7-navy uppercase tracking-widest">
                            <span>{progress.step}</span>
                            <span>{progress.percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/50 backdrop-blur-md rounded-full overflow-hidden border border-white">
                            <div
                                className="h-full bg-gradient-to-r from-op7-blue to-op7-accent transition-all duration-500"
                                style={{ width: `${progress.percentage}%` }}
                            />
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
                    className="relative bg-white shadow-[0_60px_100px_-20px_rgba(0,0,0,0.2)] transition-all duration-500 rounded-sm overflow-hidden select-none"
                    style={{
                        width: '100%',
                        maxWidth: `${Math.min(height, 800) * aspectRatio}px`,
                        aspectRatio: `${aspectRatio}`
                    }}
                    onMouseDown={() => setSelectedLayerId(null)}
                >
                    <div
                        ref={canvasRef}
                        className="w-full h-full relative overflow-hidden"
                    >
                        {/* Background */}
                        <div className="absolute inset-0 bg-white">
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
                        {snapLines.x !== null && <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-op7-blue z-[100]" />}
                        {snapLines.y !== null && <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-op7-blue z-[100]" />}

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
                                        visibility: layer.visible ? 'visible' : 'hidden'
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
                    <button className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-op7-blue border-b-2 border-op7-blue flex items-center justify-center gap-2">
                        <Settings2 size={14} /> Propriedades
                    </button>
                    <button className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2">
                        <Layers size={14} /> Camadas
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-8">
                    {!selectedLayer ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 text-center">
                            <MousePointer2 size={40} className="opacity-20" />
                            <p className="text-sm font-medium">Selecione um elemento para editar suas propriedades</p>
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
