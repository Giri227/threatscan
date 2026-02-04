const logger = require('../utils/logger');

/**
 * Adaptive Analyzer
 * Adjusts analysis strategy based on detected evasion techniques
 */
class AdaptiveAnalyzer {
    constructor() {
        // Analysis strategies
        this.strategies = {
            standard: {
                timeout: 30000,
                stealthMode: false,
                timingRandomization: false,
                deobfuscation: false,
                description: 'Standard analysis approach'
            },

            stealth: {
                timeout: 60000,
                stealthMode: true,
                timingRandomization: true,
                deobfuscation: false,
                description: 'Stealth mode for sandbox-aware malware'
            },

            aggressive: {
                timeout: 90000,
                stealthMode: true,
                timingRandomization: true,
                deobfuscation: true,
                description: 'Aggressive analysis with deobfuscation'
            },

            manual: {
                timeout: 300000,
                stealthMode: true,
                timingRandomization: true,
                deobfuscation: true,
                description: 'Manual analysis recommended'
            }
        };
    }

    /**
     * Select appropriate analysis strategy based on evasion detection
     * @param {object} evasionResults - Results from evasion detector
     * @param {object} features - File features
     * @returns {object} - Adaptive analysis plan
     */
    async selectStrategy(evasionResults, features = {}) {
        try {
            let selectedStrategy = 'standard';
            const adjustments = [];
            const countermeasures = [];

            if (!evasionResults || !evasionResults.evasionDetected) {
                logger.info('No evasion detected, using standard strategy');
                return this.createAnalysisPlan('standard', adjustments, countermeasures);
            }

            const techniques = evasionResults.techniques || {};
            const evasionScore = evasionResults.score || 0;

            // Time-based evasion countermeasures
            if (techniques.timeBased) {
                adjustments.push('Enable time acceleration');
                adjustments.push('Skip long sleep calls');
                countermeasures.push({
                    technique: 'timeBased',
                    action: 'accelerateTime',
                    params: { multiplier: 100 }
                });
                selectedStrategy = 'stealth';
            }

            // Sandbox detection countermeasures
            if (techniques.sandboxDetection) {
                adjustments.push('Enable stealth mode');
                adjustments.push('Mask VM artifacts');
                countermeasures.push({
                    technique: 'sandboxDetection',
                    action: 'maskEnvironment',
                    params: { hideVM: true, spoofHardware: true }
                });
                selectedStrategy = 'stealth';
            }

            // Debugger detection countermeasures
            if (techniques.debuggerDetection) {
                adjustments.push('Use stealthy debugging');
                adjustments.push('Patch debugger checks');
                countermeasures.push({
                    technique: 'debuggerDetection',
                    action: 'stealthDebug',
                    params: { patchChecks: true }
                });
            }

            // API hooking evasion countermeasures
            if (techniques.apiHookingEvasion) {
                adjustments.push('Monitor direct syscalls');
                adjustments.push('Use kernel-level hooks');
                countermeasures.push({
                    technique: 'apiHookingEvasion',
                    action: 'kernelMonitoring',
                    params: { monitorSyscalls: true }
                });
            }

            // Obfuscation countermeasures
            if (techniques.obfuscation) {
                adjustments.push('Apply deobfuscation');
                adjustments.push('Use automated unpacking');
                countermeasures.push({
                    technique: 'obfuscation',
                    action: 'deobfuscate',
                    params: { autoUnpack: true }
                });
                selectedStrategy = 'aggressive';
            }

            // If evasion score is very high, recommend manual analysis
            if (evasionScore > 70) {
                selectedStrategy = 'manual';
                adjustments.push('⚠️ Manual analysis strongly recommended');
            }

            const plan = this.createAnalysisPlan(selectedStrategy, adjustments, countermeasures);

            logger.info('Adaptive strategy selected', {
                strategy: selectedStrategy,
                evasionScore: evasionScore,
                adjustments: adjustments.length,
                countermeasures: countermeasures.length
            });

            return plan;

        } catch (error) {
            logger.error('Adaptive strategy selection failed', { error: error.message });
            return this.createAnalysisPlan('standard', ['Error in strategy selection'], []);
        }
    }

