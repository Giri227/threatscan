import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function RiskScoreCard({ score, verdict, severity }) {
    const getColor = () => {
        if (score >= 75) return { bg: 'from-red-600 to-red-700', text: 'text-red-400', icon: AlertTriangle };
        if (score >= 50) return { bg: 'from-orange-600 to-orange-700', text: 'text-orange-400', icon: AlertCircle };
        if (score >= 30) return { bg: 'from-yellow-600 to-yellow-700', text: 'text-yellow-400', icon: AlertCircle };
        return { bg: 'from-green-600 to-green-700', text: 'text-green-400', icon: CheckCircle };
    };

    const colors = getColor();
    const Icon = colors.icon;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 border border-slate-700"
        >
            {/* Background glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-10`} />
            
            {/* Animated background elements */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full border border-slate-700 opacity-20"
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Risk Assessment</p>
                        <h3 className="text-3xl font-black text-white">{verdict}</h3>
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`p-4 rounded-full bg-gradient-to-br ${colors.bg}`}
                    >
                        <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                </div>

                {/* Score circle */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        {/* Background circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke="rgba(100, 116, 139, 0.2)"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 339.29 }}
                            animate={{ strokeDashoffset: 339.29 * (1 - score / 100) }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            strokeDasharray="339.29"
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={colors.bg.split(' ')[1]} />
                                <stop offset="100%" stopColor={colors.bg.split(' ')[3]} />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-4xl font-black text-white"
                            >
                                {score}
                            </motion.div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Risk Score</p>
                        </div>
                    </div>
                </div>

                {/* Severity badge */}
                <div className="flex justify-center">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                        severity === 'critical' ? 'bg-red-900 text-red-200' :
                        severity === 'high' ? 'bg-orange-900 text-orange-200' :
                        severity === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                    }`}>
                        {severity} Severity
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
