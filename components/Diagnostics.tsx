import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Database, Zap, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface HealthData {
    ok: boolean;
    envConfigured: boolean;
    geminiConfigured: boolean;
    dbConnected: boolean;
    timestamp: string;
}

export const Diagnostics: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            if (data.ok) {
                setHealth(data);
            } else {
                setError(data.error?.message || 'Erro desconhecido no health check');
            }
        } catch (err) {
            setError('Falha crítica ao contactar API /api/health');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            checkHealth();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <Activity className="text-op7-blue" size={20} />
                        <h2 className="text-lg font-black text-op7-navy uppercase tracking-tighter">Diagnóstico de Sistema</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <RefreshCw className="animate-spin text-op7-blue" size={32} />
                            <p className="text-sm font-bold text-slate-400 animate-pulse">Varrendo serviços...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-black text-red-900 uppercase tracking-widest">Erro Detectado</h4>
                                <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    ) : health && (
                        <div className="grid gap-4">
                            <DiagnosticItem
                                icon={<ShieldCheck size={18} />}
                                label="Variáveis de Ambiente"
                                status={health.envConfigured}
                                title="Checks SUPABASE_URL & ANON_KEY"
                            />
                            <DiagnosticItem
                                icon={<Zap size={18} />}
                                label="IA Gemini (API Key)"
                                status={health.geminiConfigured}
                                title="Check GEMINI_API_KEY no backend"
                            />
                            <DiagnosticItem
                                icon={<Database size={18} />}
                                label="Banco de Dados (Supabase)"
                                status={health.dbConnected}
                                title="Teste de conexão real via query"
                            />

                            <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Última Verificação</p>
                                <p className="text-xs font-mono text-slate-600 font-medium">
                                    {new Date(health.timestamp).toLocaleString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={checkHealth}
                            className="flex-1 bg-op7-navy text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-op7-blue transition-all active:scale-95"
                        >
                            <RefreshCw size={16} />
                            Verificar Novamente
                        </button>
                    </div>
                </div>

                <div className="px-8 py-4 bg-yellow-50/50 border-t border-yellow-100/50 flex items-center gap-3">
                    <ShieldCheck className="text-yellow-600" size={14} />
                    <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-wider">
                        Modo Estável Ativado (Garantindo que nada trave)
                    </p>
                </div>
            </div>
        </div>
    );
};

const DiagnosticItem: React.FC<{ icon: any; label: string; status: boolean; title: string }> = ({ icon, label, status, title }) => (
    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${status ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {icon}
            </div>
            <div>
                <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">{label}</h4>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{title}</p>
            </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-sm ${status ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {status ? 'OK' : 'ERRO'}
        </div>
    </div>
);
