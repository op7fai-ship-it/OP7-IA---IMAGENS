import React, { useState, useEffect } from 'react';
import { Terminal, Database, ShieldCheck, Cpu, ChevronRight, Activity, RefreshCw, AlertCircle, CheckCircle2, Copy, Trash2, Code2 } from 'lucide-react';

interface DebugPageProps {
    lastPayload: any;
    lastResponse: any;
    onClose: () => void;
}

export const DebugPage: React.FC<DebugPageProps> = ({ lastPayload, lastResponse, onClose }) => {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'status' | 'payload' | 'response'>('status');

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            setHealth(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const copyToClipboard = (data: any) => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    };

    return (
        <div className="fixed inset-0 z-[500] bg-[#0F172A] text-slate-300 font-mono text-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Header / Terminal Bar */}
            <div className="h-14 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="w-px h-6 bg-slate-700 mx-2" />
                    <div className="flex items-center gap-2 text-slate-400">
                        <Terminal size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Debug Console v2.0</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded-lg text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                    Fechar Console [ESC]
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Fixed Sidebar */}
                <div className="w-64 border-r border-slate-800 p-6 flex flex-col gap-2 shrink-0 bg-[#0F172A]/80">
                    <DebugTab
                        id="status"
                        active={activeTab === 'status'}
                        icon={<Activity size={16} />}
                        label="Status Global"
                        onClick={() => setActiveTab('status')}
                    />
                    <DebugTab
                        id="payload"
                        active={activeTab === 'payload'}
                        icon={<Cpu size={16} />}
                        label="Último Payload"
                        onClick={() => setActiveTab('payload')}
                    />
                    <DebugTab
                        id="response"
                        active={activeTab === 'response'}
                        icon={<Code2 size={16} />}
                        label="Último Response"
                        onClick={() => setActiveTab('response')}
                    />

                    <div className="mt-10 border-t border-slate-800 pt-6">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Ações Rápidas</p>
                        <button
                            onClick={fetchHealth}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-op7-blue hover:bg-op7-blue/5 rounded-xl transition-all"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Recarregar Status
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto p-10 bg-[#0B1120]">
                    {activeTab === 'status' && (
                        <div className="space-y-10 max-w-4xl">
                            <div>
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <ShieldCheck className="text-green-500" /> Diagnóstico de Infraestrutura
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <StatusCard
                                        icon={<Database className="text-op7-blue" />}
                                        title="Supabase DB Connection"
                                        status={health?.dbConnected}
                                        description="Verifica se as tabelas 'conversations' e 'messages' estão acessíveis."
                                    />
                                    <StatusCard
                                        icon={<Cpu className="text-op7-accent" />}
                                        title="Gemini AI Configuration"
                                        status={health?.geminiConfigured}
                                        description="Valida se a chave GEMINI_API_KEY está injetada no backend (Vercel/Local)."
                                    />
                                    <StatusCard
                                        icon={<Terminal className="text-yellow-500" />}
                                        title="Environment (Global)"
                                        status={health?.envConfigured}
                                        description="Checks básicos para URLs e Anon Keys necessárias."
                                    />
                                    <div className="p-6 bg-slate-900 shadow-xl rounded-3xl border border-slate-800/50 flex flex-col justify-center">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Node Runtime</p>
                                        <p className="text-lg font-black text-white">{health?.node_version || 'Detectando...'}</p>
                                        <p className="text-[10px] font-mono text-slate-500 mt-2 uppercase">Server Time: {health?.timestamp || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 shadow-xl rounded-[32px] border border-slate-800/50">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-yellow-500" /> Instruções de Manutenção
                                </h4>
                                <ul className="space-y-3 text-[11px] leading-relaxed text-slate-400">
                                    <li className="flex gap-2">
                                        <span className="text-op7-blue font-black tracking-widest shrink-0">01</span>
                                        <span>Se o DB estiver em <b>ERRO</b>, verifique as credenciais no <code>.env</code>.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-op7-blue font-black tracking-widest shrink-0">02</span>
                                        <span>Se o Gemini estiver em <b>ERRO</b>, a chave da API pode estar expirada ou não configurada no dashboard da Vercel.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payload' && (
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center justify-between shrink-0">
                                <h3 className="text-xl font-black text-white">JSON Injected to API</h3>
                                <button onClick={() => copyToClipboard(lastPayload)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                                    <Copy size={14} /> Copy JSON
                                </button>
                            </div>
                            <div className="flex-1 bg-black/40 border border-slate-800 rounded-[32px] p-8 overflow-auto custom-scrollbar font-mono text-[12px] leading-relaxed">
                                {lastPayload ? (
                                    <pre className="text-slate-400">{JSON.stringify(lastPayload, null, 2)}</pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                        <Trash2 size={40} className="mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">Nenhuma requisição feita ainda</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'response' && (
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center justify-between shrink-0">
                                <h3 className="text-xl font-black text-white">Parsed Response from Backend</h3>
                                <button onClick={() => copyToClipboard(lastResponse)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                                    <Copy size={14} /> Copy JSON
                                </button>
                            </div>
                            <div className="flex-1 bg-black/40 border border-slate-800 rounded-[32px] p-8 overflow-auto custom-scrollbar font-mono text-[12px] leading-relaxed">
                                {lastResponse ? (
                                    <pre className={lastResponse?.ok === false ? "text-red-400" : "text-green-400"}>
                                        {JSON.stringify(lastResponse, null, 2)}
                                    </pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                        <Trash2 size={40} className="mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">Nenhum retorno recebido ainda</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DebugTab: React.FC<{ id: string; active: boolean; icon: any; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${active ? 'bg-op7-blue text-white border-op7-blue shadow-lg shadow-op7-blue/20' : 'text-slate-500 hover:text-white border-transparent hover:bg-slate-800'}`}
    >
        {icon}
        {label}
    </button>
);

const StatusCard: React.FC<{ icon: any; title: string; status: boolean; description: string }> = ({ icon, title, status, description }) => (
    <div className={`p-6 bg-slate-900 shadow-xl rounded-[32px] border transition-all ${status ? 'border-green-500/20' : 'border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-800 ${status ? 'text-green-500 shadow-lg shadow-green-500/10' : 'text-red-500 shadow-lg shadow-red-500/10'}`}>
                {icon}
            </div>
            {status ? (
                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full flex items-center gap-1.5 border border-green-500/20">
                    <CheckCircle2 size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Ativo</span>
                </div>
            ) : (
                <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full flex items-center gap-1.5 border border-red-500/20">
                    <AlertCircle size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Inativo</span>
                </div>
            )}
        </div>
        <h4 className="text-[13px] font-black text-white uppercase tracking-tight mb-2 leading-none">{title}</h4>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{description}</p>
    </div>
);
