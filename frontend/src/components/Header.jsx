import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Bell, User, Clock, Wifi, Shield, Monitor, Globe, Zap, Search, Activity } from 'lucide-react';
import { getHealth } from '../services/api';

export default function Header() {
    const location = useLocation();
    const [health, setHealth] = useState(null);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const response = await getHealth();
                setHealth(response.data);
            } catch (error) {
                console.error('Failed to fetch health:', error);
            }
        };

        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 z-50"
        >
            {/* Left side - Branding & Status (Reference Match) */}
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Shield className="text-white" size={18} />
                    </div>
                    <span className="text-lg font-black text-white tracking-[0.2em] uppercase hidden xl:block">Threat Scan</span>
                </div>

                <div className="flex items-center gap-6 border-l border-white/10 pl-8">
                    {health && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                System Online
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] font-black text-slate-300 tracking-widest">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Center - View Tabs (Visual Only Context) */}
            <div className="hidden lg:flex items-center gap-6 bg-slate-950/40 px-6 py-2 rounded-xl border border-white/5 shadow-inner">
                <Link to="/" className={`p-1.5 rounded-lg transition-all ${location.pathname === '/' ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-white'}`}><Monitor size={16} /></Link>
                <div className="w-[1px] h-4 bg-white/5" />
                <Link to="/url" className={`p-1.5 rounded-lg transition-all ${location.pathname === '/url' ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-white'}`}><Globe size={16} /></Link>
                <div className="w-[1px] h-4 bg-white/5" />
                <Link to="/system" className={`p-1.5 rounded-lg transition-all ${location.pathname === '/system' ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-white'}`}><Zap size={16} /></Link>
                <div className="w-[1px] h-4 bg-white/5" />
                <Link to="/network" className={`p-1.5 rounded-lg transition-all ${location.pathname === '/network' ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-white'}`}><Activity size={16} /></Link>
            </div>

            {/* Right side - User & Global Actions */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <Search size={18} className="text-slate-500 hover:text-white cursor-pointer transition-colors" />
                    <div className="relative">
                        <Bell size={18} className="text-slate-500 hover:text-white cursor-pointer transition-colors" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900" />
                    </div>
                </div>

                <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center hover:border-violet-500/50 transition-all cursor-pointer group">
                        <User className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="px-4 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    >
                        <Wifi className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Connected</span>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
