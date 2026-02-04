const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || 52428800);

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        logger.error('Failed to create upload directory', { error: error.message });
        throw error;
    }
}

// Sanitize filename to prevent directory traversal
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 255);
}

// Generate secure file path
function generateSecureFilePath(originalFilename) {
    const sanitized = sanitizeFilename(originalFilename);
    const uniqueId = uuidv4().substring(0, 8);
    const filename = `${uniqueId}-${sanitized}`;
    return path.join(UPLOAD_DIR, filename);
}

// Validate file before processing
async function validateFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        
        if (stats.size > MAX_FILE_SIZE) {
            throw new Error(`File size ${stats.size} exceeds maximum ${MAX_FILE_SIZE}`);
        }
        
        if (!stats.isFile()) {
            throw new Error('Path is not a file');
        }
        
        return stats;
    } catch (error) {
        logger.error('File validation failed', { filePath, error: error.message });
        throw error;
    }
}

// Clean up file after processing
async function cleanupFile(filePath) {
    try {
        await fs.unlink(filePath);
        logger.info('File cleaned up', { filePath });
    } catch (error) {
        logger.warn('Failed to cleanup file', { filePath, error: error.message });
    }
}

// Get file hash
async function getFileHash(filePath) {
    const crypto = require('crypto');
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
    ensureUploadDir,
    sanitizeFilename,
    generateSecureFilePath,
    validateFile,
    cleanupFile,
    getFileHash,
    UPLOAD_DIR,
    MAX_FILE_SIZE
};
