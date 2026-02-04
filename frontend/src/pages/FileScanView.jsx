import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import FileUploadZone from '../components/FileUploadZone';
import RiskScoreCard from '../components/RiskScoreCard';
import EngineBreakdown from '../components/EngineBreakdown';
import { scanFile } from '../services/api';
import { useScanStore } from '../store/scanStore';

export default function FileScanView() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { addFileScan } = useScanStore();

    const handleFileSelect = (selectedFile) => {
        setFile(selectedFile);
        setResult(null);
    };

    const handleScan = async () => {
        if (!file) {
            toast.error('Please select a file first');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Analyzing file...');

        try {
            const response = await scanFile(file);
            const scanResult = response.data;

            setResult(scanResult);
            addFileScan({
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-wider">File Analysis</h1>
                <p className="text-slate-400 text-sm md:text-base">Upload and scan files for malware threats</p>
            </motion.div>

            {/* Upload Zone */}
            <FileUploadZone onFileSelect={handleFileSelect} isLoading={loading} />

            {/* Scan Button */}
            {file && !result && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleScan}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Scanning...
                        </span>
                    ) : (
                        'Start Analysis'
                    )}
                </motion.button>
            )}

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
                        <p className="text-slate-300 font-semibold">Analyzing file with multiple engines...</p>
                        <p className="text-slate-500 text-sm mt-2">This may take a few moments</p>
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
                        {/* File Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                        >
                            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">File Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">Filename</p>
                                    <p className="text-white font-semibold truncate">{result.fileName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm mb-1">File Size</p>
                                    <p className="text-white font-semibold">{(result.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-slate-400 text-sm mb-1">SHA-256 Hash</p>
                                    <p className="text-white font-mono text-xs break-all bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                        {result.hash}
                                    </p>
                                </div>
                                {result.scanDuration && (
                                    <div>
                                        <p className="text-slate-400 text-sm mb-1">Scan Duration</p>
                                        <p className="text-white font-semibold">{(result.scanDuration / 1000).toFixed(2)}s</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Contextual Risk Assessment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RiskScoreCard
                                score={result.risk_score}
                                verdict={result.verdict}
                                severity={result.severity}
                                title="Static Risk Score"
                            />
                            {result.contextualScore && (
                                <RiskScoreCard
                                    score={result.contextualScore.adjustedScore}
                                    verdict={result.contextualScore.adjustedScore >= 75 ? 'Malicious' : result.contextualScore.adjustedScore >= 50 ? 'Suspicious' : 'Safe'}
                                    severity={result.contextualScore.adjustedScore >= 75 ? 'critical' : result.contextualScore.adjustedScore >= 50 ? 'high' : result.contextualScore.adjustedScore >= 30 ? 'medium' : 'low'}
                                    title="Context-Aware Score"
                                    accent="cyan"
                                />
                            )}
                        </div>

                        {/* Behavioral Analysis (Phase 2 Component) */}
                        {result.behavioral && result.behavioral.status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Static Behavioral Analysis</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${result.behavioral.score > 40 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                                        {result.behavioral.severity} risk
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Threat Indicators:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(result.behavioral.behaviors).map(([key, value]) => value.detected && (
                                                <span key={key} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-white font-bold uppercase tracking-tighter">
                                                    {key.replace(/([A-Z])/g, ' $1')} ({value.count})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recommendations:</p>
                                        <div className="space-y-1">
                                            {result.behavioral.recommendations.map((rec, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                                    <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                                    {rec}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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

                        {/* Detailed Breakdown */}
                        {result.breakdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                            >
                                <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Detailed Analysis</h3>
                                <div className="space-y-4">
                                    {result.breakdown.clamav && (
                                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="font-semibold text-white mb-2">ClamAV</p>
                                            <p className="text-sm text-slate-300">
                                                Status: <span className="text-cyan-400">{result.breakdown.clamav.status}</span>
                                            </p>
                                            {result.breakdown.clamav.signature && (
                                                <p className="text-sm text-slate-300 mt-1">
                                                    Signature: <span className="text-yellow-400">{result.breakdown.clamav.signature}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {result.breakdown.yara && (
                                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="font-semibold text-white mb-2">YARA</p>
                                            <p className="text-sm text-slate-300">
                                                Status: <span className="text-cyan-400">{result.breakdown.yara.status}</span>
                                            </p>
                                            {result.breakdown.yara.rules && result.breakdown.yara.rules.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-slate-400 mb-1">Matched Rules:</p>
                                                    <div className="space-y-1">
                                                        {result.breakdown.yara.rules.map((rule, idx) => (
                                                            <p key={idx} className="text-xs text-yellow-400 font-mono">{rule}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {result.breakdown.ml && (
                                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="font-semibold text-white mb-2">ML Heuristics</p>
                                            <p className="text-sm text-slate-300">
                                                Verdict: <span className="text-cyan-400">{result.breakdown.ml.verdict}</span>
                                            </p>
                                            {result.breakdown.ml.reasons && result.breakdown.ml.reasons.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-slate-400 mb-1">Detection Reasons:</p>
                                                    <ul className="space-y-1">
                                                        {result.breakdown.ml.reasons.map((reason, idx) => (
                                                            <li key={idx} className="text-xs text-slate-300">• {reason}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* New Scan Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setFile(null);
                                setResult(null);
                            }}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors uppercase tracking-wider border border-slate-700"
                        >
                            Scan Another File
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
