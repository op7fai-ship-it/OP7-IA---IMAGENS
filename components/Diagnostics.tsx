import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Zap, Database, AlertTriangle, RefreshCw, X, CheckCircle2 } from 'lucide-react';

interface HealthData {
    ok: boolean;
    envConfigured: boolean;
    missingEnvs: string[];
    geminiConfigured: boolean;
    dbConnected: boolean;
    timestamp: number;
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
                setError(data.error?.message || 'Erro no health check');
            }
        } catch (err) {
            setError('Falha ao contactar servidor de diagnósticos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) checkHealth();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <Activity className="text-op7-blue" size={20} />
                        <h2 className="text-lg font-black text-op7-navy uppercase tracking-tighter">Diagnóstico do Engenheiro</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <RefreshCw className="animate-spin text-op7-blue" size={32} />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Escaneando Infraestrutura...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-black text-red-900 uppercase">Falha na API</h4>
                                <p className="text-xs text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    ) : health && (
                        <div className="space-y-4">
                            <DiagnosticItem
                                icon={<ShieldCheck size={18} />}
                                label="Variáveis de Ambiente"
                                status={health.envConfigured}
                                detail={health.envConfigured ? "Padrões NEXT_PUBLIC_ configurados" : "ERRO: Faltando " + health.missingEnvs.join(', ')}
                            />
                            <DiagnosticItem
                                icon={<Zap size={18} />}
                                label="IA Gemini (Engine)"
                                status={health.geminiConfigured}
                                detail={health.geminiConfigured ? "API Key ativa no servidor" : "Chave GEMINI não encontrada"}
                            />
                            <DiagnosticItem
                                icon={<Database size={18} />}
                                label="Banco de Dados"
                                status={health.dbConnected}
                                detail={health.dbConnected ? "Conexão ativa com Supabase" : "Falha na query de teste (Check Tables)"}
                            />

                            <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronização</p>
                                    <p className="text-xs font-bold text-slate-600">
                                        {health.timestamp ? new Date(health.timestamp).toLocaleString('pt-BR') : 'Sem dados'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instância</p>
                                    <p className="text-xs font-mono font-bold text-op7-blue lowercase">{window.location.hostname}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={checkHealth}
                        className="w-full bg-op7-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-op7-navy/20 hover:bg-op7-blue transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refazer Check Completo
                    </button>
                </div>
            </div>
        </div>
    );
};

const DiagnosticItem: React.FC<{ icon: any; label: string; status: boolean; detail: string }> = ({ icon, label, status, detail }) => (
    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${status ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {icon}
            </div>
            <div>
                <h4 className={`text-[12px] font-black uppercase tracking-tight ${status ? 'text-green-900' : 'text-red-900'}`}>{label}</h4>
                <p className={`text-[10px] font-bold opacity-60 uppercase tracking-widest leading-tight mt-0.5 ${status ? 'text-green-700' : 'text-red-700'}`}>{detail}</p>
            </div>
        </div>
        {status ? <CheckCircle2 className="text-green-500" size={18} /> : <AlertTriangle className="text-red-500" size={18} />}
    </div>
);
