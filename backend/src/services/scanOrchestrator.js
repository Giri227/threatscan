const logger = require('../utils/logger');
const { getQueue } = require('../utils/taskQueue');
const { workerManager } = require('../utils/workerManager');

/**
 * Distributed Scan Orchestrator
 * Coordinates distributed malware analysis across worker pool
 */
class ScanOrchestrator {
    constructor() {
        this.queue = getQueue('scan_queue');
        this.resultCache = new Map();
        this.maxCacheSize = 500;
        this.enabled = process.env.DISTRIBUTED_MODE === 'true';
    }

    /**
     * Submit scan task for distributed processing
     * @param {object} scanRequest - Scan request details
     * @returns {string} - Task ID
     */
    async submitScan(scanRequest) {
        try {
            // Determine task type and priority
            const taskType = scanRequest.type || 'file_scan';
            const priority = this.calculatePriority(scanRequest);

            // Create task
            const task = {
                type: taskType,
                priority: priority,
                data: scanRequest,
                submittedBy: scanRequest.userId || 'anonymous',
                metadata: {
                    fileName: scanRequest.fileName,
                    fileSize: scanRequest.fileSize,
                    hash: scanRequest.hash
                }
            };

            // Enqueue task
            const taskId = await this.queue.enqueue(task);

            // Try to assign to worker immediately
            await this.processQueue();

            logger.info('Scan task submitted', {
                taskId: taskId,
                type: taskType,
                priority: priority
            });

            return taskId;

        } catch (error) {
            logger.error('Failed to submit scan task', { error: error.message });
            throw error;
        }
    }

    /**
     * Process queue and assign tasks to workers
     */
    async processQueue() {
        try {
            // Auto-scale workers based on queue size
            const queueStats = this.queue.getStats();
            await workerManager.autoScale(queueStats.currentQueueSize);

            // Assign tasks to available workers
            let assigned = 0;
            while (true) {
                const task = await this.queue.dequeue();
                if (!task) {
                    break; // Queue empty
                }

                const workerId = workerManager.selectWorker(task);
                if (!workerId) {
                    // No suitable worker, put task back
                    this.queue.queue.unshift(task);
                    break;
                }

                await workerManager.assignTask(workerId, task.id);
                assigned++;

                // Trigger actual processing (in real implementation, this would notify the worker)
                this.processTask(workerId, task).catch(error => {
                    logger.error('Task processing failed', {
                        taskId: task.id,
                        error: error.message
                    });
                });
            }

            if (assigned > 0) {
                logger.info('Tasks assigned to workers', { count: assigned });
            }

        } catch (error) {
            logger.error('Queue processing failed', { error: error.message });
        }
    }

    /**
     * Process task (simulated worker execution)
     * In production, this would be handled by actual worker processes
     */
    async processTask(workerId, task) {
        const startTime = Date.now();

        try {
            // Simulate task processing
            // In production, this would call the actual scan engines
            logger.info('Processing task', {
                workerId: workerId,
                taskId: task.id,
                type: task.type
            });

            // Placeholder result
            const result = {
                taskId: task.id,
                status: 'success',
                verdict: 'Safe',
                score: 25,
                processedBy: workerId,
                timestamp: Date.now()
            };

            // Mark task as completed
            const duration = Date.now() - startTime;
            await this.queue.complete(task.id, result);
            await workerManager.completeTask(workerId, task.id, duration);

            // Cache result
            this.cacheResult(task.id, result);

            return result;

        } catch (error) {
            await this.queue.fail(task.id, error);
            await workerManager.failTask(workerId, task.id);
            throw error;
        }
    }

    /**
     * Calculate task priority
     */
    calculatePriority(scanRequest) {
        let priority = 0;

        // Higher priority for larger files (may be more dangerous)
        if (scanRequest.fileSize > 10 * 1024 * 1024) {
            priority += 2;
        }

        // Higher priority for executable files
        if (scanRequest.fileName && /\.(exe|dll|scr|bat|cmd|ps1)$/i.test(scanRequest.fileName)) {
            priority += 3;
        }

        // Higher priority for premium users
        if (scanRequest.userTier === 'premium') {
            priority += 5;
        }

        // Higher priority for urgent scans
        if (scanRequest.urgent) {
            priority += 10;
        }

        return priority;
    }

    /**
     * Get scan result
     * @param {string} taskId - Task ID
     * @returns {object|null} - Scan result or null
     */
    async getResult(taskId) {
        // Check cache first
        if (this.resultCache.has(taskId)) {
            return this.resultCache.get(taskId);
        }

        // Check queue status
        const taskStatus = await this.queue.getStatus(taskId);
        if (!taskStatus) {
            return null;
        }

        if (taskStatus.status === 'completed') {
            this.cacheResult(taskId, taskStatus.result);
            return taskStatus.result;
        }

        // Return status for pending/processing tasks
        return {
            taskId: taskId,
            status: taskStatus.status,
            progress: this.calculateProgress(taskStatus)
        };
    }

    /**
     * Calculate task progress
     */
    calculateProgress(task) {
        if (task.status === 'completed') return 100;
        if (task.status === 'failed') return 0;
        if (task.status === 'processing') {
            const elapsed = Date.now() - task.startedAt;
            const estimated = 30000; // 30 seconds average
            return Math.min(95, Math.round((elapsed / estimated) * 100));
        }
        return 0; // queued
    }

    /**
     * Cache result
     */
    cacheResult(taskId, result) {
        if (this.resultCache.size >= this.maxCacheSize) {
            const oldestKey = this.resultCache.keys().next().value;
            this.resultCache.delete(oldestKey);
        }
        this.resultCache.set(taskId, result);
    }

    /**
     * Get orchestrator statistics
     */
    getStats() {
        return {
            queue: this.queue.getStats(),
            workers: workerManager.getStats(),
            cache: {
                size: this.resultCache.size,
                maxSize: this.maxCacheSize
            },
            enabled: this.enabled
        };
    }

    /**
     * Initialize worker pool
     */
    async initialize(workerCount = 2) {
        logger.info('Initializing scan orchestrator', { workerCount });

        for (let i = 0; i < workerCount; i++) {
            await workerManager.registerWorker({
                capabilities: ['file_scan', 'url_scan']
            });
        }

        // Start queue processor
        this.startQueueProcessor();

        logger.info('Scan orchestrator initialized', {
            workers: workerManager.getStats().currentWorkers
        });
    }

    /**
     * Start periodic queue processor
     */
    startQueueProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 5000); // Process every 5 seconds
    }
}

// Singleton instance
const scanOrchestrator = new ScanOrchestrator();

module.exports = {
    ScanOrchestrator,
    scanOrchestrator
};
