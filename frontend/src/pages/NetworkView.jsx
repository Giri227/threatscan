import React from 'react';
import { motion } from 'framer-motion';
import { Network, AlertCircle } from 'lucide-react';

export default function NetworkView() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-wider">Network Analysis</h1>
                <p className="text-slate-400 text-sm md:text-base">Analyze network traffic and PCAP files</p>
            </motion.div>

            {/* Coming Soon */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-12 border border-slate-700 text-center"
            >
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-6"
                >
                    <Network className="w-10 h-10 text-purple-400" />
                </motion.div>

                <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">Network Analysis</h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Upload PCAP files to analyze network traffic patterns, detect anomalies, and identify suspicious connections.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    Coming Soon
                </div>
            </motion.div>
        </div>
    );
}
