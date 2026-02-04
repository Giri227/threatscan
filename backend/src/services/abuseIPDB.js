const axios = require('axios');
const logger = require('../utils/logger');

class AbuseIPDB {
    constructor() {
        // These are FREE endpoints - no API key needed!
        this.endpoints = {
            malwareBazaar: 'https://mb-api.abuse.ch/api/v1/',
            urlhaus: 'https://urlhaus-api.abuse.ch/v1/url/',
            threatFox: 'https://threatfox-api.abuse.ch/api/v1/'
        };

        this.cache = new Map();
        this.cacheExpiry = 3600000; // 1 hour
    }

    async checkHash(hash) {
        // Check cache
        const cached = this.cache.get(`hash_${hash}`);
        if (cached && Date.now() - cached.time < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const formData = new URLSearchParams();
            formData.append('query', 'get_info');
            formData.append('hash', hash);

            const response = await axios.post(this.endpoints.malwareBazaar, formData, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const result = {
                found: response.data.query_status === 'ok',
                malicious: response.data.query_status === 'ok',
                score: response.data.query_status === 'ok' ? 100 : 0,
                malware_family: response.data.data?.[0]?.signature || null,
                first_seen: response.data.data?.[0]?.first_seen || null,
                tags: response.data.data?.[0]?.tags || []
            };

            this.cache.set(`hash_${hash}`, { data: result, time: Date.now() });
            logger.info('AbuseIPDB hash lookup', { hash: hash.substring(0, 8), found: result.found });

            return result;
        } catch (error) {
            logger.warn('AbuseIPDB lookup failed', { error: error.message });
            return { found: false, malicious: false, score: 0 };
        }
    }

    async checkURL(url) {
        try {
            const formData = new URLSearchParams();
            formData.append('url', url);

            const response = await axios.post(this.endpoints.urlhaus, formData, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
            );

            return {
                malicious: response.data.query_status === 'ok',
                score: response.data.query_status === 'ok' ? 100 : 0,
                threat_type: response.data.threat || 'none',
                blacklists: response.data.blacklists || {},
                tags: response.data.tags || []
            };
        } catch (error) {
            logger.warn('URLHaus lookup failed', { error: error.message });
            return { malicious: false, score: 0 };
        }
    }

    async getLatestThreats() {
        try {
            // Get last 100 samples for dashboard
            const formData = new URLSearchParams();
            formData.append('query', 'get_recent');
            formData.append('selector', '100');

            const response = await axios.post(this.endpoints.malwareBazaar, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000
            });

            if (response.data.query_status === 'ok') {
                return response.data.data.map(item => ({
                    hash: item.sha256_hash,
                    type: item.file_type,
                    malware_family: item.signature || 'Generic Malware',
                    first_seen: item.first_seen,
                    size: item.file_size,
                    tags: item.tags || []
                }));
            }
            return [];
        } catch (error) {
            logger.warn('Failed to fetch latest threats', { error: error.message });
            return [];
        }
    }
}

module.exports = new AbuseIPDB();
