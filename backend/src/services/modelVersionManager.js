const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Model Version Manager
 * Manages ML model versions with A/B testing and rollback capabilities
 */
class ModelVersionManager {
    constructor() {
        this.modelsDir = path.join(__dirname, '../../models');
        this.versionsFile = path.join(this.modelsDir, 'versions.json');
        this.versions = [];
        this.currentVersion = null;
        this.abTestConfig = null;

        this.loadVersions();
    }

    /**
     * Load version history
     */
    async loadVersions() {
        try {
            await fs.mkdir(this.modelsDir, { recursive: true });

            try {
                const content = await fs.readFile(this.versionsFile, 'utf8');
                const data = JSON.parse(content);
                this.versions = data.versions || [];
                this.currentVersion = data.currentVersion || null;
                this.abTestConfig = data.abTestConfig || null;
            } catch (error) {
                // File doesn't exist yet
                this.versions = [];
                await this.saveVersions();
            }
        } catch (error) {
            logger.error('Failed to load versions', { error: error.message });
        }
    }

    /**
     * Save version history
     */
    async saveVersions() {
        const data = {
            versions: this.versions,
            currentVersion: this.currentVersion,
            abTestConfig: this.abTestConfig,
            lastUpdated: Date.now()
        };

        await fs.writeFile(
            this.versionsFile,
            JSON.stringify(data, null, 2),
            'utf8'
        );
    }

    /**
     * Create new model version
     * @param {object} versionInfo - Version information
     * @returns {string} - Version ID
     */
    async createVersion(versionInfo) {
        const versionId = this.generateVersionId();

        const version = {
            id: versionId,
            name: versionInfo.name || `Model v${this.versions.length + 1}`,
            createdAt: Date.now(),
            createdBy: versionInfo.createdBy || 'system',

            // Model metadata
            modelPath: versionInfo.modelPath,
            modelType: versionInfo.modelType || 'tensorflow',
            architecture: versionInfo.architecture,

            // Training info
            trainingData: {
                samples: versionInfo.trainingSamples || 0,
                epochs: versionInfo.epochs || 0,
                accuracy: versionInfo.accuracy || 0,
                precision: versionInfo.precision || 0,
                recall: versionInfo.recall || 0,
                f1Score: versionInfo.f1Score || 0
            },

            // Performance metrics
            performance: {
                detectionRate: 0,
                falsePositiveRate: 0,
                averageConfidence: 0,
                scanCount: 0
            },

            // Status
            status: 'created', // created, testing, active, deprecated
            isProduction: false,
            abTestGroup: null
        };

        this.versions.push(version);
        await this.saveVersions();

        logger.info('Model version created', {
            versionId: versionId,
            name: version.name
        });

        return versionId;
    }

    /**
     * Deploy version to production
     * @param {string} versionId - Version ID
     * @param {boolean} abTest - Enable A/B testing
     */
    async deployVersion(versionId, abTest = false) {
        const version = this.getVersion(versionId);
        if (!version) {
            throw new Error('Version not found');
        }

        if (abTest) {
            // Set up A/B test
            await this.setupABTest(versionId);
        } else {
            // Direct deployment
            if (this.currentVersion) {
                const oldVersion = this.getVersion(this.currentVersion);
                if (oldVersion) {
                    oldVersion.isProduction = false;
                    oldVersion.status = 'deprecated';
                }
            }

            version.isProduction = true;
            version.status = 'active';
            this.currentVersion = versionId;
            this.abTestConfig = null;
        }

        await this.saveVersions();

        logger.info('Model version deployed', {
            versionId: versionId,
            abTest: abTest
        });
    }

    /**
     * Set up A/B testing
     */
    async setupABTest(newVersionId) {
        const newVersion = this.getVersion(newVersionId);
        const currentVersion = this.currentVersion ? this.getVersion(this.currentVersion) : null;

        if (!currentVersion) {
            throw new Error('No current version to A/B test against');
        }

        this.abTestConfig = {
            enabled: true,
            startedAt: Date.now(),
            versionA: {
                id: this.currentVersion,
                name: currentVersion.name,
                traffic: 0.5, // 50% traffic
                scanCount: 0,
                performance: { ...currentVersion.performance }
            },
            versionB: {
                id: newVersionId,
                name: newVersion.name,
                traffic: 0.5, // 50% traffic
                scanCount: 0,
                performance: { ...newVersion.performance }
            },
            duration: 7 * 24 * 60 * 60 * 1000, // 7 days
            minSamples: 1000
        };

        newVersion.status = 'testing';
        newVersion.abTestGroup = 'B';
        currentVersion.abTestGroup = 'A';

        await this.saveVersions();

        logger.info('A/B test configured', {
            versionA: this.currentVersion,
            versionB: newVersionId
        });
    }

