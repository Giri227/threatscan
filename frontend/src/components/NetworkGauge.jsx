import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';

const NetworkGauge = ({ value, maxValue = 100, label, active = false, color = '#8b5cf6', unit = "Mbps", download = 0, upload = 0 }) => {
    const percentage = Math.min(value / maxValue, 1);
    const radius = 90;
    const dashArray = 2 * Math.PI * radius;
    const dashOffset = dashArray * (1 - percentage);

    return (
        <div className="relative flex flex-col items-center justify-center group select-none scale-105">
            {/* Main Outer Structure with Cyan Halo */}
            <div className="relative w-72 h-72 flex items-center justify-center">

                {/* Outer Cyan Halo Ring (Image-accurate) */}
                <div className="absolute inset-0 rounded-full border-[10px] border-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.15)] pointer-events-none" />

                {/* SVG Gauge Layers */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="144"
                        cy="144"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(8, 145, 178, 0.1)"
                        strokeWidth="12"
                    />

                    <motion.circle
                        cx="144"
                        cy="144"
                        r={radius}
                        fill="transparent"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: dashArray }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ type: 'spring', stiffness: 40, damping: 12 }}
                        style={{
                            strokeDasharray: dashArray,
                            filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))'
                        }}
                    />

                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Side Markers */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <span className="text-[8px] font-black text-cyan-400">RY 1</span>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <span className="text-[8px] font-black text-cyan-400">RY 2</span>
                </div>

                {/* Inner Chamber */}
                <div className="absolute inset-6 rounded-full bg-slate-950/80 border border-white/5 flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-red-600/40 via-orange-500/10 to-transparent pointer-events-none" />

                    {/* Waveform */}
                    <div className="absolute inset-x-0 bottom-12 h-16 flex items-end justify-center gap-1 px-12 opacity-30">
                        {[...Array(15)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1.5 bg-blue-400 rounded-t-full"
                                animate={{ height: [`${20 + Math.random() * 80}%`, `${20 + Math.random() * 80}%`] }}
                                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: i * 0.1 }}
                            />
                        ))}
                    </div>

                    <motion.div className="flex flex-col items-center z-10" key={value}>
                        <span className="text-6xl font-black text-white tracking-widest leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{value}</span>
                        <span className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mt-1">{unit}</span>
                    </motion.div>

                    <div className="mt-6 flex gap-8 z-10">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 mb-0.5">
                                <ArrowDown size={10} className="text-cyan-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase">DOWN</span>
                            </div>
                            <span className="text-[12px] font-black text-white">{download || '0.0'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 mb-0.5">
                                <ArrowUp size={10} className="text-blue-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase">UP</span>
                            </div>
                            <span className="text-[12px] font-black text-white">{upload || '0.0'}</span>
                        </div>
                    </div>
                </div>

                {/* White Pointer Arrow */}
                <motion.div
                    className="absolute w-full h-full pointer-events-none"
                    animate={{ rotate: (360 * percentage) }}
                    transition={{ type: 'spring', stiffness: 40, damping: 12 }}
                >
                    <div
                        className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white drop-shadow-[0_0_10px_white]"
                        style={{ transform: 'rotate(180deg)' }}
                    />
                </motion.div>
            </div>
        </div>
    );
};

export default NetworkGauge;
