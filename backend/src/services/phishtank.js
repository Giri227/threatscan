const axios = require('axios');
const logger = require('../utils/logger');

/**
 * PhishTank API Integration
 * PhishTank is a collaborative clearing house for phishing data
 * API Documentation: https://www.phishtank.com/api_info.php
 */
class PhishTankService {
    constructor() {
        this.apiKey = process.env.PHISHTANK_API_KEY || '';
        this.apiUrl = 'https://checkurl.phishtank.com/checkurl/';
        this.timeout = 10000; // 10 seconds
        this.useApi = !!this.apiKey; // Only use API if key is provided
    }

    /**
     * Check if a URL is a known phishing site
     * @param {string} url - URL to check
     * @returns {object} - PhishTank analysis result
     */
    async checkURL(url) {
        if (!this.useApi) {
            logger.warn('PhishTank: API key not configured, skipping check');
            return {
                found: false,
                error: 'API key not configured',
                score: 0,
                confidence: 0
            };
        }

        try {
            const formData = new URLSearchParams();
            formData.append('url', url);
            formData.append('format', 'json');
            formData.append('app_key', this.apiKey);

            const response = await axios.post(
                this.apiUrl,
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'ThreatScan/1.0'
                    },
                    timeout: this.timeout
                }
            );

            const data = response.data;

            if (data.results) {
                const result = data.results;

                if (result.in_database) {
                    // URL found in PhishTank database
                    const isPhishing = result.valid;

                    logger.info('PhishTank: URL found in database', {
                        url: url,
                        isPhishing: isPhishing,
                        verified: result.verified
                    });

                    return {
                        found: true,
                        malicious: isPhishing,
                        score: isPhishing ? 100 : 0,
                        confidence: result.verified ? 0.95 : 0.75,
                        details: {
                            phishId: result.phish_id,
                            phishDetailUrl: result.phish_detail_url,
                            submissionTime: result.submission_time,
                            verified: result.verified,
                            verifiedTime: result.verification_time,
                            online: result.online,
                            target: result.target
                        }
                    };
                } else {
                    // URL not in database
                    logger.info('PhishTank: URL not found in database', { url });
                    return {
                        found: false,
                        malicious: false,
                        score: 0,
                        confidence: 0.7,
                        details: {
                            message: 'URL not found in PhishTank database'
                        }
                    };
                }
            } else {
                logger.warn('PhishTank: Unexpected response format', { data });
                return {
                    found: false,
                    error: 'Unexpected response format',
                    score: 0,
                    confidence: 0
                };
            }

        } catch (error) {
            logger.error('PhishTank API request failed', {
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
     * Batch check multiple URLs (if supported by API plan)
     * @param {array} urls - Array of URLs to check
     * @returns {array} - Array of results
     */
    async checkURLs(urls) {
        const results = [];

        for (const url of urls) {
            const result = await this.checkURL(url);
            results.push({ url, ...result });

            // Rate limiting: wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Get PhishTank statistics
     * @returns {object} - Statistics about PhishTank database
     */
    getStats() {
        return {
            apiConfigured: this.useApi,
            apiUrl: this.apiUrl,
            timeout: this.timeout,
            note: 'PhishTank requires API key for URL checking'
        };
    }
}

// Singleton instance
const phishTankService = new PhishTankService();

module.exports = {
    PhishTankService,
    phishTankService,
    checkURL: (url) => phishTankService.checkURL(url),
    checkURLs: (urls) => phishTankService.checkURLs(urls)
};
