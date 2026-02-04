const logger = require('../utils/logger');

/**
 * DGA (Domain Generation Algorithm) Detector
 * Detects algorithmically generated domains commonly used by malware for C2
 */
class DGADetector {
    constructor() {
        // Common TLDs used by legitimate domains
        this.legitimateTLDs = [
            'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
            'co', 'io', 'ai', 'app', 'dev', 'tech'
        ];

        // Suspicious TLDs often used by malware
        this.suspiciousTLDs = [
            'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'work',
            'click', 'link', 'pw', 'cc', 'ws', 'biz', 'info'
        ];

        // Common dictionary words (subset for performance)
        this.commonWords = new Set([
            'google', 'facebook', 'amazon', 'microsoft', 'apple',
            'twitter', 'youtube', 'instagram', 'linkedin', 'github',
            'mail', 'cloud', 'server', 'api', 'app', 'web', 'site',
            'secure', 'login', 'account', 'user', 'admin', 'support'
        ]);

        // Known DGA families patterns
        this.dgaPatterns = {
            conficker: /^[a-z]{6,12}\.(com|net|org|info|biz)$/,
            cryptolocker: /^[a-z]{12,16}\.(com|net|org|co\.uk|ru)$/,
            matsnu: /^[a-z]{8}[0-9]{2}\.(com|net)$/,
            suppobox: /^[a-z]{8,20}\.(com|net|org)$/
        };
    }

