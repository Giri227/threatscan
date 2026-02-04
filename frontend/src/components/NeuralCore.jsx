import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Zap, Terminal, Globe, Cpu, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getDashboardIntelligence } from '../services/api';

const navItems = [
    { path: '/file', label: 'Object Isolation', icon: Shield, description: 'Binary Threat Neutralization' },
    { path: '/url', label: 'Vector Analysis', icon: Globe, description: 'Neural Phishing Defense' },
    { path: '/system', label: 'System Pulse', icon: Zap, description: 'Network Velocity & Identity' },
    { path: '/network', label: 'Packet Stream', icon: Terminal, description: 'Deep Traffic Inspection' },
];

export default function NeuralCore() {
    const location = useLocation();
    const [data, setData] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getDashboardIntelligence();
                setData(response.data);
            } catch (err) {
                console.error('Core link error:', err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const stats = {
        attempts: data?.trends?.threatsDetected24h || 0,
        load: data?.system?.cpu?.load || 0,
        scans: data?.trends?.totalScans24h || 0,
        rx: data?.system?.network?.rx_sec || 0
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
            {/* ⚛️ THE NEURAL CORE HUB */}
            <div className="relative w-full max-w-4xl aspect-square flex items-center justify-center">

                {/* Orbital Rings - Speeds driven by server load */}
                <motion.div
                    className="absolute w-[95%] h-[95%] rounded-full border border-cyan-500/10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: Math.max(10, 60 - stats.load), repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute w-[75%] h-[75%] rounded-full border border-violet-500/10"
                    animate={{ rotate: -360 }}
                    transition={{ duration: Math.max(5, 40 - stats.load / 2), repeat: Infinity, ease: 'linear' }}
                />

                {/* Central Intelligence Unit */}
                <motion.div
                    className="relative w-48 h-48 md:w-72 md:h-72 rounded-full glass-mesh flex flex-col items-center justify-center z-20 group cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    onClick={() => window.location.reload()}
                >
                    <div className={`absolute inset-0 bg-cyan-500/5 rounded-full ${stats.attempts > 0 ? 'animate-pulse' : 'animate-scan'}`} />
                    <motion.div
                        className={`w-12 h-12 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mb-6 ${stats.attempts > 0 ? 'bg-red-500/20 border border-red-500/40' : 'bg-cyan-500/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,247,255,0.2)]'}`}
                        animate={{
                            scale: stats.attempts > 0 ? [1, 1.1, 1] : 1,
                            opacity: [0.8, 1, 0.8]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {stats.attempts > 0 ? <AlertTriangle className="text-red-400 w-8 h-8" /> : <Shield className="text-cyan-400 w-8 h-8" />}
                    </motion.div>

                    <div className="text-center">
                        <span className="block text-[10px] md:text-sm font-black uppercase tracking-[0.4em] text-white">Neural Defense</span>
                        <span className="block text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-cyan-400 mt-1">Core Synchronization</span>
                    </div>

                    <div className="absolute -bottom-8 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Load</span>
                        <span className="text-xs font-bold text-white">{stats.load.toFixed(1)}%</span>
                    </div>
                </motion.div>

                {/* Floating Navigation Nodes */}
                <div className="absolute inset-0 z-10">
                    {navItems.map((item, idx) => {
                        const angle = (idx / navItems.length) * 2 * Math.PI - Math.PI / 2;
                        const radius = 38; // Slightly further out
                        const x = 50 + Math.cos(angle) * radius;
                        const y = 50 + Math.sin(angle) * radius;
                        const isActive = location.pathname === item.path;

                        return (
                            <motion.div
                                key={item.path}
                                className="absolute"
                                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1, type: 'spring' }}
                            >
                                <Link to={item.path} className="group relative">
                                    <motion.div
                                        className={`nav-dial-item w-20 h-20 md:w-28 md:h-28 rounded-full glass-mesh flex flex-col items-center justify-center border-2 border-white/5 transition-all duration-500 ${isActive ? 'active border-cyan-500 shadow-[0_0_30px_rgba(0,247,255,0.25)]' : 'hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,247,255,0.1)]'}`}
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                    >
                                        <item.icon className="w-6 h-6 md:w-7 md:h-7 mb-2 text-slate-400 group-active:text-cyan-400 transition-colors" />
                                        <span className="text-[8px] md:text-[10px] font-black uppercase text-center px-3 leading-tight text-slate-300">
                                            {item.label}
                                        </span>
                                    </motion.div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* 🌏 GLOBAL DEFENSE STATS */}
            <motion.div
                className="mt-20 md:mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-24 w-full max-w-6xl px-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <div className="text-center group flex flex-col items-center">
                    <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-cyan-400 transition-colors">Total Interceptions</p>
                    <p className="text-2xl md:text-5xl font-black text-white tracking-tighter tabular-nums">{stats.attempts.toLocaleString()}</p>
                </div>
                <div className="text-center group flex flex-col items-center">
                    <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-violet-400 transition-colors">Neural Scans</p>
                    <p className="text-2xl md:text-5xl font-black text-white tracking-tighter tabular-nums">{stats.scans.toLocaleString()}</p>
                </div>
                <div className="text-center group flex flex-col items-center">
                    <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-emerald-400 transition-colors">Efficiency</p>
                    <p className="text-2xl md:text-5xl font-black text-white tracking-tighter">99.9%</p>
                </div>
                <div className="text-center group flex flex-col items-center">
                    <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-fuchsia-400 transition-colors">RX Rate</p>
                    <p className="text-2xl md:text-5xl font-black text-white tracking-tighter tabular-nums">{(stats.rx / 1024).toFixed(1)}k</p>
                </div>
            </motion.div>
        </div>
    );
}
