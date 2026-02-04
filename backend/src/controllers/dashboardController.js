const { getSystemStats } = require('../services/systemStats.js');
const FileScan = require('../models/FileScan.js');
const URLScan = require('../models/URLScan.js');
const abuseIPDB = require('../services/abuseIPDB');

const getDashboardIntelligence = async (req, res) => {
    // Initial safe defaults
    let systemStats = {
        cpu: { load: 0, user: 0, system: 0 },
        memory: { total: 0, used: 0, free: 0, usedPercentage: 0 },
        network: { rx_sec: 0, tx_sec: 0 },
        uptime: 0
    };
    let activityFeed = [];
    let trends = { totalScans24h: 0, threatsDetected24h: 0, fileThreats: 0, urlThreats: 0 };

    try {
        // 1. Fetch Real System Stats
        try {
            systemStats = await getSystemStats();
        } catch (err) {
            console.warn('System Stats Failed:', err.message);
        }

        // 2. Fetch GLOBAL Threat Intelligence (Abuse.ch) for Cyber War Room feel
        let globalThreats = [];
        try {
            const threats = await abuseIPDB.getLatestThreats();
            globalThreats = threats.slice(0, 15).map(t => ({
                type: 'GLOBAL_INTERCEPT',
                source: t.malware_family || 'Dark Web Signal',
                severity: 'critical',
                timestamp: t.first_seen + ' UTC',
                details: {
                    hash: t.hash.substring(0, 12) + '...',
                    tags: t.tags
                }
            }));
        } catch (e) {
            console.warn('Global Threat Feed unavailable');
        }

        // 3. Fetch LOCAL User Activity
        let localActivity = [];
        try {
            if (FileScan && FileScan.db && FileScan.db.readyState === 1) {
                const [recentFiles, recentUrls] = await Promise.all([
                    FileScan.find().sort({ createdAt: -1 }).limit(5).maxTimeMS(2000),
                    URLScan.find().sort({ createdAt: -1 }).limit(5).maxTimeMS(2000)
                ]);

                localActivity = [
                    ...recentFiles.map(scan => ({
                        type: 'LOCAL_DEFENSE', source: scan.filename, severity: scan.malicious ? 'high' : 'low',
                        timestamp: scan.createdAt, details: { verdict: scan.verdict }
                    })),
                    ...recentUrls.map(scan => ({
                        type: 'URL_ANALYSIS', source: scan.url, severity: scan.malicious ? 'high' : 'low',
                        timestamp: scan.createdAt, details: { verdict: scan.verdict }
                    }))
                ];

                // Calculate Trends
                const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const [fThreats, uThreats, fTotal, uTotal] = await Promise.all([
                    FileScan.countDocuments({ createdAt: { $gte: ONE_DAY_AGO }, malicious: true }),
                    URLScan.countDocuments({ createdAt: { $gte: ONE_DAY_AGO }, malicious: true }),
                    FileScan.countDocuments({ createdAt: { $gte: ONE_DAY_AGO } }),
                    URLScan.countDocuments({ createdAt: { $gte: ONE_DAY_AGO } })
                ]);

                trends = {
                    totalScans24h: fTotal + uTotal,
                    threatsDetected24h: fThreats + uThreats,
                    fileThreats: fThreats,
                    urlThreats: uThreats
                };
            }
        } catch (dbErr) {
            console.warn('Local DB Ops Failed:', dbErr.message);
        }

        // Merge Global + Local (Priority to Local)
        activityFeed = [...localActivity, ...globalThreats]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

        res.json({ system: systemStats, activity: activityFeed, trends });

    } catch (criticalError) {
        console.error('Critical Dashboard Failure:', criticalError);
        res.json({
            system: systemStats,
            activity: [],
            trends: { totalScans24h: 0, threatsDetected24h: 0, fileThreats: 0, urlThreats: 0 }
        });
    }
};

module.exports = { getDashboardIntelligence };