    /**
     * Analyze a domain for DGA characteristics
     * @param {string} domain - Domain to analyze
     * @returns {object} - DGA analysis result
     */
    analyzeDomain(domain) {
        try {
            // Parse domain
            const parsed = this.parseDomain(domain);
            if (!parsed) {
                return {
                    isDGA: false,
                    score: 0,
                    confidence: 0,
                    error: 'Invalid domain format'
                };
            }

            const { subdomain, sld, tld } = parsed;
            const fullDomain = subdomain ? `${subdomain}.${sld}` : sld;

            // Calculate various DGA indicators
            const indicators = {
                entropy: this.calculateDomainEntropy(fullDomain),
                consonantRatio: this.calculateConsonantRatio(fullDomain),
                digitRatio: this.calculateDigitRatio(fullDomain),
                lengthScore: this.calculateLengthScore(fullDomain),
                dictionaryScore: this.calculateDictionaryScore(fullDomain),
                tldScore: this.calculateTLDScore(tld),
                patternMatch: this.matchKnownDGAPatterns(domain)
            };

            // Calculate overall DGA probability
            const dgaScore = this.calculateDGAScore(indicators);
            const isDGA = dgaScore > 50;

            const result = {
                isDGA: isDGA,
                score: dgaScore,
                confidence: this.calculateConfidence(indicators),
                domain: domain,
                parsed: parsed,
                indicators: indicators,
                reasons: this.generateReasons(indicators),
                recommendation: isDGA ? 'Block or investigate' : 'Likely legitimate'
            };

            logger.info('DGA analysis completed', {
                domain: domain,
                isDGA: isDGA,
                score: dgaScore
            });

            return result;

        } catch (error) {
            logger.error('DGA analysis failed', {
                error: error.message,
                domain: domain
            });
            return {
                isDGA: false,
                score: 0,
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Parse domain into components
     */
    parseDomain(domain) {
        // Remove protocol if present
        domain = domain.replace(/^https?:\/\//, '');

        // Remove path if present
        domain = domain.split('/')[0];

        // Remove port if present
        domain = domain.split(':')[0];

        // Split into parts
        const parts = domain.toLowerCase().split('.');

        if (parts.length < 2) {
            return null;
        }

        const tld = parts[parts.length - 1];
        const sld = parts[parts.length - 2];
        const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : null;

        return { subdomain, sld, tld, fullDomain: domain };
    }

    /**
     * Calculate Shannon entropy of domain
     */
    calculateDomainEntropy(domain) {
        const freq = {};
        for (const char of domain) {
            freq[char] = (freq[char] || 0) + 1;
        }

        let entropy = 0;
        const len = domain.length;

        for (const count of Object.values(freq)) {
            const p = count / len;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    }

    /**
     * Calculate ratio of consonants to total letters
     */
    calculateConsonantRatio(domain) {
        const letters = domain.replace(/[^a-z]/gi, '');
        if (letters.length === 0) return 0;

        const consonants = letters.replace(/[aeiou]/gi, '');
        return consonants.length / letters.length;
    }

    /**
     * Calculate ratio of digits to total characters
     */
    calculateDigitRatio(domain) {
        const digits = domain.replace(/[^0-9]/g, '');
        return domain.length > 0 ? digits.length / domain.length : 0;
    }

    /**
     * Score based on domain length
     */
    calculateLengthScore(domain) {
        const len = domain.length;

        // Very short or very long domains are suspicious
        if (len < 5) return 20;
        if (len > 25) return 30;
        if (len >= 12 && len <= 18) return 40; // Common DGA length
        return 0;
    }

    /**
     * Check if domain contains dictionary words
     */
    calculateDictionaryScore(domain) {
        const domainLower = domain.toLowerCase();

        // Check for common words
        for (const word of this.commonWords) {
            if (domainLower.includes(word)) {
                return -30; // Likely legitimate
            }
        }

        // Check for pronounceable patterns
        const vowelPattern = /[aeiou]/i;
        const hasVowels = vowelPattern.test(domain);

        if (!hasVowels && domain.length > 6) {
            return 40; // No vowels in long domain = suspicious
        }

        return 0;
    }

    /**
     * Score based on TLD
     */
    calculateTLDScore(tld) {
        if (this.suspiciousTLDs.includes(tld)) {
            return 30;
        }
        if (this.legitimateTLDs.includes(tld)) {
            return -10;
        }
        return 10; // Unknown TLD
    }

    /**
     * Match against known DGA patterns
     */
    matchKnownDGAPatterns(domain) {
        const parts = domain.toLowerCase().split('.');
        if (parts.length < 2) return { matched: false, score: 0 };

        const sld = parts[parts.length - 2];

        // If sld is a common word, it's very unlikely to be DGA
        if (this.commonWords.has(sld)) {
            return { matched: false, score: 0 };
        }

        for (const [family, pattern] of Object.entries(this.dgaPatterns)) {
            if (pattern.test(domain)) {
                return {
                    matched: true,
                    family: family,
                    score: 100
                };
            }
        }
        return {
            matched: false,
            score: 0
        };
    }

    /**
     * Calculate overall DGA score
     */
    calculateDGAScore(indicators) {
        let score = 0;

        // Known DGA pattern match = instant high score
        if (indicators.patternMatch.matched) {
            return 95;
        }

        // High entropy (random-looking)
        if (indicators.entropy > 3.5) {
            score += 30;
        } else if (indicators.entropy > 3.0) {
            score += 15;
        }

        // High consonant ratio (unpronounceable)
        if (indicators.consonantRatio > 0.7) {
            score += 25;
        } else if (indicators.consonantRatio > 0.6) {
            score += 10;
        }

        // Digits in domain
        if (indicators.digitRatio > 0.2) {
            score += 20;
        }

        // Add other scores
        score += indicators.lengthScore;
        score += indicators.dictionaryScore;
        score += indicators.tldScore;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate confidence in DGA detection
     */
    calculateConfidence(indicators) {
        // Higher confidence if multiple indicators agree
        let confidence = 0.5;

        if (indicators.patternMatch.matched) {
            confidence = 0.95;
        } else {
            const highIndicators = [
                indicators.entropy > 3.5,
                indicators.consonantRatio > 0.7,
                indicators.digitRatio > 0.2,
                indicators.tldScore > 20
            ].filter(Boolean).length;

            confidence = 0.5 + (highIndicators * 0.1);
        }

        return Math.min(0.95, confidence);
    }

    /**
     * Generate human-readable reasons
     */
    generateReasons(indicators) {
        const reasons = [];

        if (indicators.patternMatch.matched) {
            reasons.push(`Matches known DGA family: ${indicators.patternMatch.family}`);
        }

        if (indicators.entropy > 3.5) {
            reasons.push(`High entropy (${indicators.entropy.toFixed(2)}): Random-looking domain`);
        }

        if (indicators.consonantRatio > 0.7) {
            reasons.push(`High consonant ratio (${(indicators.consonantRatio * 100).toFixed(0)}%): Unpronounceable`);
        }

        if (indicators.digitRatio > 0.2) {
            reasons.push(`Contains digits (${(indicators.digitRatio * 100).toFixed(0)}%)`);
        }

        if (indicators.tldScore > 20) {
            reasons.push('Suspicious TLD');
        }

        if (indicators.dictionaryScore < 0) {
            reasons.push('Contains common dictionary words (likely legitimate)');
        }

        return reasons;
    }

    /**
     * Batch analyze multiple domains
     */
    analyzeDomains(domains) {
        return domains.map(domain => this.analyzeDomain(domain));
    }
}

// Singleton instance
const dgaDetector = new DGADetector();

module.exports = {
    DGADetector,
    dgaDetector,
    analyzeDomain: (domain) => dgaDetector.analyzeDomain(domain),
    analyzeDomains: (domains) => dgaDetector.analyzeDomains(domains)
};
