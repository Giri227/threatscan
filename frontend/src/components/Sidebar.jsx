import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Globe, Network, Settings, Zap, Menu, X } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();
    const [isOpen, setIsOpen] = React.useState(false);
    const isMobile = window.innerWidth < 768; // Simple initial check, ideally use useMediaQuery

    const menuItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/file', label: 'File Scan', icon: FileText },
        { path: '/url', label: 'URL Analysis', icon: Globe },
        { path: '/network', label: 'Network', icon: Network },
        { path: '/system', label: 'System Info', icon: Zap },
        { path: '/settings', label: 'Settings', icon: Settings }
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full bg-violet-600 text-white shadow-2xl border border-violet-400/30"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Backdrop for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <motion.div
                initial={false}
                animate={{ x: isOpen || !isMobile ? 0 : -300 }}
                className={`w-64 bg-gradient-to-b from-slate-950 to-slate-900 border-r border-slate-800 flex flex-col h-screen fixed md:relative z-40 transition-transform duration-300 md:translate-x-0`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-slate-800">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white uppercase tracking-wider">ThreatScan</h1>
                            <p className="text-xs text-slate-400">Security Suite</p>
                        </div>
                    </motion.div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {menuItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`relative px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3 group ${isActive
                                        ? 'bg-violet-600/15 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute left-0 w-1.5 h-6 bg-violet-500 rounded-r-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                        />
                                    )}
                                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-violet-400 shadow-neon' : 'text-slate-500 group-hover:text-slate-200'}`} />
                                    <span className={`font-black text-[13px] uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900 border border-violet-500/10 text-center relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-violet-500/5 group-hover:bg-violet-500/10 transition-colors" />

                        <p className="text-[10px] text-violet-400 mb-2 uppercase tracking-[0.3em] font-black opacity-70">System Architects</p>

                        <div className="space-y-1 relative z-10">
                            <GlitchText text="@Giridhar Pai" />
                            <GlitchText text="@WHITEHATWOLF" color="text-cyan-400" />
                            <GlitchText text="@Jesteena Mary Oommen" />
                            <GlitchText text="@Luna Pheonix" color="text-fuchsia-400" />
                            <div className="mt-2 pt-2 border-t border-white/5">
                                <span className="text-[10px] font-black text-slate-500 tracking-[0.2em]">© 2026 PROTECT</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </>
    );
}

const GlitchText = ({ text, color = "text-white" }) => (
    <div className={`text-[11px] font-black ${color} tracking-wider relative group cursor-default`}>
        <span className="relative z-10">{text}</span>
        <span className="absolute left-0 top-0 -z-10 w-full h-full text-red-500 opacity-0 group-hover:opacity-70 group-hover:animate-pulse group-hover:translate-x-[2px] transition-all duration-75 block" aria-hidden="true">{text}</span>
        <span className="absolute left-0 top-0 -z-10 w-full h-full text-blue-500 opacity-0 group-hover:opacity-70 group-hover:animate-pulse group-hover:-translate-x-[2px] transition-all duration-75 block delay-75" aria-hidden="true">{text}</span>
    </div>
);
