import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Globe, Loader2, AlertTriangle, CheckCircle, Link2 } from 'lucide-react';
import RiskScoreCard from '../components/RiskScoreCard';
import EngineBreakdown from '../components/EngineBreakdown';
import { scanUrl } from '../services/api';
import { useScanStore } from '../store/scanStore';

export default function URLAnalysisView() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { addUrlScan } = useScanStore();

    const handleScan = async () => {
        if (!url.trim()) {
            toast.error('Please enter a URL');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Analyzing URL...');

        try {
            const response = await scanUrl(url);
            const scanResult = response.data;

            setResult(scanResult);
            addUrlScan({
                ...scanResult,
                timestamp: new Date().toISOString()
            });

            toast.success('Analysis complete!', { id: toastId });
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Analysis failed';
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleScan();
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-wider">URL Analysis</h1>
                <p className="text-slate-400 text-sm md:text-base">Scan URLs for phishing, malware, and security threats</p>
            </motion.div>

            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
            >
                <label className="block text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                    Enter URL to Analyze
                </label>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="https://example.com"
                            disabled={loading}
                            className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition-all"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleScan}
                        disabled={loading || !url.trim()}
                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Analyze'
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Loading State */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-12 border border-slate-700 text-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-cyan-500 mx-auto mb-4"
                        />
                        <p className="text-slate-300 font-semibold">Analyzing URL...</p>
                        <p className="text-slate-500 text-sm mt-2">Checking against multiple threat databases</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
                {result && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6 holo-card"
                    >
                        {/* URL Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                        >
                            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">URL Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Full URL</p>
                                    <p className="text-white font-mono text-sm break-all bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                        {result.url}
                                    </p>
                                </div>
                                {result.structure && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                        <div>
                                            <p className="text-slate-400 text-xs mb-1">Protocol</p>
                                            <p className="text-cyan-400 font-semibold">{result.structure.protocol}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-xs mb-1">Domain</p>
                                            <p className="text-cyan-400 font-semibold truncate">{result.structure.domain}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-xs mb-1">URL Length</p>
                                            <p className="text-cyan-400 font-semibold">{result.structure.length} chars</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Contextual Risk Assessment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RiskScoreCard
                                score={result.risk_score}
                                verdict={result.verdict}
                                severity={result.risk_score >= 75 ? 'critical' : result.risk_score >= 50 ? 'high' : result.risk_score >= 30 ? 'medium' : 'low'}
                                title="Static Risk Score"
                            />
                            {result.contextual_score !== undefined && (
                                <RiskScoreCard
                                    score={result.contextual_score}
                                    verdict={result.contextual_score >= 75 ? 'Malicious' : result.contextual_score >= 50 ? 'Suspicious' : 'Safe'}
                                    severity={result.contextual_score >= 75 ? 'critical' : result.contextual_score >= 50 ? 'high' : result.contextual_score >= 30 ? 'medium' : 'low'}
                                    title="Context-Aware Score"
                                    accent="cyan"
                                />
                            )}
                        </div>

                        {/* DGA Analysis */}
                        {result.dga_analysis && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">DGA Detection</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${result.dga_analysis.isDGA ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                                        {result.dga_analysis.isDGA ? 'DGA DETECTED' : 'CLEAN'}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="text-slate-400 text-xs mb-1 uppercase tracking-tighter">Shannon Entropy</p>
                                            <p className="text-xl font-bold text-white tracking-widest">{result.dga_analysis.score.toFixed(1)}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="text-slate-400 text-xs mb-1 uppercase tracking-tighter">Pattern Likelihood</p>
                                            <p className="text-xl font-bold text-white tracking-widest">{result.dga_analysis.isDGA ? 'HIGH' : 'LOW'}</p>
                                        </div>
                                    </div>
                                    {result.dga_analysis.reasons && result.dga_analysis.reasons.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Indicators:</p>
                                            {result.dga_analysis.reasons.map((reason, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                                    <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                                    {reason}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Engine Breakdown */}
                        <EngineBreakdown engines={result.breakdown || {}} />


                        {/* AI Intelligence Report */}
                        {result.ai_analysis && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-violet-900/20 to-slate-900 p-6 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                        <span className="text-white font-black text-xs">AI</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Gemini Threat Intelligence</h3>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/50 border border-violet-500/20">
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        {result.ai_analysis.analysis || "AI Analysis unavailable."}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Confidence Score:</span>
                                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500"
                                                style={{ width: `${result.ai_analysis.confidence || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-white">{result.ai_analysis.confidence || 0}%</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Heuristics */}
                        {result.heuristics && result.heuristics.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                            >
                                <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Detection Heuristics</h3>
                                <div className="space-y-2">
                                    {result.heuristics.map((heuristic, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                                        >
                                            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                            <span className="text-slate-300 text-sm">{heuristic}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* VirusTotal Results */}
                        {result.virustotal && result.virustotal.status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                            >
                                <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">VirusTotal Report</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                        <p className="text-slate-400 text-sm mb-1">Detections</p>
                                        <p className="text-2xl font-bold text-red-400">{result.virustotal.positives}</p>
                                        <p className="text-xs text-slate-500">out of {result.virustotal.total} vendors</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                        <p className="text-slate-400 text-sm mb-1">Detection Rate</p>
                                        <p className="text-2xl font-bold text-cyan-400">
                                            {((result.virustotal.positives / result.virustotal.total) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* New Scan Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setUrl('');
                                setResult(null);
                            }}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors uppercase tracking-wider border border-slate-700"
                        >
                            Analyze Another URL
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
