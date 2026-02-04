const logger = require('../utils/logger');
const { feedbackCollector } = require('./feedbackCollector');
const { modelVersionManager } = require('./modelVersionManager');
const { tensorflowModel } = require('../engine/tensorflowModel');

/**
 * Automated Retraining Pipeline
 * Handles automated model retraining based on feedback and performance monitoring
 */
class RetrainingPipeline {
    constructor() {
        this.isRetraining = false;
        this.retrainingHistory = [];
        this.performanceMonitor = {
            detectionRate: [],
            falsePositiveRate: [],
            averageConfidence: []
        };

        // Retraining triggers
        this.triggers = {
            minFeedbackSamples: 100,
            performanceDropThreshold: 0.05, // 5% drop triggers retraining
            timeSinceLastTraining: 7 * 24 * 60 * 60 * 1000, // 7 days
            falsePositiveIncrease: 0.02 // 2% increase
        };

        this.lastRetrainingTime = null;
    }

    /**
     * Monitor performance and trigger retraining if needed
     * @param {object} scanMetrics - Latest scan metrics
     */
    async monitorPerformance(scanMetrics) {
        try {
            // Update performance history
            this.performanceMonitor.detectionRate.push(scanMetrics.detectionRate || 0);
            this.performanceMonitor.falsePositiveRate.push(scanMetrics.falsePositiveRate || 0);
            this.performanceMonitor.averageConfidence.push(scanMetrics.averageConfidence || 0);

            // Keep last 100 data points
            if (this.performanceMonitor.detectionRate.length > 100) {
                this.performanceMonitor.detectionRate.shift();
                this.performanceMonitor.falsePositiveRate.shift();
                this.performanceMonitor.averageConfidence.shift();
            }

            // Check if retraining should be triggered
            const shouldRetrain = await this.shouldTriggerRetraining();

            if (shouldRetrain.trigger) {
                logger.info('Retraining triggered', { reasons: shouldRetrain.reasons });
                await this.startRetraining(shouldRetrain.reasons);
            }

        } catch (error) {
            logger.error('Performance monitoring failed', { error: error.message });
        }
    }

    /**
     * Check if retraining should be triggered
     */
    async shouldTriggerRetraining() {
        const reasons = [];
        let trigger = false;

        // 1. Check feedback samples
        const feedbackStats = feedbackCollector.getStats();
        const availableFeedback = feedbackStats.corrections + feedbackStats.falsePositives + feedbackStats.falseNegatives;

        if (availableFeedback >= this.triggers.minFeedbackSamples) {
            reasons.push(`Sufficient feedback samples (${availableFeedback})`);
            trigger = true;
        }

        // 2. Check performance drop
        if (this.performanceMonitor.detectionRate.length >= 10) {
            const recentAvg = this.average(this.performanceMonitor.detectionRate.slice(-10));
            const historicalAvg = this.average(this.performanceMonitor.detectionRate.slice(0, -10));

            if (historicalAvg - recentAvg > this.triggers.performanceDropThreshold) {
                reasons.push(`Detection rate dropped by ${((historicalAvg - recentAvg) * 100).toFixed(2)}%`);
                trigger = true;
            }
        }

        // 3. Check false positive increase
        if (this.performanceMonitor.falsePositiveRate.length >= 10) {
            const recentAvg = this.average(this.performanceMonitor.falsePositiveRate.slice(-10));
            const historicalAvg = this.average(this.performanceMonitor.falsePositiveRate.slice(0, -10));

            if (recentAvg - historicalAvg > this.triggers.falsePositiveIncrease) {
                reasons.push(`False positive rate increased by ${((recentAvg - historicalAvg) * 100).toFixed(2)}%`);
                trigger = true;
            }
        }

        // 4. Check time since last training
        if (this.lastRetrainingTime) {
            const timeSince = Date.now() - this.lastRetrainingTime;
            if (timeSince > this.triggers.timeSinceLastTraining) {
                reasons.push(`${Math.floor(timeSince / (24 * 60 * 60 * 1000))} days since last training`);
                trigger = true;
            }
        }

        return { trigger, reasons };
    }

