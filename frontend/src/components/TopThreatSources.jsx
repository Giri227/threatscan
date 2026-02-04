import React from 'react';

const TopThreatSources = ({ activity = [] }) => {
    // Calculate top sources from activity feed
    const sourceCounts = activity.reduce((acc, curr) => {
        acc[curr.source] = (acc[curr.source] || 0) + 1;
        return acc;
    }, {});

    const sortedSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    const maxCount = sortedSources[0]?.[1] || 1;

    const threats = sortedSources.length > 0 ? sortedSources.map(([ip, count]) => ({
        ip,
        count,
        progress: Math.round((count / maxCount) * 100)
    })) : []; // Empty state handling

    if (threats.length === 0) {
        return (
            <div className="soc-card h-full p-6 flex flex-col items-center justify-center text-slate-500">
                <span className="text-xs font-bold uppercase tracking-widest">No Active Threats</span>
            </div>
        );
    }

    return (
        <div className="soc-card h-full p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Top Threat Sources</h3>
                <button className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors">View all</button>
            </div>

            <div className="space-y-6">
                {threats.map((threat, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-300 truncate max-w-[150px]" title={threat.ip}>{threat.ip}</span>
                            <span className="text-[11px] font-black text-white">{threat.count}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-600 to-purple-400 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                                style={{ width: `${threat.progress}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopThreatSources;
