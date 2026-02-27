import React, { useState, useEffect } from 'react';
import { MessageSquare, MoreVertical, Plus, Trash2, Edit2, Check, X, Search, Sparkles } from 'lucide-react';

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface SidebarProps {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    conversations, activeId, onSelect, onNew, onDelete, onRename
}) => {
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClick = () => setMenuOpenId(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleRenameStart = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
        setMenuOpenId(null);
    };

    const handleRenameSave = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            onRename(id, editTitle.trim());
        }
        setEditingId(null);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Deletar esta conversa permanentemente?")) {
            onDelete(id);
        }
        setMenuOpenId(null);
    };

    const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="w-64 h-full bg-[#1A1D21] text-slate-300 flex flex-col border-r border-[#2A2D31] shrink-0">

            {/* Header & New Button */}
            <div className="p-4 border-b border-[#2A2D31]">
                <button
                    onClick={onNew}
                    className="w-full flex items-center justify-center gap-2 bg-op7-blue hover:bg-op7-blue/90 text-white py-2.5 px-4 rounded-xl font-bold transition-all text-sm shadow-lg shadow-op7-blue/20"
                >
                    <Plus size={16} /> Nova Arte
                </button>

                <div className="mt-4 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#2A2D31] text-sm text-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-op7-blue placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#3A3D41] p-2 space-y-1">
                {conversations.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 p-4 mt-4 font-medium uppercase tracking-widest">Nenhum histórico</div>
                ) : filtered.map(conv => (
                    <div
                        key={conv.id}
                        onClick={() => { if (editingId !== conv.id) onSelect(conv.id) }}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${activeId === conv.id ? 'bg-[#2A2D31] text-white' : 'hover:bg-[#2A2D31]/50 text-slate-400'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <MessageSquare size={16} className={activeId === conv.id ? 'text-op7-blue' : 'text-slate-500'} />

                            {editingId === conv.id ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="bg-[#1A1D21] text-white text-sm outline-none w-28 border border-op7-blue/50 rounded px-1"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleRenameSave(e as any, conv.id)}
                                    />
                                    <button onClick={(e) => handleRenameSave(e, conv.id)} className="text-green-500 hover:bg-green-500/10 p-1 block rounded">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-red-500 hover:bg-red-500/10 p-1 block rounded">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <span className="truncate text-sm font-medium">{conv.title}</span>
                            )}
                        </div>

                        {/* Menu */}
                        {editingId !== conv.id && (
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv.id ? null : conv.id) }}
                                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 ${menuOpenId === conv.id ? 'opacity-100 bg-slate-700' : ''}`}
                                >
                                    <MoreVertical size={14} />
                                </button>

                                {menuOpenId === conv.id && (
                                    <div className="absolute right-0 top-6 w-32 bg-[#2A2D31] border border-[#3A3D41] rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                                        <button onClick={(e) => handleRenameStart(e, conv)} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#3A3D41] text-slate-300">
                                            <Edit2 size={12} /> Renomear
                                        </button>
                                        <button onClick={(e) => handleDelete(e, conv.id)} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-500/10 text-red-400">
                                            <Trash2 size={12} /> Deletar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer User */}
            <div className="p-4 border-t border-[#2A2D31] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-op7-navy to-op7-blue flex items-center justify-center text-white shrink-0">
                    <Sparkles size={14} />
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold text-white truncate">Minha Conta</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Sessão Local</div>
                </div>
            </div>

        </div>
    );
};