    /**
     * Start retraining process
     */
    async startRetraining(reasons) {
        if (this.isRetraining) {
            logger.warn('Retraining already in progress');
            return;
        }

        this.isRetraining = true;
        const retrainingId = this.generateRetrainingId();
        const startTime = Date.now();

        try {
            logger.info('Starting automated retraining', {
                retrainingId: retrainingId,
                reasons: reasons
            });

            // 1. Collect feedback data
            const feedbackData = await feedbackCollector.getFeedbackForTraining(500);

            if (feedbackData.length === 0) {
                logger.warn('No feedback data available for retraining');
                this.isRetraining = false;
                return;
            }

            // 2. Prepare training data
            const trainingData = this.prepareTrainingData(feedbackData);

            // 3. Train new model
            logger.info('Training new model', {
                samples: trainingData.features.length
            });

            try {
                await tensorflowModel.train(
                    trainingData.features,
                    trainingData.labels,
                    50 // epochs
                );
            } catch (trainError) {
                logger.warn('Retraining failed (likely due to missing TensorFlow)', { error: trainError.message });
                this.isRetraining = false;
                return;
            }

            // 4. Save new model version
            const modelPath = `./models/malware_classifier_${retrainingId}`;
            await tensorflowModel.saveModel(modelPath);

            // 5. Create new version
            const versionId = await modelVersionManager.createVersion({
                name: `Automated Retraining ${new Date().toISOString()}`,
                modelPath: modelPath,
                trainingSamples: trainingData.features.length,
                epochs: 50,
                createdBy: 'automated_pipeline'
            });

            // 6. Deploy with A/B testing
            await modelVersionManager.deployVersion(versionId, true);

            // 7. Mark feedback as used
            const feedbackIds = feedbackData.map(f => f.id);
            await feedbackCollector.markAsUsed(feedbackIds);

            // 8. Record retraining
            const duration = Date.now() - startTime;
            this.retrainingHistory.push({
                id: retrainingId,
                timestamp: Date.now(),
                duration: duration,
                reasons: reasons,
                samples: trainingData.features.length,
                versionId: versionId,
                status: 'completed'
            });

            this.lastRetrainingTime = Date.now();

            logger.info('Retraining completed successfully', {
                retrainingId: retrainingId,
                duration: duration,
                versionId: versionId
            });

        } catch (error) {
            logger.error('Retraining failed', {
                retrainingId: retrainingId,
                error: error.message
            });

            this.retrainingHistory.push({
                id: retrainingId,
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                reasons: reasons,
                status: 'failed',
                error: error.message
            });

        } finally {
            this.isRetraining = false;
        }
    }

    /**
     * Prepare training data from feedback
     */
    prepareTrainingData(feedbackData) {
        const features = [];
        const labels = [];

        for (const feedback of feedbackData) {
            if (!feedback.features) continue;

            // Extract feature vector
            const featureVector = [
                feedback.features.size / 1000000, // Normalize size
                feedback.features.entropy || 0,
                feedback.features.suspiciousStringCount || 0,
                feedback.features.importCount || 0,
                feedback.features.sectionCount || 0,
                feedback.features.maxSectionEntropy || 0
            ];

            features.push(featureVector);

            // Label: 1 for malicious, 0 for safe
            const label = feedback.userVerdict === 'Malicious' ? 1 : 0;
            labels.push(label);
        }

        return { features, labels };
    }

    /**
     * Calculate average
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Get retraining statistics
     */
    getStats() {
        const completedRetrainings = this.retrainingHistory.filter(r => r.status === 'completed');
        const failedRetrainings = this.retrainingHistory.filter(r => r.status === 'failed');

        return {
            isRetraining: this.isRetraining,
            totalRetrainings: this.retrainingHistory.length,
            completed: completedRetrainings.length,
            failed: failedRetrainings.length,
            lastRetraining: this.lastRetrainingTime,
            performanceHistory: {
                detectionRate: this.performanceMonitor.detectionRate.slice(-10),
                falsePositiveRate: this.performanceMonitor.falsePositiveRate.slice(-10),
                averageConfidence: this.performanceMonitor.averageConfidence.slice(-10)
            }
        };
    }

    /**
     * Generate retraining ID
     */
    generateRetrainingId() {
        return `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
}

// Singleton instance
const retrainingPipeline = new RetrainingPipeline();

module.exports = {
    RetrainingPipeline,
    retrainingPipeline
};
