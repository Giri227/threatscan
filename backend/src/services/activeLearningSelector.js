const logger = require('../utils/logger');

/**
 * Active Learning Selector
 * Selects samples for human review based on uncertainty and similarity
 */
class ActiveLearningSelector {
    constructor() {
        this.reviewQueue = [];
        this.maxQueueSize = 100;
        this.reviewedSamples = new Map();

        // Thresholds
        this.uncertaintyThreshold = 0.5; // Low confidence triggers review
        this.disagreementThreshold = 0.3; // High disagreement triggers review
        this.similarityThreshold = 0.8; // High similarity to known cases
    }

    /**
     * Evaluate if sample should be reviewed
     * @param {object} scanResult - Scan result with predictions
     * @returns {object} - Review recommendation
     */
    async evaluateSample(scanResult) {
        try {
            const reasons = [];
            let priority = 0;
            let shouldReview = false;

            // 1. Uncertainty-based selection
            if (scanResult.confidence < this.uncertaintyThreshold) {
                reasons.push(`Low confidence (${(scanResult.confidence * 100).toFixed(1)}%)`);
                priority += 3;
                shouldReview = true;
            }

            // 2. Disagreement-based selection
            if (scanResult.disagreement && scanResult.disagreement.level === 'high') {
                reasons.push(`High disagreement between models`);
                priority += 4;
                shouldReview = true;
            }

            // 3. Borderline cases (score near threshold)
            if (scanResult.risk_score >= 45 && scanResult.risk_score <= 55) {
                reasons.push('Borderline risk score');
                priority += 2;
                shouldReview = true;
            }

            // 4. Evasion detected
            if (scanResult.evasion && scanResult.evasion.evasionDetected) {
                reasons.push(`Evasion techniques detected (score: ${scanResult.evasion.score})`);
                priority += 3;
                shouldReview = true;
            }

            // 5. New/rare file types
            if (this.isRareFileType(scanResult.fileName)) {
                reasons.push('Rare file type');
                priority += 1;
                shouldReview = true;
            }

            // 6. Similarity to reviewed cases
            const similarCase = await this.findSimilarCase(scanResult);
            if (similarCase) {
                reasons.push(`Similar to previous case: ${similarCase.id}`);
                priority += 2;
                shouldReview = true;
            }

            const recommendation = {
                shouldReview: shouldReview,
                priority: priority,
                reasons: reasons,
                estimatedReviewTime: this.estimateReviewTime(scanResult),
                similarCase: similarCase
            };

            if (shouldReview) {
                await this.addToReviewQueue(scanResult, recommendation);
            }

            logger.info('Sample evaluated for active learning', {
                hash: scanResult.hash,
                shouldReview: shouldReview,
                priority: priority
            });

            return recommendation;

        } catch (error) {
            logger.error('Failed to evaluate sample', { error: error.message });
            return {
                shouldReview: false,
                error: error.message
            };
        }
    }

    /**
     * Add sample to review queue
     */
    async addToReviewQueue(scanResult, recommendation) {
        if (this.reviewQueue.length >= this.maxQueueSize) {
            // Remove lowest priority item
            this.reviewQueue.sort((a, b) => a.priority - b.priority);
            this.reviewQueue.shift();
        }

        const reviewItem = {
            id: this.generateReviewId(),
            addedAt: Date.now(),
            scanResult: scanResult,
            recommendation: recommendation,
            priority: recommendation.priority,
            status: 'pending', // pending, in_review, completed
            assignedTo: null,
            reviewedAt: null,
            reviewResult: null
        };

        this.reviewQueue.push(reviewItem);

        // Sort by priority (highest first)
        this.reviewQueue.sort((a, b) => b.priority - a.priority);

        logger.info('Sample added to review queue', {
            reviewId: reviewItem.id,
            priority: reviewItem.priority,
            queueSize: this.reviewQueue.length
        });
    }

    /**
     * Get next sample for review
     * @returns {object|null} - Next review item or null
     */
    async getNextForReview() {
        const pending = this.reviewQueue.filter(item => item.status === 'pending');

        if (pending.length === 0) {
            return null;
        }

        // Return highest priority pending item
        const nextItem = pending[0];
        nextItem.status = 'in_review';
        nextItem.reviewStartedAt = Date.now();

        return nextItem;
    }

    /**
     * Submit review result
     */
    async submitReview(reviewId, reviewResult) {
        const item = this.reviewQueue.find(r => r.id === reviewId);
        if (!item) {
            throw new Error('Review item not found');
        }

        item.status = 'completed';
        item.reviewedAt = Date.now();
        item.reviewResult = reviewResult;
        item.reviewDuration = item.reviewedAt - item.reviewStartedAt;

        // Store in reviewed samples for similarity matching
        this.reviewedSamples.set(item.scanResult.hash, {
            reviewId: reviewId,
            verdict: reviewResult.verdict,
            features: item.scanResult.features,
            reviewedAt: item.reviewedAt
        });

        // Clean up old reviewed samples (keep last 500)
        if (this.reviewedSamples.size > 500) {
            const oldestKey = this.reviewedSamples.keys().next().value;
            this.reviewedSamples.delete(oldestKey);
        }

        logger.info('Review submitted', {
            reviewId: reviewId,
            verdict: reviewResult.verdict,
            duration: item.reviewDuration
        });

        return item;
    }

    /**
     * Find similar reviewed case
     */
    async findSimilarCase(scanResult) {
        // Simple similarity based on file size and entropy
        for (const [hash, reviewed] of this.reviewedSamples.entries()) {
            if (!reviewed.features) continue;

            const sizeSimilarity = 1 - Math.abs(
                scanResult.size - reviewed.features.size
            ) / Math.max(scanResult.size, reviewed.features.size);

            const entropySimilarity = 1 - Math.abs(
                scanResult.entropy - reviewed.features.entropy
            ) / 8; // Max entropy is 8

            const overallSimilarity = (sizeSimilarity + entropySimilarity) / 2;

            if (overallSimilarity > this.similarityThreshold) {
                return {
                    id: reviewed.reviewId,
                    hash: hash,
                    similarity: overallSimilarity,
                    verdict: reviewed.verdict
                };
            }
        }

        return null;
    }

    /**
     * Check if file type is rare
     */
    isRareFileType(fileName) {
        if (!fileName) return false;

        const rareExtensions = [
            '.vbs', '.wsf', '.hta', '.jar', '.jse',
            '.vbe', '.gadget', '.msi', '.msp', '.com'
        ];

        return rareExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    /**
     * Estimate review time
     */
    estimateReviewTime(scanResult) {
        let baseTime = 5; // 5 minutes base

        if (scanResult.size > 10 * 1024 * 1024) {
            baseTime += 5; // Large files take longer
        }

        if (scanResult.evasion && scanResult.evasion.evasionDetected) {
            baseTime += 10; // Evasive malware takes longer
        }

        return `${baseTime} minutes`;
    }

    /**
     * Get review queue statistics
     */
    getStats() {
        const pending = this.reviewQueue.filter(r => r.status === 'pending').length;
        const inReview = this.reviewQueue.filter(r => r.status === 'in_review').length;
        const completed = this.reviewQueue.filter(r => r.status === 'completed').length;

        return {
            queueSize: this.reviewQueue.length,
            pending: pending,
            inReview: inReview,
            completed: completed,
            reviewedSamples: this.reviewedSamples.size
        };
    }

    /**
     * Generate review ID
     */
    generateReviewId() {
        return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
const activeLearningSelector = new ActiveLearningSelector();

module.exports = {
    ActiveLearningSelector,
    activeLearningSelector
};
