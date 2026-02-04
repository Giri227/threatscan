const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Feedback Collector
 * Collects user feedback and analyst corrections for model improvement
 */
class FeedbackCollector {
    constructor() {
        this.feedbackDir = path.join(__dirname, '../../data/feedback');
        this.feedbackQueue = [];
        this.maxQueueSize = 1000;

        // Statistics
        this.stats = {
            totalFeedback: 0,
            corrections: 0,
            confirmations: 0,
            falsePositives: 0,
            falseNegatives: 0
        };

        this.ensureFeedbackDir();
    }

    /**
     * Ensure feedback directory exists
     */
    async ensureFeedbackDir() {
        try {
            await fs.mkdir(this.feedbackDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create feedback directory', { error: error.message });
        }
    }

    /**
     * Collect feedback on scan result
     * @param {object} feedback - Feedback data
     * @returns {string} - Feedback ID
     */
    async collectFeedback(feedback) {
        try {
            const feedbackId = this.generateFeedbackId();

            const feedbackRecord = {
                id: feedbackId,
                timestamp: Date.now(),
                scanId: feedback.scanId,
                hash: feedback.hash,
                fileName: feedback.fileName,

                // Original prediction
                originalVerdict: feedback.originalVerdict,
                originalScore: feedback.originalScore,
                originalConfidence: feedback.originalConfidence,

                // User feedback
                userVerdict: feedback.userVerdict, // 'malicious', 'safe', 'suspicious'
                userConfidence: feedback.userConfidence || 1.0,
                userComment: feedback.userComment,
                userId: feedback.userId || 'anonymous',

                // Correction type
                correctionType: this.determineCorrectionType(
                    feedback.originalVerdict,
                    feedback.userVerdict
                ),

                // Features for retraining
                features: feedback.features,

                // Metadata
                source: feedback.source || 'user',
                reviewed: false,
                usedForTraining: false
            };

            // Update statistics
            this.updateStats(feedbackRecord);

            // Add to queue
            this.feedbackQueue.push(feedbackRecord);

            // Save to disk
            await this.saveFeedback(feedbackRecord);

            logger.info('Feedback collected', {
                feedbackId: feedbackId,
                correctionType: feedbackRecord.correctionType,
                hash: feedback.hash
            });

            return feedbackId;

        } catch (error) {
            logger.error('Failed to collect feedback', { error: error.message });
            throw error;
        }
    }

    /**
     * Determine correction type
     */
    determineCorrectionType(originalVerdict, userVerdict) {
        if (originalVerdict === userVerdict) {
            return 'confirmation';
        }

        if (originalVerdict === 'Safe' && userVerdict === 'Malicious') {
            return 'false_negative';
        }

        if (originalVerdict === 'Malicious' && userVerdict === 'Safe') {
            return 'false_positive';
        }

        return 'correction';
    }

    /**
     * Update statistics
     */
    updateStats(feedbackRecord) {
        this.stats.totalFeedback++;

        switch (feedbackRecord.correctionType) {
            case 'confirmation':
                this.stats.confirmations++;
                break;
            case 'false_positive':
                this.stats.falsePositives++;
                break;
            case 'false_negative':
                this.stats.falseNegatives++;
                break;
            default:
                this.stats.corrections++;
        }
    }

    /**
     * Save feedback to disk
     */
    async saveFeedback(feedbackRecord) {
        const filePath = path.join(
            this.feedbackDir,
            `feedback_${feedbackRecord.id}.json`
        );

        await fs.writeFile(
            filePath,
            JSON.stringify(feedbackRecord, null, 2),
            'utf8'
        );
    }

    /**
     * Get feedback for retraining
     * @param {number} limit - Maximum number of feedback records
     * @returns {array} - Feedback records
     */
    async getFeedbackForTraining(limit = 100) {
        try {
            const files = await fs.readdir(this.feedbackDir);
            const feedbackRecords = [];

            for (const file of files.slice(0, limit)) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(this.feedbackDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const record = JSON.parse(content);

                // Only include corrections and false positives/negatives
                if (record.correctionType !== 'confirmation' && !record.usedForTraining) {
                    feedbackRecords.push(record);
                }
            }

            logger.info('Retrieved feedback for training', { count: feedbackRecords.length });
            return feedbackRecords;

        } catch (error) {
            logger.error('Failed to get feedback for training', { error: error.message });
            return [];
        }
    }

    /**
     * Mark feedback as used for training
     */
    async markAsUsed(feedbackIds) {
        for (const id of feedbackIds) {
            const filePath = path.join(this.feedbackDir, `feedback_${id}.json`);

            try {
                const content = await fs.readFile(filePath, 'utf8');
                const record = JSON.parse(content);
                record.usedForTraining = true;
                record.trainedAt = Date.now();

                await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
            } catch (error) {
                logger.warn('Failed to mark feedback as used', { id, error: error.message });
            }
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        const accuracy = this.stats.totalFeedback > 0
            ? (this.stats.confirmations / this.stats.totalFeedback) * 100
            : 0;

        return {
            ...this.stats,
            accuracy: accuracy.toFixed(2) + '%',
            queueSize: this.feedbackQueue.length
        };
    }

    /**
     * Generate unique feedback ID
     */
    generateFeedbackId() {
        return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
const feedbackCollector = new FeedbackCollector();

module.exports = {
    FeedbackCollector,
    feedbackCollector
};
