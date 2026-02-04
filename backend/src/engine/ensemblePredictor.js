const logger = require('../utils/logger');

/**
 * Ensemble Predictor
 * Combines predictions from multiple ML models using weighted voting
 * Implements uncertainty quantification and disagreement detection
 */
class EnsemblePredictor {
    constructor() {
        // Default weights for different models
        this.weights = {
            heuristic: 0.25,      // Original heuristic model
            tensorflow: 0.40,     // Neural network
            peAnalysis: 0.35      // PE structure analysis
        };

        // Minimum confidence threshold for high-confidence predictions
        this.highConfidenceThreshold = 0.8;

        // Maximum disagreement threshold (std dev of predictions)
        this.maxDisagreementThreshold = 0.3;
    }

    /**
     * Combine predictions from multiple models
     * @param {Object} predictions - Object containing predictions from different models
     * @returns {Object} - Ensemble prediction with confidence and uncertainty
     */
    async predict(predictions) {
        try {
            const validPredictions = this.filterValidPredictions(predictions);

            if (validPredictions.length === 0) {
                return {
                    status: 'error',
                    score: 0,
                    confidence: 0,
                    error: 'No valid predictions available'
                };
            }

            // Calculate weighted average
            const weightedScore = this.calculateWeightedScore(validPredictions);

            // Calculate uncertainty metrics
            const uncertainty = this.calculateUncertainty(validPredictions);

            // Detect disagreement between models
            const disagreement = this.detectDisagreement(validPredictions);

            // Calculate final confidence
            const confidence = this.calculateConfidence(validPredictions, uncertainty, disagreement);

            // Determine verdict
            const verdict = this.determineVerdict(weightedScore, confidence);

            // Generate explanation
            const explanation = this.generateExplanation(validPredictions, weightedScore, disagreement);

            logger.info('Ensemble prediction completed', {
                score: weightedScore.toFixed(2),
                confidence: confidence.toFixed(2),
                models: validPredictions.length,
                disagreement: disagreement.level
            });

            return {
                status: 'success',
                score: Math.round(weightedScore),
                confidence: confidence,
                uncertainty: uncertainty,
                disagreement: disagreement,
                verdict: verdict,
                explanation: explanation,
                modelPredictions: validPredictions,
                method: 'ensemble_voting'
            };

        } catch (error) {
            logger.error('Ensemble prediction failed', { error: error.message });
            return {
                status: 'error',
                score: 0,
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Filter out invalid predictions
     */
    filterValidPredictions(predictions) {
        const valid = [];

        for (const [modelName, prediction] of Object.entries(predictions)) {
            if (prediction &&
                prediction.status === 'success' &&
                typeof prediction.score === 'number' &&
                !isNaN(prediction.score)) {

                valid.push({
                    model: modelName,
                    score: prediction.score,
                    confidence: prediction.confidence || 0.5,
                    weight: this.weights[modelName] || 0.1,
                    prediction: prediction
                });
            }
        }

        return valid;
    }

    /**
     * Calculate weighted average score
     */
    calculateWeightedScore(validPredictions) {
        let totalWeight = 0;
        let weightedSum = 0;

        for (const pred of validPredictions) {
            // Adjust weight by model's confidence
            const adjustedWeight = pred.weight * (0.5 + 0.5 * pred.confidence);
            weightedSum += pred.score * adjustedWeight;
            totalWeight += adjustedWeight;
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Calculate uncertainty metrics
     */
    calculateUncertainty(validPredictions) {
        // Calculate variance of predictions
        const scores = validPredictions.map(p => p.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Calculate average confidence
        const avgConfidence = validPredictions.reduce((a, b) => a + b.confidence, 0) / validPredictions.length;

        return {
            variance: variance,
            standardDeviation: stdDev,
            averageConfidence: avgConfidence,
            uncertaintyScore: stdDev / 100 // Normalize to 0-1
        };
    }

    /**
     * Detect disagreement between models
     */
    detectDisagreement(validPredictions) {
        const scores = validPredictions.map(p => p.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const stdDev = Math.sqrt(
            scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
        );

        // Normalize std dev to 0-1 scale
        const normalizedDisagreement = stdDev / 100;

        // Classify disagreement level
        let level = 'low';
        if (normalizedDisagreement > this.maxDisagreementThreshold) {
            level = 'high';
        } else if (normalizedDisagreement > this.maxDisagreementThreshold / 2) {
            level = 'medium';
        }

        // Find models that disagree significantly
        const disagreingModels = validPredictions.filter(p =>
            Math.abs(p.score - mean) > stdDev
        ).map(p => p.model);

        return {
            level: level,
            score: normalizedDisagreement,
            standardDeviation: stdDev,
            disagreingModels: disagreingModels,
            requiresReview: level === 'high'
        };
    }

    /**
     * Calculate final confidence score
     */
    calculateConfidence(validPredictions, uncertainty, disagreement) {
        // Start with average model confidence
        let confidence = uncertainty.averageConfidence;

        // Penalize for high disagreement
        if (disagreement.level === 'high') {
            confidence *= 0.6;
        } else if (disagreement.level === 'medium') {
            confidence *= 0.8;
        }

        // Penalize for high uncertainty
        confidence *= (1 - uncertainty.uncertaintyScore);

        // Boost if all models agree strongly
        if (disagreement.level === 'low' && uncertainty.averageConfidence > 0.8) {
            confidence = Math.min(confidence * 1.2, 1.0);
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Determine final verdict
     */
    determineVerdict(score, confidence) {
        if (score > 75 && confidence > 0.7) {
            return 'malicious';
        } else if (score > 50) {
            return 'suspicious';
        } else if (score > 30) {
            return 'potentially_suspicious';
        } else {
            return 'benign';
        }
    }

    /**
     * Generate human-readable explanation
     */
    generateExplanation(validPredictions, finalScore, disagreement) {
        const explanations = [];

        // Overall assessment
        explanations.push(`Ensemble score: ${finalScore.toFixed(1)}/100`);

        // Model contributions
        const sortedPredictions = validPredictions.sort((a, b) => b.score - a.score);
        for (const pred of sortedPredictions) {
            explanations.push(
                `${pred.model}: ${pred.score.toFixed(1)} (confidence: ${(pred.confidence * 100).toFixed(1)}%)`
            );
        }

        // Disagreement warning
        if (disagreement.level === 'high') {
            explanations.push('⚠️ High disagreement between models - manual review recommended');
        } else if (disagreement.level === 'medium') {
            explanations.push('⚠️ Moderate disagreement between models');
        }

        return explanations;
    }

    /**
     * Update model weights based on performance
     */
    updateWeights(modelName, performance) {
        if (this.weights[modelName] !== undefined) {
            // Simple adaptive weighting based on accuracy
            const currentWeight = this.weights[modelName];
            const adjustment = (performance - 0.5) * 0.1; // Adjust by up to ±10%
            this.weights[modelName] = Math.max(0.1, Math.min(0.6, currentWeight + adjustment));

            // Normalize weights to sum to 1
            this.normalizeWeights();

            logger.info('Updated model weights', { modelName, newWeight: this.weights[modelName] });
        }
    }

    /**
     * Normalize weights to sum to 1
     */
    normalizeWeights() {
        const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
        for (const key in this.weights) {
            this.weights[key] /= sum;
        }
    }

    /**
     * Bayesian belief updating
     * Updates prior belief based on new evidence
     */
    bayesianUpdate(priorBelief, evidence) {
        // Prior probability of malware
        const prior = priorBelief;

        // Likelihood of evidence given malware (from model confidence)
        const likelihoodMalware = evidence.confidence;

        // Likelihood of evidence given benign
        const likelihoodBenign = 1 - evidence.confidence;

        // Posterior probability using Bayes' theorem
        const posterior = (likelihoodMalware * prior) /
            (likelihoodMalware * prior + likelihoodBenign * (1 - prior));

        return {
            prior: prior,
            posterior: posterior,
            likelihood: likelihoodMalware,
            evidence: evidence
        };
    }
}

// Singleton instance
const ensemblePredictor = new EnsemblePredictor();

module.exports = {
    EnsemblePredictor,
    ensemblePredictor,
    predict: async (predictions) => ensemblePredictor.predict(predictions)
};
