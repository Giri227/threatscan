const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Handle ping request for speedtest
 */
exports.ping = (req, res) => {
    res.json({ timestamp: Date.now() });
};

/**
 * Handle download request - streams random data to measure speed
 */
exports.download = (req, res) => {
    const size = parseInt(req.query.size) || 1024 * 1024 * 5; // Default 5MB
    const buffer = crypto.randomBytes(16384); // 16KB chunk
    let sent = 0;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', size);

    const sendChunk = () => {
        while (sent < size) {
            const remaining = size - sent;
            const chunk = remaining < buffer.length ? buffer.subarray(0, remaining) : buffer;
            const canContinue = res.write(chunk);
            sent += chunk.length;
            if (!canContinue) {
                res.once('drain', sendChunk);
                return;
            }
        }
        res.end();
    };

    sendChunk();
};

/**
 * Handle upload request - receives data to measure speed
 */
exports.upload = (req, res) => {
    let size = 0;
    req.on('data', (chunk) => {
        size += chunk.length;
    });
    req.on('end', () => {
        res.json({ size, status: 'ok' });
    });
};