    /**
     * Create analysis plan
     */
    createAnalysisPlan(strategyName, adjustments, countermeasures) {
        const strategy = this.strategies[strategyName];

        return {
            strategy: strategyName,
            description: strategy.description,
            config: {
                timeout: strategy.timeout,
                stealthMode: strategy.stealthMode,
                timingRandomization: strategy.timingRandomization,
                deobfuscation: strategy.deobfuscation
            },
            adjustments: adjustments,
            countermeasures: countermeasures,
            estimatedTime: this.estimateAnalysisTime(strategy),
            recommendations: this.generateRecommendations(strategyName, countermeasures)
        };
    }

    /**
     * Estimate analysis time
     */
    estimateAnalysisTime(strategy) {
        const baseTime = strategy.timeout / 1000; // Convert to seconds
        let multiplier = 1;

        if (strategy.stealthMode) multiplier += 0.5;
        if (strategy.timingRandomization) multiplier += 0.3;
        if (strategy.deobfuscation) multiplier += 1.0;

        return Math.round(baseTime * multiplier) + ' seconds';
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(strategyName, countermeasures) {
        const recommendations = [];

        if (strategyName === 'manual') {
            recommendations.push('CRITICAL: Automated analysis may be insufficient');
            recommendations.push('Consider manual reverse engineering');
            recommendations.push('Use specialized tools (IDA Pro, Ghidra, etc.)');
            recommendations.push('Analyze in isolated bare-metal environment');
        } else if (strategyName === 'aggressive') {
            recommendations.push('Use extended analysis timeout');
            recommendations.push('Apply all available countermeasures');
            recommendations.push('Monitor for delayed payloads');
        } else if (strategyName === 'stealth') {
            recommendations.push('Employ anti-anti-VM techniques');
            recommendations.push('Randomize analysis timing');
            recommendations.push('Monitor for environment checks');
        }

        // Add countermeasure-specific recommendations
        for (const cm of countermeasures) {
            if (cm.action === 'accelerateTime') {
                recommendations.push('Time acceleration enabled - watch for time-based triggers');
            } else if (cm.action === 'maskEnvironment') {
                recommendations.push('VM artifacts masked - malware may still detect analysis');
            } else if (cm.action === 'deobfuscate') {
                recommendations.push('Deobfuscation applied - verify unpacked code');
            }
        }

        return recommendations;
    }

    /**
     * Apply timing randomization
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {number} - Randomized delay
     */
    randomizeDelay(baseDelay) {
        // Add ±30% randomization
        const variance = baseDelay * 0.3;
        const randomOffset = (Math.random() * 2 - 1) * variance;
        return Math.max(0, Math.round(baseDelay + randomOffset));
    }

    /**
     * Generate stealth configuration
     * @returns {object} - Stealth mode configuration
     */
    generateStealthConfig() {
        return {
            // Mask VM artifacts
            hideVMware: true,
            hideVirtualBox: true,
            hideQEMU: true,

            // Spoof hardware
            spoofCPU: true,
            spoofMAC: true,
            spoofDisk: true,

            // Randomize identifiers
            randomizeComputerName: true,
            randomizeUserName: true,

            // Timing
            randomizeDelays: true,
            accelerateTime: false, // Don't accelerate in stealth mode

            // Debugging
            hideDebugger: true,
            patchDebugChecks: true
        };
    }

    /**
     * Get strategy statistics
     */
    getStats() {
        return {
            strategies: Object.keys(this.strategies).length,
            strategyNames: Object.keys(this.strategies)
        };
    }
}

// Singleton instance
const adaptiveAnalyzer = new AdaptiveAnalyzer();

module.exports = {
    AdaptiveAnalyzer,
    adaptiveAnalyzer,
    selectStrategy: (evasionResults, features) =>
        adaptiveAnalyzer.selectStrategy(evasionResults, features)
};
