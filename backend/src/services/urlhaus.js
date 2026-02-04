const axios = require('axios');
const logger = require('../utils/logger');

/**
 * URLhaus API Integration
 * URLhaus is a project from abuse.ch to share malicious URLs
 * API Documentation: https://urlhaus-api.abuse.ch/
 */
class URLhausService {
    constructor() {
        this.apiUrl = 'https://urlhaus-api.abuse.ch/v1';
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Check if a URL is listed in URLhaus database
     * @param {string} url - URL to check
     * @returns {object} - URLhaus analysis result
     */
    async checkURL(url) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/url/`,
                `url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: this.timeout
                }
            );

            const data = response.data;

            if (data.query_status === 'ok') {
                // URL found in database
                const result = {
                    found: true,
                    malicious: true,
                    score: 100,
                    confidence: 0.95,
                    details: {
                        url: data.url,
                        urlStatus: data.url_status,
                        threat: data.threat,
                        tags: data.tags || [],
                        dateAdded: data.date_added,
                        reporter: data.reporter,
                        larted: data.larted,
                        takedownTimeSeconds: data.takedown_time_seconds
                    },
                    payloads: data.payloads || [],
                    blacklists: data.blacklists || {}
                };

                logger.info('URLhaus: URL found in database', {
                    url: url,
                    threat: data.threat,
                    status: data.url_status
                });

                return result;
            } else if (data.query_status === 'no_results') {
                // URL not in database (likely safe or unknown)
                logger.info('URLhaus: URL not found in database', { url });
                return {
                    found: false,
                    malicious: false,
                    score: 0,
                    confidence: 0.7,
                    details: {
                        message: 'URL not found in URLhaus database'
                    }
                };
            } else {
                // Invalid URL or other error
                logger.warn('URLhaus: Invalid query', { url, status: data.query_status });
                return {
                    found: false,
                    error: data.query_status,
                    score: 0,
                    confidence: 0
                };
            }

        } catch (error) {
            logger.error('URLhaus API request failed', {
                error: error.message,
                url: url
            });
            return {
                found: false,
                error: error.message,
                score: 0,
                confidence: 0
            };
        }
    }

    /**
     * Check if a hash is associated with malware in URLhaus
     * @param {string} hash - File hash (MD5, SHA256)
     * @returns {object} - URLhaus payload analysis
     */
    async checkHash(hash) {
        try {
            const hashType = hash.length === 32 ? 'md5_hash' : 'sha256_hash';

            const response = await axios.post(
                `${this.apiUrl}/payload/`,
                `${hashType}=${hash}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: this.timeout
                }
            );

            const data = response.data;

            if (data.query_status === 'ok') {
                const result = {
                    found: true,
                    malicious: true,
                    score: 100,
                    confidence: 0.95,
                    details: {
                        fileType: data.file_type,
                        fileSize: data.file_size,
                        signature: data.signature,
                        firstSeen: data.firstseen,
                        lastSeen: data.lastseen,
                        urlCount: data.url_count
                    },
                    urls: data.urls || [],
                    virustotal: data.virustotal
                };

                logger.info('URLhaus: Hash found in database', {
                    hash: hash,
                    signature: data.signature,
                    urlCount: data.url_count
                });

                return result;
            } else {
                logger.info('URLhaus: Hash not found in database', { hash });
                return {
                    found: false,
                    malicious: false,
                    score: 0,
                    confidence: 0.7
                };
            }

        } catch (error) {
            logger.error('URLhaus hash lookup failed', {
                error: error.message,
                hash: hash
            });
            return {
                found: false,
                error: error.message,
                score: 0,
                confidence: 0
            };
        }
    }

    /**
     * Get recent malware URLs from URLhaus
     * @param {number} limit - Number of results (max 1000)
     * @returns {array} - Recent malware URLs
     */
    async getRecentURLs(limit = 100) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/urls/recent/limit/${limit}/`,
                { timeout: this.timeout }
            );

            const data = response.data;

            if (data.query_status === 'ok') {
                logger.info('URLhaus: Retrieved recent URLs', { count: data.urls?.length || 0 });
                return data.urls || [];
            } else {
                logger.warn('URLhaus: Failed to retrieve recent URLs', { status: data.query_status });
                return [];
            }

        } catch (error) {
            logger.error('URLhaus recent URLs request failed', { error: error.message });
            return [];
        }
    }

    /**
     * Download URLhaus feed for offline analysis
     * @returns {object} - Feed data
     */
    async downloadFeed() {
        try {
            const response = await axios.get(
                'https://urlhaus.abuse.ch/downloads/csv_recent/',
                { timeout: 30000 } // 30 seconds for feed download
            );

            logger.info('URLhaus: Feed downloaded successfully');
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            logger.error('URLhaus feed download failed', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Singleton instance
const urlhausService = new URLhausService();

module.exports = {
    URLhausService,
    urlhausService,
    checkURL: (url) => urlhausService.checkURL(url),
    checkHash: (hash) => urlhausService.checkHash(hash),
    getRecentURLs: (limit) => urlhausService.getRecentURLs(limit)
};
