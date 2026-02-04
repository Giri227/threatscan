import React from 'react'
import { Search, Bell, User, Zap, Activity, ShieldAlert } from 'lucide-react'

export default function TopSummaryBar() {
    return (
        <header className="h-20 bg-[#050711] border-b border-white/5 flex items-center justify-between px-10 z-10">
            <div className="flex items-center gap-12">
                <SummaryMetric label="Scan Efficiency" value="99.4%" trend="+0.2" />
                <SummaryMetric label="Avg Threat Score" value="12.5" trend="-2.1" sub="Nominal" />
                <SummaryMetric label="Local Nodes" value="48/50" sub="8 Offline" />
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search fingerprints..."
                        className="bg-[#0b1020] border border-white/5 rounded-full py-2 pl-10 pr-4 text-xs text-gray-400 focus:outline-none focus:border-[#00ffc844] focus:ring-1 focus:ring-[#00ffc822] transition-all w-64"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>

                <button className="p-2.5 bg-[#0b1020] border border-white/5 rounded-xl hover:bg-white/5 transition-colors relative">
                    <Bell size={18} className="text-gray-400" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050711]"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                    <div className="text-right">
                        <p className="text-sm font-bold text-white leading-none">Admin Analyst</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Super User</p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00ffc822] to-[#00d2ff22] rounded-xl border border-white/10 flex items-center justify-center">
                        <User size={20} className="text-[#00ffc8]" />
                    </div>
                </div>
            </div>
        </header>
    )
}

function SummaryMetric({ label, value, trend, sub }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight">{value}</span>
                {trend && (
                    <span className={`text-[10px] font-black ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {trend}%
                    </span>
                )}
                {sub && <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{sub}</span>}
            </div>
        </div>
    )
}
