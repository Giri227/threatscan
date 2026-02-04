const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');
const { peParser } = require('./peParser');
const { tensorflowModel } = require('./tensorflowModel');
const { ensemblePredictor } = require('./ensemblePredictor');

/**
 * Extracts features from a file for ML inference
 * Enhanced with PE analysis and advanced feature extraction
 * @param {string} filePath 
 */
async function extractFeatures(filePath) {
    const data = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    const { count, matches } = checkForSuspiciousStrings(data.toString('binary'));

    const features = {
        size: stats.size,
        extension: filePath.split('.').pop().toLowerCase(),
        entropy: calculateEntropy(data),
        suspiciousStringCount: count,
        suspiciousPatterns: matches,
        hash: crypto.createHash('sha256').update(data).digest('hex')
    };

    // Enhanced: Add PE analysis for executables
    if (['exe', 'dll', 'sys', 'scr'].includes(features.extension)) {
        try {
            const peAnalysis = await peParser.parsePE(data);
            if (peAnalysis.isPE) {
                features.peAnalysis = peAnalysis;
                features.importCount = peAnalysis.analysis?.importCount || 0;
                features.sectionCount = peAnalysis.analysis?.sectionCount || 0;
                features.maxSectionEntropy = peAnalysis.analysis?.maxSectionEntropy || features.entropy;
                features.isPacked = peAnalysis.packerInfo?.isPacked || false;
                features.packerType = peAnalysis.packerInfo?.detected || [];
                features.peAnomalies = peAnalysis.anomalies || [];
            }
        } catch (error) {
            logger.warn('PE analysis failed, continuing with basic features', { error: error.message });
        }
    }

    logger.info('Features extracted', {
        filePath,
        entropy: features.entropy,
        size: features.size,
        isPE: !!features.peAnalysis,
        isPacked: features.isPacked
    });
    return features;
}


/**
 * Enhanced ML prediction using ensemble of models
 * Combines heuristic, TensorFlow neural network, and PE analysis
 * @param {object} features 
 */
async function mlPredict(features) {
    if (process.env.ML_ENABLED === 'false') {
        return { status: 'unavailable', score: 0, verdict: 'unknown', confidence: 0 };
    }

    try {
        // Run all models in parallel
        const [heuristicResult, tensorflowResult, peAnalysisResult] = await Promise.all([
            heuristicPredict(features),
            tensorflowModel.predict(features).catch(err => {
                logger.warn('TensorFlow prediction failed', { error: err.message });
                return { status: 'error', score: 0, confidence: 0 };
            }),
            peAnalysisPredict(features)
        ]);

        // Combine predictions using ensemble
        const ensembleResult = await ensemblePredictor.predict({
            heuristic: heuristicResult,
            tensorflow: tensorflowResult,
            peAnalysis: peAnalysisResult
        });

        logger.info('ML prediction completed (ensemble)', {
            score: ensembleResult.score,
            confidence: ensembleResult.confidence,
            disagreement: ensembleResult.disagreement?.level
        });

        return ensembleResult;

    } catch (error) {
        logger.error('ML prediction failed', { error: error.message });
        // Fallback to heuristic only
        return heuristicPredict(features);
    }
}

/**
 * Original heuristic-based prediction
 * @param {object} features 
 */
