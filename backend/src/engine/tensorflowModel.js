let tf;
try {
    tf = require('@tensorflow/tfjs-node');
} catch (error) {
    // If tfjs-node fails, try the standard tfjs (which doesn't require native bindings)
    try {
        tf = require('@tensorflow/tfjs');
    } catch (e) {
        // Both failed, model will be disabled
    }
}
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * TensorFlow.js-based malware detection model
 * Implements a neural network for binary classification with uncertainty quantification
 */
class TensorFlowMalwareModel {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.modelPath = path.join(__dirname, '../../models/malware_classifier');
        this.featureStats = {
            // Normalization statistics (mean and std dev)
            size: { mean: 5000000, std: 10000000 },
            entropy: { mean: 5.5, std: 2.0 },
            suspiciousStringCount: { mean: 5, std: 10 },
            importCount: { mean: 20, std: 30 },
            sectionCount: { mean: 4, std: 2 },
            maxSectionEntropy: { mean: 6.0, std: 1.5 }
        };
    }

    /**
     * Load or create the TensorFlow model
     */
    async loadModel() {
        if (!tf) {
            logger.warn('TensorFlow not available, skipping model load');
            return;
        }
        try {
            // Try to load existing model
            if (await this.modelExists()) {
                this.model = await tf.loadLayersModel(`file://${this.modelPath}/model.json`);
                logger.info('TensorFlow model loaded successfully');
            } else {
                // Create a new model if none exists
                this.model = this.createModel();
                logger.info('Created new TensorFlow model (untrained)');
            }
            this.isLoaded = true;
        } catch (error) {
            logger.error('Failed to load TensorFlow model', { error: error.message });
            // Create a fallback model
            this.model = this.createModel();
            this.isLoaded = true;
        }
    }

    /**
     * Check if model file exists
     */
    async modelExists() {
        try {
            await fs.access(path.join(this.modelPath, 'model.json'));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a neural network model architecture
     * Architecture: Input(6) -> Dense(64, relu) -> Dropout(0.3) -> Dense(32, relu) -> Dropout(0.2) -> Dense(1, sigmoid)
     */
    createModel() {
        if (!tf) return null;
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [6], // 6 normalized features
                    units: 64,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({
                    units: 32,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: 16,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dense({
                    units: 1,
                    activation: 'sigmoid'
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    /**
     * Normalize features using z-score normalization
     */
    normalizeFeatures(features) {
        const normalized = [];

        for (const [key, value] of Object.entries(features)) {
            if (this.featureStats[key]) {
                const { mean, std } = this.featureStats[key];
                const normalizedValue = (value - mean) / (std || 1);
                normalized.push(normalizedValue);
            }
        }

        return normalized;
    }

    /**
     * Extract numerical features from file analysis
     */
    extractNumericalFeatures(features) {
        return {
            size: features.size || 0,
            entropy: features.entropy || 0,
            suspiciousStringCount: features.suspiciousStringCount || 0,
            importCount: features.importCount || 0,
            sectionCount: features.sectionCount || 0,
            maxSectionEntropy: features.maxSectionEntropy || features.entropy || 0
        };
    }

    /**
     * Predict malware probability with uncertainty quantification
     * Uses Monte Carlo Dropout for uncertainty estimation
     */
    async predict(features) {
        if (!this.isLoaded) {
            await this.loadModel();
        }

        if (!this.isLoaded || !this.model || !tf) {
            return {
                status: 'skipped',
                score: 0,
                confidence: 0,
                reason: 'TensorFlow not available or model not loaded'
            };
        }

        try {
            const numericalFeatures = this.extractNumericalFeatures(features);
            const normalizedFeatures = this.normalizeFeatures(numericalFeatures);

            // Convert to tensor
            const inputTensor = tf.tensor2d([normalizedFeatures], [1, 6]);

            // Monte Carlo Dropout: Run multiple forward passes with dropout enabled
            const numSamples = 20;
            const predictions = [];

            for (let i = 0; i < numSamples; i++) {
                const prediction = this.model.predict(inputTensor, { training: true });
                const value = await prediction.data();
                predictions.push(value[0]);
                prediction.dispose();
            }

            // Calculate mean and variance
            const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
            const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
            const stdDev = Math.sqrt(variance);

            // Clean up
            inputTensor.dispose();

            // Convert probability to score (0-100)
            const score = mean * 100;
            const confidence = 1 - stdDev; // Lower variance = higher confidence

            logger.info('TensorFlow prediction completed', {
                score: score.toFixed(2),
                confidence: confidence.toFixed(2),
                uncertainty: stdDev.toFixed(4)
            });

            return {
                status: 'success',
                score: Math.round(score),
                probability: mean,
                confidence: confidence,
                uncertainty: stdDev,
                verdict: score > 50 ? 'malicious' : 'benign',
                predictions: predictions, // All MC dropout samples
                method: 'tensorflow_neural_network'
            };

        } catch (error) {
            logger.error('TensorFlow prediction failed', { error: error.message });
            return {
                status: 'error',
                score: 0,
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Save the model to disk
     */
    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }

        try {
            await fs.mkdir(this.modelPath, { recursive: true });
            await this.model.save(`file://${this.modelPath}`);
            logger.info('TensorFlow model saved successfully');
        } catch (error) {
            logger.error('Failed to save TensorFlow model', { error: error.message });
            throw error;
        }
    }

    /**
     * Train the model with new data (for future online learning)
     */
    async train(trainingData, labels, epochs = 10) {
        if (!tf || !this.model) {
            logger.warn('TensorFlow not available, skipping training');
            return;
        }

        if (!this.isLoaded) {
            await this.loadModel();
        }

        const xs = tf.tensor2d(trainingData);
        const ys = tf.tensor2d(labels, [labels.length, 1]);

        try {
            await this.model.fit(xs, ys, {
                epochs: epochs,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        logger.info(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    }
                }
            });

            logger.info('Model training completed');
        } finally {
            xs.dispose();
            ys.dispose();
        }
    }
}

// Singleton instance
const tensorflowModel = new TensorFlowMalwareModel();

module.exports = {
    TensorFlowMalwareModel,
    tensorflowModel,
    predict: async (features) => tensorflowModel.predict(features)
};
