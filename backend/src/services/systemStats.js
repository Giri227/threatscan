const systeminformation = require('systeminformation');
const os = require('os');

const getSystemStats = async () => {
    try {
        let cpu = {}, mem = {}, network = [], time = {};

        // Try getting robust stats from systeminformation
        try {
            [cpu, mem, network, time] = await Promise.all([
                systeminformation.currentLoad().catch(() => ({})),
                systeminformation.mem().catch(() => ({})),
                systeminformation.networkStats().catch(() => []),
                systeminformation.time()
            ]);
        } catch (innerError) {
            console.warn('SystemInformation partial failure:', innerError);
        }

        // --- CPU Fallback Logic ---
        // si.currentLoad provides currentLoad (%). os.loadavg() provides an array.
        let cpuLoad = cpu.currentLoad || 0;
        if (!cpuLoad || cpuLoad === 0) {
            // Fallback: This is a rough approximation if SI fails.
            // On Windows, loadavg is always [0,0,0], so we might just stick to 0 or a randomized "heartbeat" value 
            // to show the server is alive if users prefer that over 0.
            // For now, let's strictly use valid data, but ensure we don't crash.
            // cpuLoad = Math.max(cpuLoad, Math.round(Math.random() * 5)); // DISABLED: User requested 100% accuracy.
            cpuLoad = 0;
        }

        // --- Memory Fallback Logic ---
        let totalMem = mem.total || os.totalmem();
        let freeMem = mem.free || os.freemem();
        let usedMem = totalMem - freeMem;

        // If mem.used is available from SI, use it, otherwise calc from OS
        if (mem.used && mem.total) {
            usedMem = mem.used;
        }

        const usedPercentage = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

        // --- Network Fallback Logic ---
        // If SI returns empty array, we report 0.
        // Calculated safely to avoid crashes.
        const netRx = Array.isArray(network) ? network.reduce((acc, iface) => acc + (iface.rx_sec || 0), 0) : 0;
        const netTx = Array.isArray(network) ? network.reduce((acc, iface) => acc + (iface.tx_sec || 0), 0) : 0;

        return {
            cpu: {
                load: Math.round(cpuLoad),
                user: Math.round(cpu.currentLoadUser || 0),
                system: Math.round(cpu.currentLoadSystem || 0)
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usedPercentage: usedPercentage
            },
            network: {
                rx_sec: netRx,
                tx_sec: netTx
            },
            uptime: time.uptime || os.uptime()
        };
    } catch (error) {
        console.error('Error fetching system stats:', error);
        // Absolute last resort fallback to prevent 500 API errors
        return {
            cpu: { load: 0, user: 0, system: 0 },
            memory: {
                total: os.totalmem(),
                used: os.totalmem() - os.freemem(),
                free: os.freemem(),
                usedPercentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            network: { rx_sec: 0, tx_sec: 0 },
            uptime: os.uptime()
        };
    }
};

module.exports = { getSystemStats };
