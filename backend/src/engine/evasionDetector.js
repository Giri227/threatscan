const logger = require('../utils/logger');

/**
 * Evasion Detection Engine
 * Detects anti-analysis and evasion techniques used by malware
 */
class EvasionDetector {
    constructor() {
        // Evasion technique patterns
        this.evasionPatterns = {
            // Time-based evasion
            timeBased: {
                patterns: [
                    /Sleep\s*\(\s*[0-9]{5,}\s*\)/i,  // Long sleep calls
                    /GetTickCount/i,
                    /QueryPerformanceCounter/i,
                    /timeGetTime/i,
                    /GetSystemTime/i,
                    /delay\s*\(\s*[0-9]{4,}\s*\)/i
                ],
                threshold: 2,
                score: 25
            },

            // Sandbox detection
            sandboxDetection: {
                patterns: [
                    /VirtualBox/i,
                    /VMware/i,
                    /QEMU/i,
                    /Xen/i,
                    /Parallels/i,
                    /Sandboxie/i,
                    /Cuckoo/i,
                    /WINE/i,
                    /vbox/i,
                    /vmtoolsd/i,
                    /VBoxService/i,
                    /HKEY.*HARDWARE.*ACPI.*DSDT.*VBOX/i,
                    /HKEY.*HARDWARE.*ACPI.*DSDT.*QEMU/i,
                    /\\\\\.\\\\VBoxMiniRdrDN/i,
                    /Red\s*Pill/i  // Red Pill technique
                ],
                threshold: 2,
                score: 30
            },

            // Debugger detection
            debuggerDetection: {
                patterns: [
                    /IsDebuggerPresent/i,
                    /CheckRemoteDebuggerPresent/i,
                    /NtQueryInformationProcess/i,
                    /OutputDebugString/i,
                    /FindWindow.*ollydbg/i,
                    /FindWindow.*ida/i,
                    /FindWindow.*windbg/i,
                    /ProcessDebugPort/i,
                    /ProcessDebugObjectHandle/i,
                    /DebugActiveProcess/i
                ],
                threshold: 2,
                score: 25
            },

            // API hooking evasion
            apiHookingEvasion: {
                patterns: [
                    /GetProcAddress/i,
                    /LoadLibrary/i,
                    /VirtualProtect/i,
                    /WriteProcessMemory/i,
                    /NtProtectVirtualMemory/i,
                    /Nt.*Direct/i,  // Direct syscalls
                    /syscall/i,
                    /Heaven's\s*Gate/i,
                    /Wow64/i
                ],
                threshold: 3,
                score: 20
            },

            // Environment checks
            environmentChecks: {
                patterns: [
                    /GetSystemMetrics/i,
                    /GetCursorPos/i,
                    /GetForegroundWindow/i,
                    /GetUserName/i,
                    /GetComputerName/i,
                    /GetModuleFileName/i,
                    /GetDiskFreeSpace/i,
                    /GlobalMemoryStatus/i,
                    /GetSystemInfo/i,
                    /cpuid/i
                ],
                threshold: 4,
                score: 15
            },

            // Obfuscation techniques
            obfuscation: {
                patterns: [
                    /base64/i,
                    /rot13/i,
                    /xor/i,
                    /decrypt/i,
                    /deobfuscate/i,
                    /eval\s*\(/i,
                    /exec\s*\(/i,
                    /fromCharCode/i,
                    /String\.fromCharCode/i,
                    /unescape/i,
                    /atob/i
                ],
                threshold: 3,
                score: 20
            }
        };
    }

    /**
     * Detect evasion techniques in file
     * @param {Buffer} fileBuffer - File content
     * @param {object} features - Extracted features
     * @returns {object} - Evasion detection results
     */
    async detect(fileBuffer, features = {}) {
        try {
            const content = fileBuffer ? fileBuffer.toString('binary') : '';
            const detectedTechniques = {};
            let totalScore = 0;

            // Check each evasion category
            for (const [category, config] of Object.entries(this.evasionPatterns)) {
                const matches = [];

                for (const pattern of config.patterns) {
                    if (pattern.test(content)) {
                        matches.push(pattern.toString().replace(/\//g, ''));
                    }
                }

                if (matches.length >= config.threshold) {
                    detectedTechniques[category] = {
                        detected: true,
                        matchCount: matches.length,
                        matches: matches.slice(0, 5), // Limit to first 5
                        score: config.score,
                        severity: this.calculateSeverity(config.score)
                    };
                    totalScore += config.score;
                }
            }

            // Additional heuristics
            const additionalChecks = this.performAdditionalChecks(content, features);
            if (additionalChecks.detected) {
                detectedTechniques.additionalChecks = additionalChecks;
                totalScore += additionalChecks.score;
            }

            const result = {
                status: 'success',
                evasionDetected: Object.keys(detectedTechniques).length > 0,
                score: Math.min(totalScore, 100),
                techniques: detectedTechniques,
                summary: this.generateSummary(detectedTechniques),
                recommendations: this.generateRecommendations(detectedTechniques),
                adaptiveAnalysisRequired: totalScore > 50
            };

            logger.info('Evasion detection completed', {
                detected: result.evasionDetected,
                score: result.score,
                techniques: Object.keys(detectedTechniques).length
            });

            return result;

        } catch (error) {
            logger.error('Evasion detection failed', { error: error.message });
            return {
                status: 'error',
                evasionDetected: false,
                score: 0,
                error: error.message
            };
        }
    }

    /**
     * Perform additional evasion checks
     */
    performAdditionalChecks(content, features) {
        let score = 0;
        const checks = [];

        // Check for excessive entropy (possible encryption/packing)
        if (features.entropy && features.entropy > 7.5) {
            score += 15;
            checks.push('High entropy suggests encryption/packing');
        }

        // Check for very small or very large files
        if (features.size) {
            if (features.size < 10 * 1024 && features.extension === 'exe') {
                score += 10;
                checks.push('Unusually small executable (possible dropper)');
            } else if (features.size > 50 * 1024 * 1024) {
                score += 5;
                checks.push('Very large file (possible bloating technique)');
            }
        }

        // Check for suspicious section names in PE files
        if (features.peAnalysis && features.peAnalysis.sections) {
            const suspiciousSections = features.peAnalysis.sections.filter(s =>
                !s.name.match(/^(\\.text|\\.data|\\.rdata|\\.rsrc|\\.reloc)$/)
            );
            if (suspiciousSections.length > 0) {
                score += 10;
                checks.push(`Non-standard PE sections: ${suspiciousSections.map(s => s.name).join(', ')}`);
            }
        }

        return {
            detected: score > 0,
            score: score,
            checks: checks
        };
    }

    /**
     * Calculate severity based on score
     */
    calculateSeverity(score) {
        if (score >= 30) return 'high';
        if (score >= 20) return 'medium';
        return 'low';
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(techniques) {
        if (Object.keys(techniques).length === 0) {
            return 'No evasion techniques detected';
        }

        const detected = Object.entries(techniques)
            .map(([name, data]) => `${name} (${data.matchCount} indicators)`)
            .join(', ');

        return `Detected evasion techniques: ${detected}`;
    }

    /**
     * Generate analysis recommendations
     */
    generateRecommendations(techniques) {
        const recommendations = [];

        if (techniques.timeBased) {
            recommendations.push('Use accelerated time in sandbox');
            recommendations.push('Monitor for long sleep calls');
        }

        if (techniques.sandboxDetection) {
            recommendations.push('Use bare-metal analysis environment');
            recommendations.push('Employ anti-anti-VM techniques');
            recommendations.push('Consider manual reverse engineering');
        }

        if (techniques.debuggerDetection) {
            recommendations.push('Use stealthy debugging tools');
            recommendations.push('Patch debugger detection checks');
        }

        if (techniques.apiHookingEvasion) {
            recommendations.push('Monitor direct syscalls');
            recommendations.push('Use kernel-level monitoring');
        }

        if (techniques.obfuscation) {
            recommendations.push('Apply deobfuscation techniques');
            recommendations.push('Use automated unpacking tools');
        }

        if (recommendations.length === 0) {
            recommendations.push('Standard analysis techniques are sufficient');
        }

        return recommendations;
    }

    /**
     * Get evasion statistics
     */
    getStats() {
        return {
            categories: Object.keys(this.evasionPatterns).length,
            totalPatterns: Object.values(this.evasionPatterns)
                .reduce((sum, cat) => sum + cat.patterns.length, 0)
        };
    }
}

// Singleton instance
const evasionDetector = new EvasionDetector();

module.exports = {
    EvasionDetector,
    evasionDetector,
    detect: (fileBuffer, features) => evasionDetector.detect(fileBuffer, features)
};
