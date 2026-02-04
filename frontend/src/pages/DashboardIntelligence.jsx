import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, ChevronDown, Activity, AlertCircle, Zap } from 'lucide-react';
import { getDashboardIntelligence } from '../services/api';
import ThreatMap from '../components/ThreatMap';
import TopThreatSources from '../components/TopThreatSources';
import ThreatTrendChart from '../components/ThreatTrendChart';

export default function DashboardIntelligence() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const response = await getDashboardIntelligence();
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard intelligence:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Polling every 5s for real-time feel
        return () => clearInterval(interval);
    }, []);

    const system = data?.system || {};
    const activity = data?.activity || [];
    const trends = data?.trends || {};

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* TOP STAT BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatBox
                    label="Intrusion Attempts"
                    value={trends.threatsDetected24h || 0}
                    trend="24h"
                    icon={AlertCircle}
                />
                <StatBox
                    label="Active Scans"
                    value={trends.totalScans24h || 0}
                    trend="Live"
                    status="Active"
                    statusColor="bg-emerald-500/10 text-emerald-500"
                    icon={Activity}
                />
                <StatBox
                    label="Server Load"
                    value={`${system.cpu?.load || 0}%`}
                    trend="Optimal"
                    icon={Shield}
                />
                <StatBox
                    label="Network RX/TX"
                    value={`${((system.network?.rx_sec || 0) / 1024).toFixed(1)}k`}
                    unit="B/s"
                    status={system.network?.rx_sec > 100000 ? "High Load" : "Stable"}
                    statusColor={system.network?.rx_sec > 100000 ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"}
                    icon={Zap}
                />
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-12 gap-6">

                {/* COLUMN 1: Intrusion List (Left) */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="soc-card h-full p-0 overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] leading-none">Intrusion Feed</h3>
                            <button className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors">View all</button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            {activity.map((row, i) => (
                                <div key={i} className="p-4 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-white/[0.05] transition-all group cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-black text-white uppercase group-hover:text-violet-400 transition-colors tracking-tight truncate max-w-[120px]" title={row.source}>{row.source}</span>
                                        <span className={`severity-pill severity-${row.severity.toLowerCase()}`}>{row.severity}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        <span className="font-mono">{row.type.replace('_', ' ')}</span>
                                        <span>{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                            {activity.length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    No recent threats detected
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: Threat Map (Center) */}
                <div className="col-span-12 lg:col-span-6 min-h-[400px] lg:h-[550px] shadow-2xl">
                    <ThreatMap activity={activity} />
                </div>

                {/* COLUMN 3: Threat Detection Feed (Right) */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="soc-card h-full p-6 flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between mb-8 flex-shrink-0">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Events</h3>
                            <button
                                onClick={fetchData}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/10 border border-violet-500/20 rounded-md text-[10px] font-black text-violet-400 hover:bg-violet-600/20 transition-all active:scale-95"
                            >
                                <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                                REFRESH
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {activity.map((item, i) => (
                                <div key={i} className={`feed-item p-4 rounded-xl border border-white/5 group ${item.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/40'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight">{item.type}</span>
                                            {item.severity === 'critical' && <Shield size={10} className="text-red-500" />}
                                        </div>
                                        <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">{new Date(item.timestamp).toLocaleTimeString()}</span>

                                    {item.details && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-white/5">
                                            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 font-mono break-all">{JSON.stringify(item.details).slice(0, 100)}...</p>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECONDARY ROW: Analytics & Summary */}
            <div className="grid grid-cols-12 gap-6" id="analytics-row">

                {/* THREAT TREND CHART */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="soc-card h-[350px] p-0 overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Threat Activity Trend</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">24-hour heuristic analysis</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Detection</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Anomalies</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative -mb-2">
                            <ThreatTrendChart trends={trends} />
                        </div>
                    </div>
                </div>

                {/* TOP THREAT SOURCES */}
                <div className="col-span-12 lg:col-span-4 h-[350px]">
                    <TopThreatSources activity={activity} />
                </div>
            </div>

            {/* FOOTER ROW: Security Events Table */}
            <div className="soc-card p-0 overflow-hidden shadow-2xl w-full">
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Security Events Feed</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Monitoring</span>
                        </div>
                        <button className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors">Export Logs</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Event Description</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Source Origin</th>
                                <th className="px-6 py-4">Vector</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-[12px] font-medium text-slate-300">
                            {activity.slice(0, 5).map((item, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-500">{(i + 1).toString().padStart(3, '0')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-black uppercase text-white group-hover:text-violet-400 transition-colors tracking-tight">{item.type}</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Affected Module: System Core</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">{new Date(item.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 font-mono text-slate-400">{item.source}</td>
                                    <td className="px-6 py-4"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">TCP/IP</span></td>
                                    <td className="px-6 py-4">
                                        <span className={`severity-pill severity-${item.severity.toLowerCase()}`}>{item.severity}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.03] text-[9px] font-black uppercase tracking-widest hover:border-violet-500/50 hover:text-white transition-all">Inspect</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const StatBox = ({ label, value, unit, trend, status, statusColor, icon: Icon }) => (
    <div className="soc-card p-6 flex flex-col justify-between min-h-[140px] group hover:border-violet-500/40 transition-all shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl pointer-events-none group-hover:bg-violet-600/10 transition-all" />
        <div className="flex items-center justify-between relative z-10">
            <div className="p-2 rounded-lg bg-slate-950/50 border border-white/5 group-hover:border-violet-500/30 transition-all">
                <Icon size={16} className="text-slate-500 group-hover:text-violet-400 transition-colors" />
            </div>
            {trend && <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${trend.startsWith('-') || trend === 'Optimal' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]'}`}>{trend}</span>}
            {status && <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${statusColor} border border-current opacity-60`}>{status}</span>}
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
            <span className="text-5xl font-black text-white tracking-tighter group-hover:scale-[1.05] transition-transform origin-left drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{value}</span>
            {unit && <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{unit}</span>}
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-10 mt-1">{label}</div>
    </div>
);
