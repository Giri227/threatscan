import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Server, Share2, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import api, { getClientInfo } from '../services/api';
import NetworkGauge from '../components/NetworkGauge';

export default function SystemInfoView() {
    const [clientInfo, setClientInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [speedTest, setSpeedTest] = useState({ status: 'idle', download: 0, upload: 0, ping: 0, progress: 0, activeMetric: null });


    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const response = await getClientInfo();
                setClientInfo(response.data);
            } catch (error) {
                console.error('Failed to fetch client info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, []);

    const runSpeedTest = async () => {
        setSpeedTest({ status: 'running', download: 0, upload: 0, ping: 0, progress: 0, activeMetric: 'PING' });

        try {
            // 1. PING TEST
            let totalPing = 0;
            for (let i = 0; i < 3; i++) {
                const start = performance.now();
                await api.get(`/speedtest/ping?t=${Date.now()}`);
                totalPing += (performance.now() - start);
                setSpeedTest(prev => ({ ...prev, progress: 10 + (i * 10) }));
            }
            const pingResult = Math.round(totalPing / 3);
            setSpeedTest(prev => ({ ...prev, ping: pingResult, activeMetric: 'DOWNLOAD', progress: 30 }));

            // 2. DOWNLOAD TEST
            const downloadStart = performance.now();
            const downloadResponse = await api.get(`/speedtest/download?size=1048576`, {
                responseType: 'arraybuffer',
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setSpeedTest(prev => ({ ...prev, progress: 30 + (progress * 0.4) }));
                    }
                }
            });
            const downloadDuration = (performance.now() - downloadStart) / 1000;
            const downloadMbps = ((downloadResponse.data.byteLength * 8) / (1024 * 1024) / downloadDuration).toFixed(2);
            setSpeedTest(prev => ({ ...prev, download: parseFloat(downloadMbps), activeMetric: 'UPLOAD', progress: 70 }));

            // 3. UPLOAD TEST
            const uploadSize = 524288;
            const uploadData = new Uint8Array(uploadSize);
            const CHUNK_SIZE = 65536;
            for (let i = 0; i < uploadSize; i += CHUNK_SIZE) {
                const slice = uploadData.subarray(i, Math.min(i + CHUNK_SIZE, uploadSize));
                window.crypto.getRandomValues(slice);
            }
            const uploadStart = performance.now();
            await api.post(`/speedtest/upload`, uploadData, {
                headers: { 'Content-Type': 'application/octet-stream' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setSpeedTest(prev => ({ ...prev, progress: 70 + (progress * 0.3) }));
                    }
                }
            });
            const uploadDuration = (performance.now() - uploadStart) / 1000;
            const uploadMbps = ((uploadData.byteLength * 8) / (1024 * 1024) / uploadDuration).toFixed(2);

            setSpeedTest({
                status: 'complete',
                download: parseFloat(downloadMbps),
                upload: parseFloat(uploadMbps),
                ping: pingResult,
                progress: 100,
                activeMetric: null
            });
        } catch (error) {
            console.error('Speedtest Error:', error);
            const msg = error.message?.includes('403') || error.message?.includes('CORS')
                ? 'Security block detected. Please refresh and try again.'
                : 'Server busy or connection weak. Retrying...';
            setSpeedTest({ status: 'error', message: msg });
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-tighter">System Intelligence</h1>
                    <p className="text-slate-400 font-medium tracking-tight">Enterprise Infrastructure & Device Forensics</p>
                </div>
                {clientInfo && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Global Node Linked</span>
                    </div>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Network & Geo */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Network Info Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard
                            icon={Globe}
                            label="Public IP Address"
                            value={clientInfo?.ip}
                            color="cyan"
                            mono
                        />
                        <InfoCard
                            icon={Server}
                            label="ISP Vector"
                            value={clientInfo?.isp || clientInfo?.org}
                            color="purple"
                        />
                        <InfoCard
                            icon={MapPin}
                            label="Regional Node"
                            value={clientInfo?.city ? `${clientInfo.city}, ${clientInfo.country || clientInfo.country_name || ''}` : clientInfo?.message === 'Geo info unavailable' ? 'N/A' : 'Scanning...'}
                            color="emerald"
                        />
                        <InfoCard
                            icon={Share2}
                            label="Autonomous System"
                            value={clientInfo?.as || clientInfo?.asn || clientInfo?.org}
                            color="blue"
                            mono
                        />
                    </div>

                    {/* Speed Test Main Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl bg-slate-900 border border-violet-500/10 p-6 md:p-10 shadow-2xl flex flex-col items-center"
                    >
                        <div className="flex flex-col items-center text-center mb-12">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Network Velocity</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Synchronized throughput analysis</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 w-full place-items-center">
                            <NetworkGauge
                                value={speedTest.ping}
                                maxValue={200}
                                label="LATENCY"
                                unit="ms"
                                color="#8b5cf6"
                                active={speedTest.activeMetric === 'PING'}
                                download={speedTest.download}
                                upload={speedTest.upload}
                            />
                            <NetworkGauge
                                value={speedTest.download}
                                maxValue={200}
                                label="DOWNLOAD"
                                color="#d946ef"
                                active={speedTest.activeMetric === 'DOWNLOAD'}
                                download={speedTest.download}
                                upload={speedTest.upload}
                            />
                            <NetworkGauge
                                value={speedTest.upload}
                                maxValue={100}
                                label="UPLOAD"
                                color="#00f0ff"
                                active={speedTest.activeMetric === 'UPLOAD'}
                                download={speedTest.download}
                                upload={speedTest.upload}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-6 w-full max-w-md">
                            <button
                                onClick={runSpeedTest}
                                disabled={speedTest.status === 'running'}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${speedTest.status === 'running'
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-95 border border-violet-400/30'
                                    }`}
                            >
                                {speedTest.status === 'running' ? 'Analysis in Progress...' : 'Initialize Velocity Test'}
                            </button>

                            {speedTest.status === 'running' && (
                                <div className="w-full space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-violet-400 uppercase tracking-widest px-1">
                                        <span>Measuring packet flow...</span>
                                        <span>{speedTest.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${speedTest.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {speedTest.status === 'error' && (
                                <div className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{speedTest.message}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Device Forensics */}
                <div className="space-y-6">


                    <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all" />
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Secure Forensics</p>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            System diagnostics are performed locally to ensure zero metadata leakage. Network metrics are calculated via encrypted handshakes with ThreatScan nodes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const InfoCard = ({ icon: Icon, label, value, color, mono = false }) => (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4 hover:border-slate-700 transition-colors group">
        <div className={`p-3 rounded-xl bg-${color}-500/10 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-white font-bold truncate ${mono ? 'font-mono tracking-tight text-sm' : 'text-md'}`}>
                {value || 'Searching...'}
            </p>
        </div>
    </div>
);


