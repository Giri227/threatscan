import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';

export default function EngineBreakdown({ engines }) {
    const engineList = [
        { name: 'ClamAV', key: 'clamav', icon: Shield },
        { name: 'YARA', key: 'yara', icon: Shield },
        { name: 'ML Heuristics', key: 'ml', icon: Shield },
        { name: 'Gemini AI', key: 'ai', icon: Shield },
        { name: 'VirusTotal', key: 'virustotal', icon: Shield }
    ];

    const getEngineStatus = (engine) => {
        if (!engine) return { status: 'unavailable', score: 0 };

        // Normalize AI results
        if (engine.ai_verdict) {
            return {
                status: engine.ai_verdict.toLowerCase(),
                score: engine.confidence || 0,
                analysis: engine.analysis
            };
        }

        // Standard normalization
        return {
            status: engine.status || (engine.score > 0 ? 'detected' : 'clean'),
            score: engine.score || 0,
            ...engine
        };
    };

    const getStatusColor = (status, score) => {
        if (status === 'unavailable') return 'text-slate-500';
        if (score >= 75) return 'text-red-400';
        if (score >= 50) return 'text-orange-400';
        if (score >= 30) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getStatusIcon = (status, score) => {
        if (status === 'unavailable') return '○';
        if (score >= 50) return '⚠';
        return '✓';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
        >
            <h3 className="text-lg font-black text-white mb-6 uppercase tracking-wider">Engine Analysis</h3>

            <div className="space-y-4">
                {engineList.map((engine, idx) => {
                    const engineData = getEngineStatus(engines[engine.key]);
                    const statusColor = getStatusColor(engineData.status, engineData.score);

                    return (
                        <motion.div
                            key={engine.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center ${statusColor}`}>
                                    {getStatusIcon(engineData.status, engineData.score)}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm">{engine.name}</p>
                                    <p className="text-xs text-slate-400 capitalize">{engineData.status}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Score bar */}
                                <div className="w-24 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${engineData.score}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${engineData.score >= 75 ? 'bg-red-500' :
                                            engineData.score >= 50 ? 'bg-orange-500' :
                                                engineData.score >= 30 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                            }`}
                                    />
                                </div>

                                {/* Score text */}
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`font-bold text-sm w-12 text-right ${statusColor}`}>
                                        {engineData.score}%
                                    </span>
                                    {engineData.status === 'unavailable' && (
                                        <button
                                            title={engineData.error || `Setup required for ${engine.name}`}
                                            className="text-[9px] font-black text-violet-400 uppercase tracking-widest hover:text-white flex items-center gap-1 group/fix"
                                            onClick={() => {
                                                window.open('https://github.com/Giri227/threatscan#troubleshooting', '_blank');
                                                // Note: In a real app we'd use a Modal or internal router link to INSTALL_GUIDE.md
                                            }}
                                        >
                                            <HelpCircle size={10} />
                                            Fix
                                            <ExternalLink size={8} className="opacity-0 group-hover/fix:opacity-100 transition-opacity" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