    /**
     * Select version for scan (A/B testing)
     */
    selectVersionForScan() {
        if (!this.abTestConfig || !this.abTestConfig.enabled) {
            return this.currentVersion;
        }

        // Random selection based on traffic split
        const random = Math.random();
        const selectedVersion = random < this.abTestConfig.versionA.traffic
            ? this.abTestConfig.versionA.id
            : this.abTestConfig.versionB.id;

        return selectedVersion;
    }

    /**
     * Update version performance metrics
     */
    async updatePerformance(versionId, metrics) {
        const version = this.getVersion(versionId);
        if (!version) return;

        // Update performance metrics
        Object.assign(version.performance, metrics);
        version.performance.scanCount++;

        // Update A/B test stats if applicable
        if (this.abTestConfig && this.abTestConfig.enabled) {
            if (versionId === this.abTestConfig.versionA.id) {
                this.abTestConfig.versionA.scanCount++;
                Object.assign(this.abTestConfig.versionA.performance, metrics);
            } else if (versionId === this.abTestConfig.versionB.id) {
                this.abTestConfig.versionB.scanCount++;
                Object.assign(this.abTestConfig.versionB.performance, metrics);
            }

            // Check if A/B test should conclude
            await this.checkABTestCompletion();
        }

        await this.saveVersions();
    }

    /**
     * Check if A/B test should conclude
     */
    async checkABTestCompletion() {
        if (!this.abTestConfig || !this.abTestConfig.enabled) return;

        const elapsed = Date.now() - this.abTestConfig.startedAt;
        const totalScans = this.abTestConfig.versionA.scanCount + this.abTestConfig.versionB.scanCount;

        // Conclude if duration exceeded or min samples reached
        if (elapsed > this.abTestConfig.duration || totalScans >= this.abTestConfig.minSamples) {
            await this.concludeABTest();
        }
    }

    /**
     * Conclude A/B test and select winner
     */
    async concludeABTest() {
        if (!this.abTestConfig) return;

        const perfA = this.abTestConfig.versionA.performance;
        const perfB = this.abTestConfig.versionB.performance;

        // Simple comparison: higher detection rate with lower false positive rate
        const scoreA = perfA.detectionRate - perfA.falsePositiveRate;
        const scoreB = perfB.detectionRate - perfB.falsePositiveRate;

        const winner = scoreB > scoreA ? this.abTestConfig.versionB.id : this.abTestConfig.versionA.id;

        logger.info('A/B test concluded', {
            winner: winner,
            scoreA: scoreA.toFixed(2),
            scoreB: scoreB.toFixed(2)
        });

        // Deploy winner
        await this.deployVersion(winner, false);
    }

    /**
     * Rollback to previous version
     */
    async rollback() {
        if (this.versions.length < 2) {
            throw new Error('No previous version to rollback to');
        }

        // Find last production version
        const previousVersion = this.versions
            .filter(v => v.status === 'deprecated')
            .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (!previousVersion) {
            throw new Error('No previous version found');
        }

        await this.deployVersion(previousVersion.id, false);

        logger.info('Rolled back to previous version', {
            versionId: previousVersion.id,
            name: previousVersion.name
        });
    }

    /**
     * Get version by ID
     */
    getVersion(versionId) {
        return this.versions.find(v => v.id === versionId);
    }

    /**
     * Get current version
     */
    getCurrentVersion() {
        return this.currentVersion ? this.getVersion(this.currentVersion) : null;
    }

    /**
     * Get all versions
     */
    getAllVersions() {
        return this.versions;
    }

    /**
     * Get A/B test status
     */
    getABTestStatus() {
        return this.abTestConfig;
    }

    /**
     * Generate version ID
     */
    generateVersionId() {
        return `v${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
}

// Singleton instance
const modelVersionManager = new ModelVersionManager();

module.exports = {
    ModelVersionManager,
    modelVersionManager
};
