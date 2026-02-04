const logger = require('../utils/logger');

/**
 * Context-Aware Scoring System
 * Adjusts threat scores based on context (source, file type, historical data, temporal factors)
 */
class ContextAwareScoring {
    constructor() {
        // Context-based weight adjustments
        this.contextWeights = {
            source: {
                email_attachment: 1.3,      // Higher risk
                download: 1.2,
                usb_drive: 1.4,             // Very high risk
                network_share: 1.1,
                user_upload: 1.0,           // Baseline
                internal_system: 0.8,       // Lower risk
                trusted_source: 0.6         // Much lower risk
            },

            fileType: {
                executable: 1.3,
                script: 1.2,
                office_macro: 1.4,
                archive: 1.1,
                document: 0.9,
                image: 0.7,
                text: 0.6
            },

            userRole: {
                admin: 1.3,                 // Higher impact if compromised
                developer: 1.2,
                standard_user: 1.0,
                guest: 0.9
            },

            timeOfDay: {
                business_hours: 0.9,        // More expected
                after_hours: 1.2,           // More suspicious
                weekend: 1.3                // Even more suspicious
            }
        };

        // Historical context cache (in-memory, should use database in production)
        this.historicalCache = new Map();
        this.cacheMaxSize = 1000;
        this.cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    /**
     * Calculate context-aware score
     * @param {number} baseScore - Base risk score from engines
     * @param {object} context - Context information
     * @param {object} results - Analysis results from all engines
     * @returns {object} - Adjusted score with context details
     */
    calculateContextualScore(baseScore, context = {}, results = {}) {
        try {
            let adjustedScore = baseScore;
            const adjustments = [];

            // 1. Source context
            if (context.source) {
                const sourceWeight = this.contextWeights.source[context.source] || 1.0;
                adjustedScore *= sourceWeight;
                adjustments.push({
                    factor: 'source',
                    value: context.source,
                    weight: sourceWeight,
                    impact: ((sourceWeight - 1) * 100).toFixed(0) + '%'
                });
            }

            // 2. File type context
            if (context.fileType) {
                const fileTypeWeight = this.contextWeights.fileType[context.fileType] || 1.0;
                adjustedScore *= fileTypeWeight;
                adjustments.push({
                    factor: 'fileType',
                    value: context.fileType,
                    weight: fileTypeWeight,
                    impact: ((fileTypeWeight - 1) * 100).toFixed(0) + '%'
                });
            }

            // 3. User role context
            if (context.userRole) {
                const roleWeight = this.contextWeights.userRole[context.userRole] || 1.0;
                adjustedScore *= roleWeight;
                adjustments.push({
                    factor: 'userRole',
                    value: context.userRole,
                    weight: roleWeight,
                    impact: ((roleWeight - 1) * 100).toFixed(0) + '%'
                });
            }

            // 4. Temporal context
            const temporalWeight = this.calculateTemporalWeight(context.timestamp);
            adjustedScore *= temporalWeight;
            adjustments.push({
                factor: 'temporal',
                value: this.getTimeCategory(context.timestamp),
                weight: temporalWeight,
                impact: ((temporalWeight - 1) * 100).toFixed(0) + '%'
            });

            // 5. Historical context
            const historicalAdjustment = this.getHistoricalAdjustment(context.hash, results);
            adjustedScore += historicalAdjustment.scoreAdjustment;
            if (historicalAdjustment.scoreAdjustment !== 0) {
                adjustments.push({
                    factor: 'historical',
                    value: historicalAdjustment.reason,
                    weight: 1.0,
                    impact: historicalAdjustment.scoreAdjustment > 0 ? `+${historicalAdjustment.scoreAdjustment}` : historicalAdjustment.scoreAdjustment
                });
            }

            // 6. Behavioral context (if available)
            if (results.behavioral) {
                const behavioralWeight = this.calculateBehavioralWeight(results.behavioral);
                adjustedScore *= behavioralWeight;
                adjustments.push({
                    factor: 'behavioral',
                    value: results.behavioral.threatType?.join(', ') || 'Unknown',
                    weight: behavioralWeight,
                    impact: ((behavioralWeight - 1) * 100).toFixed(0) + '%'
                });
            }

            // Cap score at 0-100
            adjustedScore = Math.max(0, Math.min(100, adjustedScore));

            // Update historical cache
            if (context.hash) {
                this.updateHistoricalCache(context.hash, adjustedScore, results);
            }

            logger.info('Context-aware scoring completed', {
                baseScore: baseScore,
                adjustedScore: adjustedScore.toFixed(2),
                adjustments: adjustments.length
            });

            return {
                baseScore: baseScore,
                adjustedScore: Math.round(adjustedScore),
                adjustments: adjustments,
                context: context,
                explanation: this.generateExplanation(baseScore, adjustedScore, adjustments)
            };

        } catch (error) {
            logger.error('Context-aware scoring failed', { error: error.message });
            return {
                baseScore: baseScore,
                adjustedScore: baseScore,
                error: error.message
            };
        }
    }

    /**
     * Calculate temporal weight based on time of day
     */
    calculateTemporalWeight(timestamp) {
        if (!timestamp) return 1.0;

        const date = new Date(timestamp);
        const hour = date.getHours();
        const day = date.getDay();

        // Weekend
        if (day === 0 || day === 6) {
            return this.contextWeights.timeOfDay.weekend;
        }

        // After hours (before 8 AM or after 6 PM)
        if (hour < 8 || hour >= 18) {
            return this.contextWeights.timeOfDay.after_hours;
        }

        // Business hours
        return this.contextWeights.timeOfDay.business_hours;
    }

    /**
     * Get time category for display
     */
    getTimeCategory(timestamp) {
        if (!timestamp) return 'unknown';

        const date = new Date(timestamp);
        const hour = date.getHours();
        const day = date.getDay();

        if (day === 0 || day === 6) return 'weekend';
        if (hour < 8 || hour >= 18) return 'after_hours';
        return 'business_hours';
    }

    /**
     * Get historical adjustment based on previous scans
     */
    getHistoricalAdjustment(hash, results) {
        if (!hash) {
            return { scoreAdjustment: 0, reason: 'No hash available' };
        }

        const historical = this.historicalCache.get(hash);

        if (!historical) {
            return { scoreAdjustment: 0, reason: 'First time seen' };
        }

        const timeSinceLastSeen = Date.now() - historical.lastSeen;
        const daysSinceLastSeen = timeSinceLastSeen / (1000 * 60 * 60 * 24);

        // If seen recently and was malicious, increase score
        if (historical.wasMalicious && daysSinceLastSeen < 7) {
            return {
                scoreAdjustment: 15,
                reason: `Previously flagged as malicious ${daysSinceLastSeen.toFixed(0)} days ago`
            };
        }

        // If seen recently and was safe, decrease score slightly
        if (!historical.wasMalicious && daysSinceLastSeen < 30) {
            return {
                scoreAdjustment: -10,
                reason: `Previously scanned as safe ${daysSinceLastSeen.toFixed(0)} days ago`
            };
        }

        return { scoreAdjustment: 0, reason: 'Historical data inconclusive' };
    }

    /**
     * Calculate behavioral weight
     */
    calculateBehavioralWeight(behavioral) {
        if (!behavioral || behavioral.status !== 'success') {
            return 1.0;
        }

        // High severity behaviors increase weight significantly
        if (behavioral.severity === 'critical') {
            return 1.5;
        } else if (behavioral.severity === 'high') {
            return 1.3;
        } else if (behavioral.severity === 'medium') {
            return 1.1;
        }

        return 1.0;
    }

    /**
     * Update historical cache
     */
    updateHistoricalCache(hash, score, results) {
        // Clean cache if too large
        if (this.historicalCache.size >= this.cacheMaxSize) {
            this.cleanCache();
        }

        this.historicalCache.set(hash, {
            lastSeen: Date.now(),
            score: score,
            wasMalicious: score > 50,
            scanCount: (this.historicalCache.get(hash)?.scanCount || 0) + 1,
            results: {
                engines: Object.keys(results).length,
                verdict: score > 75 ? 'malicious' : score > 30 ? 'suspicious' : 'safe'
            }
        });
    }

    /**
     * Clean old entries from cache
     */
    cleanCache() {
        const now = Date.now();
        const entriesToDelete = [];

        for (const [hash, data] of this.historicalCache.entries()) {
            if (now - data.lastSeen > this.cacheMaxAge) {
                entriesToDelete.push(hash);
            }
        }

        // Delete oldest 20% if no expired entries
        if (entriesToDelete.length === 0) {
            const entries = Array.from(this.historicalCache.entries());
            entries.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
            const deleteCount = Math.floor(entries.length * 0.2);

            for (let i = 0; i < deleteCount; i++) {
                entriesToDelete.push(entries[i][0]);
            }
        }

        for (const hash of entriesToDelete) {
            this.historicalCache.delete(hash);
        }

        logger.info('Historical cache cleaned', { deleted: entriesToDelete.length });
    }

    /**
     * Generate explanation of score adjustments
     */
    generateExplanation(baseScore, adjustedScore, adjustments) {
        const diff = adjustedScore - baseScore;
        const direction = diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'unchanged';

        let explanation = `Score ${direction} from ${baseScore.toFixed(0)} to ${adjustedScore.toFixed(0)} based on context:\n`;

        for (const adj of adjustments) {
            explanation += `- ${adj.factor}: ${adj.value} (${adj.impact} impact)\n`;
        }

        return explanation;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.historicalCache.size,
            maxSize: this.cacheMaxSize,
            maxAge: this.cacheMaxAge / (1000 * 60 * 60 * 24) + ' days'
        };
    }
}

// Singleton instance
const contextAwareScoring = new ContextAwareScoring();

module.exports = {
    ContextAwareScoring,
    contextAwareScoring,
    calculateContextualScore: (baseScore, context, results) =>
        contextAwareScoring.calculateContextualScore(baseScore, context, results)
};
