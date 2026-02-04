const logger = require('../utils/logger');
const { getQueue } = require('../utils/taskQueue');

/**
 * Worker Manager
 * Manages worker pool for distributed analysis
 */
class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.maxWorkers = parseInt(process.env.MAX_WORKERS) || 4;
        this.workerTimeout = 300000; // 5 minutes
        this.taskAssignments = new Map(); // taskId -> workerId

        // Statistics
        this.stats = {
            totalWorkers: 0,
            activeWorkers: 0,
            totalTasksAssigned: 0,
            totalTasksCompleted: 0
        };
    }

    /**
     * Register a worker
     * @param {object} workerInfo - Worker information
     * @returns {string} - Worker ID
     */
    async registerWorker(workerInfo = {}) {
        const workerId = this.generateWorkerId();

        const worker = {
            id: workerId,
            status: 'idle',
            capabilities: workerInfo.capabilities || ['file_scan', 'url_scan'],
            currentTask: null,
            tasksCompleted: 0,
            tasksFailed: 0,
            registeredAt: Date.now(),
            lastHeartbeat: Date.now(),
            load: 0,
            performance: {
                averageTaskTime: 0,
                successRate: 1.0
            }
        };

        this.workers.set(workerId, worker);
        this.stats.totalWorkers++;
        this.stats.activeWorkers++;

        logger.info('Worker registered', {
            workerId: workerId,
            capabilities: worker.capabilities,
            totalWorkers: this.workers.size
        });

        return workerId;
    }

    /**
     * Unregister a worker
     * @param {string} workerId - Worker ID
     */
    async unregisterWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            logger.warn('Worker not found', { workerId });
            return;
        }

        // If worker has current task, mark it as failed
        if (worker.currentTask) {
            const queue = getQueue();
            await queue.fail(worker.currentTask, new Error('Worker unregistered'));
        }

        this.workers.delete(workerId);
        this.stats.activeWorkers--;

        logger.info('Worker unregistered', {
            workerId: workerId,
            tasksCompleted: worker.tasksCompleted,
            remainingWorkers: this.workers.size
        });
    }

    /**
     * Select best worker for task
     * @param {object} task - Task to assign
     * @returns {string|null} - Worker ID or null if no suitable worker
     */
    selectWorker(task) {
        const suitableWorkers = [];

        for (const [workerId, worker] of this.workers.entries()) {
            // Skip busy workers
            if (worker.status !== 'idle') {
                continue;
            }

            // Check if worker has required capability
            if (!worker.capabilities.includes(task.type)) {
                continue;
            }

            suitableWorkers.push({ workerId, worker });
        }

        if (suitableWorkers.length === 0) {
            return null;
        }

        // Select worker with best performance and lowest load
        suitableWorkers.sort((a, b) => {
            // Primary: Success rate
            const successDiff = b.worker.performance.successRate - a.worker.performance.successRate;
            if (Math.abs(successDiff) > 0.1) {
                return successDiff > 0 ? 1 : -1;
            }

            // Secondary: Load
            return a.worker.load - b.worker.load;
        });

        return suitableWorkers[0].workerId;
    }

    /**
     * Assign task to worker
     * @param {string} workerId - Worker ID
     * @param {string} taskId - Task ID
     */
    async assignTask(workerId, taskId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            throw new Error('Worker not found');
        }

        if (worker.status !== 'idle') {
            throw new Error('Worker is busy');
        }

        worker.status = 'busy';
        worker.currentTask = taskId;
        worker.load++;

        this.taskAssignments.set(taskId, workerId);
        this.stats.totalTasksAssigned++;

        logger.info('Task assigned to worker', {
            workerId: workerId,
            taskId: taskId,
            workerLoad: worker.load
        });
    }

    /**
     * Mark task as completed by worker
     * @param {string} workerId - Worker ID
     * @param {string} taskId - Task ID
     * @param {number} duration - Task duration in ms
     */
    async completeTask(workerId, taskId, duration) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            logger.warn('Worker not found', { workerId });
            return;
        }

        worker.status = 'idle';
        worker.currentTask = null;
        worker.tasksCompleted++;
        worker.load = Math.max(0, worker.load - 1);

        // Update performance metrics
        const totalTasks = worker.tasksCompleted + worker.tasksFailed;
        worker.performance.successRate = worker.tasksCompleted / totalTasks;

        if (worker.performance.averageTaskTime === 0) {
            worker.performance.averageTaskTime = duration;
        } else {
            worker.performance.averageTaskTime =
                (worker.performance.averageTaskTime * (totalTasks - 1) + duration) / totalTasks;
        }

        this.taskAssignments.delete(taskId);
        this.stats.totalTasksCompleted++;

        logger.info('Task completed by worker', {
            workerId: workerId,
            taskId: taskId,
            duration: duration,
            successRate: worker.performance.successRate.toFixed(2)
        });
    }

    /**
     * Mark task as failed by worker
     * @param {string} workerId - Worker ID
     * @param {string} taskId - Task ID
     */
    async failTask(workerId, taskId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            logger.warn('Worker not found', { workerId });
            return;
        }

        worker.status = 'idle';
        worker.currentTask = null;
        worker.tasksFailed++;
        worker.load = Math.max(0, worker.load - 1);

        // Update performance metrics
        const totalTasks = worker.tasksCompleted + worker.tasksFailed;
        worker.performance.successRate = worker.tasksCompleted / totalTasks;

        this.taskAssignments.delete(taskId);

        logger.warn('Task failed by worker', {
            workerId: workerId,
            taskId: taskId,
            successRate: worker.performance.successRate.toFixed(2)
        });
    }

    /**
     * Update worker heartbeat
     * @param {string} workerId - Worker ID
     */
    async heartbeat(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            logger.warn('Worker not found for heartbeat', { workerId });
            return false;
        }

        worker.lastHeartbeat = Date.now();
        return true;
    }

    /**
     * Check for dead workers (no heartbeat)
     */
    async checkDeadWorkers() {
        const now = Date.now();
        const deadWorkers = [];

        for (const [workerId, worker] of this.workers.entries()) {
            if (now - worker.lastHeartbeat > this.workerTimeout) {
                deadWorkers.push(workerId);
            }
        }

        for (const workerId of deadWorkers) {
            logger.warn('Worker appears dead, unregistering', { workerId });
            await this.unregisterWorker(workerId);
        }

        return deadWorkers.length;
    }

    /**
     * Get worker statistics
     */
    getStats() {
        const workerStats = Array.from(this.workers.values()).map(w => ({
            id: w.id,
            status: w.status,
            tasksCompleted: w.tasksCompleted,
            tasksFailed: w.tasksFailed,
            successRate: w.performance.successRate,
            averageTaskTime: w.performance.averageTaskTime,
            load: w.load
        }));

        return {
            ...this.stats,
            currentWorkers: this.workers.size,
            workers: workerStats
        };
    }

    /**
     * Get worker by ID
     */
    getWorker(workerId) {
        return this.workers.get(workerId);
    }

    /**
     * Generate unique worker ID
     */
    generateWorkerId() {
        return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Auto-scale workers based on queue size
     * @param {number} queueSize - Current queue size
     */
    async autoScale(queueSize) {
        const idleWorkers = Array.from(this.workers.values())
            .filter(w => w.status === 'idle').length;

        // Scale up if queue is growing and we have capacity
        if (queueSize > idleWorkers * 2 && this.workers.size < this.maxWorkers) {
            logger.info('Auto-scaling: Adding worker', {
                queueSize: queueSize,
                currentWorkers: this.workers.size
            });
            await this.registerWorker({
                capabilities: ['file_scan', 'url_scan']
            });
        }

        // Scale down if too many idle workers
        if (idleWorkers > 3 && this.workers.size > 2) {
            const idleWorkerIds = Array.from(this.workers.entries())
                .filter(([_, w]) => w.status === 'idle')
                .map(([id, _]) => id);

            if (idleWorkerIds.length > 0) {
                logger.info('Auto-scaling: Removing idle worker', {
                    idleWorkers: idleWorkers,
                    currentWorkers: this.workers.size
                });
                await this.unregisterWorker(idleWorkerIds[0]);
            }
        }
    }
}

// Singleton instance
const workerManager = new WorkerManager();

// Periodic dead worker check (every 2 minutes)
setInterval(() => {
    workerManager.checkDeadWorkers();
}, 120000);

module.exports = {
    WorkerManager,
    workerManager
};
