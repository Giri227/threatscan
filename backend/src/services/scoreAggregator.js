const logger = require('../utils/logger');

/**
 * Aggregates scores from different engines into a unified risk score and verdict
 * Enhanced with uncertainty quantification and confidence-based weighting
 * @param {object} results - Results from ClamAV, YARA, ML, VT, Abuse, AI
 * @returns {object} - Unified score and verdict with confidence metrics
 */
function aggregateScore(results) {
    const baseWeights = {
        clamav: 0.15,    // Signature
        yara: 0.15,      // Signature (Improved YARA)
        virustotal: 0.05,// Reputation
        abuse: 0.15,     // Real-time Intel (Abuse.ch)
        ml: 0.25,        // Enhanced ML (Ensemble: Heuristics + TensorFlow + PE Analysis)
        ai: 0.25         // Cognitive Analysis (Gemini)
    };

    let totalScore = 0;
    let totalWeight = 0;
    const engineScores = {};
    const engineConfidences = {};
    const uncertaintyMetrics = [];

    // 1. ClamAV
    if (results.clamav && results.clamav.status !== 'unavailable' && results.clamav.status !== 'error') {
        const confidence = results.clamav.confidence || 0.9; // ClamAV is generally reliable
        const adjustedWeight = baseWeights.clamav * (0.5 + 0.5 * confidence);
        totalScore += results.clamav.score * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.clamav = results.clamav.score;
        engineConfidences.clamav = confidence;
    }

    // 2. YARA
    if (results.yara && results.yara.status !== 'unavailable' && results.yara.status !== 'error') {
        const confidence = results.yara.confidence || 0.85;
        const adjustedWeight = baseWeights.yara * (0.5 + 0.5 * confidence);
        totalScore += results.yara.score * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.yara = results.yara.score;
        engineConfidences.yara = confidence;
    }

    // 3. AbuseIPDB
    if (results.abuse && results.abuse.found) {
        const confidence = results.abuse.confidence || 0.8;
        const adjustedWeight = baseWeights.abuse * (0.5 + 0.5 * confidence);
        totalScore += results.abuse.score * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.abuse = results.abuse.score;
        engineConfidences.abuse = confidence;
    }

    // 4. Enhanced ML (Ensemble)
    if (results.ml && results.ml.status !== 'unavailable') {
        const confidence = results.ml.confidence || 0.5;
        const adjustedWeight = baseWeights.ml * (0.5 + 0.5 * confidence);
        totalScore += results.ml.score * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.ml = results.ml.score;
        engineConfidences.ml = confidence;

        // Capture uncertainty metrics from ensemble
        if (results.ml.uncertainty) {
            uncertaintyMetrics.push({
                engine: 'ml',
                uncertainty: results.ml.uncertainty,
                disagreement: results.ml.disagreement
            });
        }
    }

    // 5. VirusTotal
    if (results.virustotal && results.virustotal.status === 'success') {
        const confidence = results.virustotal.confidence || 0.7;
        const adjustedWeight = baseWeights.virustotal * (0.5 + 0.5 * confidence);
        totalScore += results.virustotal.score * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.virustotal = results.virustotal.score;
        engineConfidences.virustotal = confidence;
    }

    // 6. AI Analysis
    if (results.ai && typeof results.ai.confidence === 'number') {
        const confidence = results.ai.confidence / 100; // Normalize to 0-1
        const adjustedWeight = baseWeights.ai * (0.5 + 0.5 * confidence);
        totalScore += results.ai.confidence * adjustedWeight;
        totalWeight += adjustedWeight;
        engineScores.ai = results.ai.confidence;
        engineConfidences.ai = confidence;
    }

    // Normalize
    let finalScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;

    // Calculate overall confidence and uncertainty
    const overallMetrics = calculateOverallUncertainty(engineScores, engineConfidences, uncertaintyMetrics);

    // --- CRITICAL OVERRIDE LOGIC ---

    // Kill Switch 1: Known Malware (Abuse.ch or VT says 100% Malicious)
    if ((results.abuse && results.abuse.malicious) || (results.virustotal && results.virustotal.score >= 90)) {
        finalScore = Math.max(finalScore, 95);
    }

    // Kill Switch 2: AI Extremely Confident
    if (results.ai && results.ai.confidence > 90 && results.ai.ai_verdict === 'MALICIOUS') {
        finalScore = Math.max(finalScore, 90);
    }

    // Kill Switch 3: Critical Heuristics (Entropy > 7.8)
    if (results.ml && results.ml.score >= 90) {
        finalScore = Math.max(finalScore, 85);
    }

    // Verdict Logic with Confidence Consideration
    let verdict = 'Safe';
    let severity = 'low';

    if (finalScore > 75) {
        verdict = 'Malicious';
        severity = 'critical';
    } else if (finalScore > 50) {
        verdict = 'Malicious';
        severity = 'high';
    } else if (finalScore > 30) {
        verdict = 'Suspicious';
        severity = 'medium';
    }

    // Adjust verdict if uncertainty is very high
    if (overallMetrics.overallConfidence < 0.4 && verdict === 'Safe') {
        verdict = 'Uncertain';
        severity = 'low';
    }

    const aggregatedResult = {
        risk_score: Math.round(finalScore),
        verdict: verdict,
        severity: severity,
        confidence: overallMetrics.overallConfidence,
        uncertainty: overallMetrics.overallUncertainty,
        engine_scores: engineScores,
        engine_confidences: engineConfidences,
        breakdown: {
            clamav: { ...results.clamav, status: results.clamav?.status || (results.clamav?.score > 0 ? 'infected' : 'clean') },
            yara: { ...results.yara, status: results.yara?.status || (results.yara?.score > 0 ? 'matched' : 'clean') },
            abuse: { ...results.abuse, status: results.abuse?.found ? 'listed' : 'clean' },
            ml: { ...results.ml, status: results.ml?.status || results.ml?.verdict },
            virustotal: { ...results.virustotal, status: results.virustotal?.status || (results.virustotal?.score > 10 ? 'suspicious' : 'safe') },
            ai: results.ai
        },
        metrics: {
            totalEngines: Object.keys(engineScores).length,
            averageConfidence: overallMetrics.averageConfidence,
            scoreVariance: overallMetrics.scoreVariance,
            requiresReview: overallMetrics.requiresReview
        }
    };

    logger.info('Score aggregation completed', {
        finalScore: aggregatedResult.risk_score,
        verdict: verdict,
        confidence: overallMetrics.overallConfidence.toFixed(2),
        engines: Object.keys(engineScores).length,
        requiresReview: overallMetrics.requiresReview
    });

    return aggregatedResult;
}

/**
 * Calculate overall uncertainty metrics across all engines
 */
function calculateOverallUncertainty(engineScores, engineConfidences, uncertaintyMetrics) {
    const scores = Object.values(engineScores);
    const confidences = Object.values(engineConfidences);

    // Calculate score variance
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const scoreVariance = scores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) / scores.length;
    const scoreStdDev = Math.sqrt(scoreVariance);

    // Calculate average confidence
    const averageConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0.5;

    // Calculate overall uncertainty (inverse of confidence, adjusted by variance)
    const varianceComponent = Math.min(scoreStdDev / 100, 0.5); // Normalize to 0-0.5
    const confidenceComponent = 1 - averageConfidence;
    const overallUncertainty = (varianceComponent + confidenceComponent) / 2;
    const overallConfidence = 1 - overallUncertainty;

    // Check if manual review is recommended
    const requiresReview =
        overallConfidence < 0.5 ||
        scoreStdDev > 30 ||
        uncertaintyMetrics.some(m => m.disagreement?.level === 'high');

    return {
        overallConfidence,
        overallUncertainty,
        averageConfidence,
        scoreVariance,
        scoreStdDev,
        requiresReview
    };
}

module.exports = aggregateScore;