async function heuristicPredict(features) {
    let score = 0;
    const reasons = [];

    // Size check
    if (features.size > 10 * 1024 * 1024) {
        score += 10;
        reasons.push('Large file size');
    } else if (features.size > 0 && features.size < 5 * 1024) { // < 5KB
        // Tiny PE files are often suspicious stagers
        if (['exe', 'dll'].includes(features.extension)) {
            score += 20;
            reasons.push('Anomalously small executable (stager?)');
        }
    }

    // Tiered Entropy check
    const entropy = features.entropy;
    if (entropy > 7.8) { // FIXED: Lower threshold for real packing detection (Standard is ~7.8+)
        score += 90;
        reasons.push(`Critical Entropy (${entropy.toFixed(2)}): Encrypted/Packed Code Detected`);
    } else if (entropy >= 7.2) {
        score += 50;
        reasons.push(`High Entropy (${entropy.toFixed(2)}): Suspicious Compression`);
    } else if (entropy >= 6.8) {
        score += 20;
        reasons.push(`Elevated Entropy (${entropy.toFixed(2)}): Possible packing`);
    }

    // Suspicious extensions
    if (['exe', 'dll', 'vbs', 'ps1', 'scr', 'bat', 'cmd', 'com', 'hta', 'js', 'jar'].includes(features.extension)) {
        score += 15;
        reasons.push(`Suspicious extension: .${features.extension}`);
    }

    // String matching
    const matchCount = features.suspiciousStringCount;
    if (matchCount > 0) {
        // Logarithmic scaling for matches? Or linear with cap.
        score += Math.min(matchCount * 10, 80); // Cap at 80
        reasons.push(`Suspicious indicators detected (${matchCount} matches)`);

        // Bonus for having MANY indicators
        if (matchCount > 5) {
            score += 20;
            reasons.push('Multiple different threat vectors identified');
        }
    }

    // Enhanced: PE-specific checks
    if (features.isPacked) {
        score += 25;
        reasons.push(`Packed executable detected: ${features.packerType.join(', ') || 'Unknown packer'}`);
    }

    if (features.peAnomalies && features.peAnomalies.length > 0) {
        score += Math.min(features.peAnomalies.length * 10, 30);
        reasons.push(`${features.peAnomalies.length} PE structure anomalies`);
    }

    const finalScore = Math.min(score, 100);

    return {
        status: 'success',
        score: finalScore,
        verdict: finalScore > 50 ? 'suspicious' : 'safe',
        confidence: finalScore / 100,
        reasons: reasons
    };
}

/**
 * PE analysis-based prediction
 * @param {object} features 
 */
async function peAnalysisPredict(features) {
    if (!features.peAnalysis || !features.peAnalysis.isPE) {
        return {
            status: 'unavailable',
            score: 0,
            confidence: 0,
            verdict: 'not_applicable'
        };
    }

    const peAnalysis = features.peAnalysis;
    const analysisScore = peAnalysis.analysis?.score || 0;
    const analysisReasons = peAnalysis.analysis?.reasons || [];

    return {
        status: 'success',
        score: analysisScore,
        verdict: peAnalysis.analysis?.verdict || 'normal',
        confidence: 0.8, // PE analysis is generally reliable
        reasons: analysisReasons,
        details: {
            isPacked: peAnalysis.packerInfo?.isPacked,
            packers: peAnalysis.packerInfo?.detected,
            anomalies: peAnalysis.anomalies,
            importCount: peAnalysis.analysis?.importCount,
            sectionCount: peAnalysis.analysis?.sectionCount
        }
    };
}


function calculateEntropy(buffer) {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
        freq[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
        if (freq[i] > 0) {
            const p = freq[i] / buffer.length;
            entropy -= p * Math.log2(p);
        }
    }
    return entropy;
}

function checkForSuspiciousStrings(str) {
    const patterns = [
        // Process Injection / Memory Manipulation
        /CreateRemoteThread/i,
        /WriteProcessMemory/i,
        /VirtualAlloc(Ex)?/i,
        /NtUnmapViewOfSection/i,
        /SetWindowsHookEx/i,
        /EnumProcessModules/i,

        // Execution / Persistence
        /ShellExecute(Ex)?/i,
        /WinExec/i,
        /CreateService(A|W)?/i,
        /RegOpenKeyEx/i,
        /RegSetValueEx/i,

        // Network / C2
        /URLDownloadToFile/i,
        /InternetOpen(A|W)?/i,
        /InternetReadFile/i,
        /http[s]?:\/\/[^\s]+/i,
        /socket/i,

        // Evasion / Anti-Analysis
        /IsDebuggerPresent/i,
        /CheckRemoteDebuggerPresent/i,
        /Sleep/i,

        // Scripting / LOLBins
        /powershell(\.exe)?/i,
        /cmd\.exe/i,
        /wscript/i,
        /cscript/i,
        /rundll32(\.exe)?/i,
        /regsvr32(\.exe)?/i,
        /mshta(\.exe)?/i,
        /certutil(\.exe)?/i,
        /bitsadmin/i,

        // Ransomware related
        /bitcoin/i,
        /monero/i,
        /encrypt/i,
        /decrypt/i,
        /\.onion/i,
        /\.tor/i,
        /vssadmin/i, // delete shadows
        /wbadmin/i
    ];
    const found = patterns.filter(p => p.test(str));
    return {
        count: found.length,
        matches: found.map(p => p.toString().replace(/\//g, '')) // Clean regex string for display
    };
}

module.exports = { extractFeatures, mlPredict };
