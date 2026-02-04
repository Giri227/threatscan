import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThreatMap = ({ activity = [] }) => {
    const [pings, setPings] = useState([]);

    useEffect(() => {
        if (!activity || activity.length === 0) return;

        // Process new activity items that haven't been pinged yet
        // For simplicity, we just take the latest few and animate them
        const recentActivity = activity.slice(0, 5);

        const newPings = recentActivity.map((item, index) => {
            // Deterministic hashing for coordinates based on source
            const hash = item.source.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
            const x = (Math.abs(hash) % 70) + 15; // Keep within map bounds (15-85%)
            const y = (Math.abs(hash >> 8) % 60) + 20; // Keep within map bounds (20-80%)
            const color = item.severity === 'critical' ? '#ef4444' : (item.severity === 'high' ? '#f59e0b' : '#8b5cf6');

            return {
                id: `${item.source}-${item.timestamp}-${index}`, // Unique ID
                x,
                y,
                color,
                size: Math.random() * 4 + 2
            };
        });

        setPings(newPings);

    }, [activity]);

    return (
        <div className="relative w-full h-full bg-slate-950/40 rounded-3xl border border-white/5 overflow-hidden shadow-2xl group">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* Stylized Map Backdrop */}
            <div className="absolute inset-0 flex items-center justify-center p-8 opacity-20 select-none pointer-events-none">
                <svg viewBox="0 0 1000 500" className="w-full h-full fill-slate-700">
                    {/* A more detailed simplified world map representation using dots */}
                    {[...Array(2000)].map((_, i) => {
                        const x = (i % 80) * 12.5;
                        const y = Math.floor(i / 80) * 12.5;
                        // Rough continent constraints for the dot grid
                        const isLand = (
                            (x > 100 && x < 250 && y > 100 && y < 350) || // Americas
                            (x > 150 && x < 300 && y > 150 && y < 300) ||
                            (x > 450 && x < 650 && y > 80 && y < 400) || // Eurasia/Africa
                            (x > 500 && x < 600 && y > 150 && y < 350) ||
                            (x > 700 && x < 900 && y > 200 && y < 350)    // Asia/Australia
                        );
                        if (!isLand && Math.random() > 0.05) return null;
                        return (
                            <rect
                                key={i}
                                x={x} y={y}
                                width="3" height="3"
                                className={`${isLand ? 'fill-slate-600' : 'fill-slate-900'} opacity-40`}
                                rx="1"
                            />
                        );
                    })}
                </svg>
            </div>

            {/* Active Scanning Arc Scan Line */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent w-1/3 skew-x-12 h-full z-10 pointer-events-none"
                animate={{ left: ['-50%', '150%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />

            {/* Simulated Activity Pings */}
            <AnimatePresence>
                {pings.map(ping => (
                    <motion.div
                        key={ping.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
                        exit={{ scale: 2, opacity: 0 }}
                        className="absolute z-20"
                        style={{
                            left: `${ping.x}%`,
                            top: `${ping.y}%`,
                        }}
                    >
                        <div className="relative">
                            <motion.div
                                className="w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-20"
                                style={{ color: ping.color }}
                                animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                                transition={{ duration: 1.5 }}
                            />
                            <div
                                className="w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_15px_currentcolor]"
                                style={{ backgroundColor: ping.color, color: ping.color }}
                            />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Map UI Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between z-30 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Global Sentinel Active</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-1">Threat Topology</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time edge telemetry</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="p-3 bg-slate-900/80 border border-white/5 rounded-xl backdrop-blur-md">
                            <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Active Clusters</div>
                            <div className="text-xl font-black text-white leading-none">{activity.length}</div>
                        </div>
                        <div className="p-3 bg-slate-900/80 border border-white/5 rounded-xl backdrop-blur-md">
                            <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Nodes Online</div>
                            <div className="text-xl font-black text-violet-400 leading-none">94.2%</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Infiltration</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-600 shadow-[0_0_8px_#8b5cf6]" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocol Anomaly</span>
                        </div>
                    </div>

                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
                        Map Revision: 4.2.0-SENTINEL
                    </div>
                </div>
            </div>

            {/* Corner Scan VFX */}
            <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-violet-500/20 rounded-tl-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-violet-500/20 rounded-br-3xl pointer-events-none" />
        </div>
    );
};

export default ThreatMap;
