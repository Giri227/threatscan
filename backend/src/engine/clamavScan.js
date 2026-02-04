const { execFile } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');
const execFilePromise = util.promisify(execFile);

/**
 * Scans a file using ClamAV (clamscan or clamdscan)
 * @param {string} filePath - Path to the file to scan
 * @returns {Promise<object>} - Scan results
 */
async function clamavScan(filePath) {
    try {
        if (process.env.CLAMAV_ENABLED === 'false') {
            return { status: 'unavailable', score: 0, details: 'ClamAV disabled' };
        }

        const path = require('path');
        const binRoot = path.join(__dirname, '..', '..', '..', 'bin', 'clamav');
        const binPath = path.join(binRoot, 'clamav-1.4.2.win.x64', 'clamscan.exe');
        const dbPath = path.join(binRoot, 'db');

        let command = 'clamdscan';
        let args = ['--no-summary'];

        // Check if portable clamscan exists
        const fs = require('fs');
        if (fs.existsSync(binPath)) {
            command = binPath; // Use absolute path directly, execFile handles spaces
            if (fs.existsSync(dbPath)) {
                args.push('-d', dbPath);
            }
        } else {
            try {
                await execFilePromise('clamdscan', ['--version']);
            } catch {
                command = 'clamscan';
            }
        }

        args.push(filePath);

        const { stdout, stderr } = await execFilePromise(command, args, { timeout: 30000 });
        logger.info('ClamAV scan completed', { filePath, command });

        // ClamScan exit codes: 0 = clean, 1 = infected, 2 = error
        return parseOutput(stdout, false);
    } catch (error) {
        // Error code 1 means infected
        if (error.code === 1) {
            logger.info('ClamAV detected infection', { filePath });
            return parseOutput(error.stdout, true);
        }

        // Error code 2 or command not found means error/unavailable
        let errorMsg = error.message;
        if (error.message.includes('ENOENT')) {
            errorMsg = 'ClamAV binary (clamscan/clamdscan) not found in system path.';
        }

        logger.warn('ClamAV scan failed', { filePath, error: errorMsg });
        return {
            status: 'unavailable',
            error: errorMsg,
            score: 0
        };
    }
}

function parseOutput(stdout, isInfected) {
    // Example output: /path/to/file: Eicar-Signature FOUND
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    if (isInfected) {
        const parts = lastLine.split(':');
        const signature = parts[1] ? parts[1].replace('FOUND', '').trim() : 'Unknown Signature';
        return {
            status: 'infected',
            signature: signature,
            score: 100
        };
    }

    return {
        status: 'clean',
        signature: null,
        score: 0
    };
}

module.exports = clamavScan;
