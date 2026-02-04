const logger = require('../utils/logger');

/**
 * Task Queue System (Lightweight Implementation)
 * 
 * NOTE: This is a simplified in-memory task queue.
 * For production, use Bull (Redis-based) or RabbitMQ.
 * 
 * To upgrade to Bull:
 * 1. npm install bull redis
 * 2. Replace this with Bull queue implementation
 * 3. Configure Redis connection
 */
class TaskQueue {
    constructor(name = 'default') {
        this.name = name;
        this.queue = [];
        this.processing = new Map();
        this.completed = new Map();
        this.failed = new Map();
        this.maxQueueSize = 1000;
        this.maxRetries = 3;
        this.taskTimeout = 300000; // 5 minutes

        // Statistics
        this.stats = {
            totalEnqueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            currentQueueSize: 0
        };
    }

    /**
     * Add task to queue
     * @param {object} task - Task object
     * @returns {string} - Task ID
     */
    async enqueue(task) {
        if (this.queue.length >= this.maxQueueSize) {
            throw new Error('Queue is full');
        }

        const taskId = this.generateTaskId();
        const queuedTask = {
            id: taskId,
            ...task,
            status: 'queued',
            priority: task.priority || 0,
            retries: 0,
            enqueuedAt: Date.now(),
            startedAt: null,
            completedAt: null
        };

        // Insert based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(t => t.priority < queuedTask.priority);
        if (insertIndex === -1) {
            this.queue.push(queuedTask);
        } else {
            this.queue.splice(insertIndex, 0, queuedTask);
        }

        this.stats.totalEnqueued++;
        this.stats.currentQueueSize = this.queue.length;

        logger.info('Task enqueued', {
            taskId: taskId,
            type: task.type,
            priority: task.priority,
            queueSize: this.queue.length
        });

        return taskId;
    }

    /**
     * Get next task from queue
     * @returns {object|null} - Next task or null if queue is empty
     */
    async dequeue() {
        if (this.queue.length === 0) {
            return null;
        }

        const task = this.queue.shift();
        task.status = 'processing';
        task.startedAt = Date.now();

        this.processing.set(task.id, task);
        this.stats.currentQueueSize = this.queue.length;

        logger.info('Task dequeued', {
            taskId: task.id,
            type: task.type,
            waitTime: task.startedAt - task.enqueuedAt
        });

        return task;
    }

    /**
     * Mark task as completed
     * @param {string} taskId - Task ID
     * @param {object} result - Task result
     */
    async complete(taskId, result) {
        const task = this.processing.get(taskId);
        if (!task) {
            logger.warn('Task not found in processing queue', { taskId });
            return;
        }

        task.status = 'completed';
        task.completedAt = Date.now();
        task.result = result;
        task.duration = task.completedAt - task.startedAt;

        this.processing.delete(taskId);
        this.completed.set(taskId, task);
        this.stats.totalProcessed++;

        // Clean up old completed tasks (keep last 100)
        if (this.completed.size > 100) {
            const oldestKey = this.completed.keys().next().value;
            this.completed.delete(oldestKey);
        }

        logger.info('Task completed', {
            taskId: taskId,
            duration: task.duration,
            type: task.type
        });
    }

    /**
     * Mark task as failed
     * @param {string} taskId - Task ID
     * @param {Error} error - Error object
     */
    async fail(taskId, error) {
        const task = this.processing.get(taskId);
        if (!task) {
            logger.warn('Task not found in processing queue', { taskId });
            return;
        }

        task.retries++;

        // Retry if under max retries
        if (task.retries < this.maxRetries) {
            logger.warn('Task failed, retrying', {
                taskId: taskId,
                retries: task.retries,
                error: error.message
            });

            task.status = 'queued';
            task.error = error.message;
            this.processing.delete(taskId);
            this.queue.push(task); // Add to end of queue
            return;
        }

        // Max retries exceeded
        task.status = 'failed';
        task.completedAt = Date.now();
        task.error = error.message;
        task.duration = task.completedAt - task.startedAt;

        this.processing.delete(taskId);
        this.failed.set(taskId, task);
        this.stats.totalFailed++;

        logger.error('Task failed permanently', {
            taskId: taskId,
            retries: task.retries,
            error: error.message
        });
    }

    /**
     * Get task status
     * @param {string} taskId - Task ID
     * @returns {object|null} - Task status or null
     */
    async getStatus(taskId) {
        // Check processing
        if (this.processing.has(taskId)) {
            return this.processing.get(taskId);
        }

        // Check completed
        if (this.completed.has(taskId)) {
            return this.completed.get(taskId);
        }

        // Check failed
        if (this.failed.has(taskId)) {
            return this.failed.get(taskId);
        }

        // Check queued
        const queuedTask = this.queue.find(t => t.id === taskId);
        if (queuedTask) {
            return queuedTask;
        }

        return null;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            processing: this.processing.size,
            completed: this.completed.size,
            failed: this.failed.size
        };
    }

    /**
     * Clear completed and failed tasks
     */
    cleanup() {
        this.completed.clear();
        this.failed.clear();
        logger.info('Task queue cleaned up');
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check for stuck tasks (timeout)
     */
    async checkTimeouts() {
        const now = Date.now();
        const timedOut = [];

        for (const [taskId, task] of this.processing.entries()) {
            if (now - task.startedAt > this.taskTimeout) {
                timedOut.push(taskId);
            }
        }

        for (const taskId of timedOut) {
            await this.fail(taskId, new Error('Task timeout'));
        }

        if (timedOut.length > 0) {
            logger.warn('Tasks timed out', { count: timedOut.length });
        }
    }
}

// Global queue instances
const queues = new Map();

/**
 * Get or create queue
 * @param {string} name - Queue name
 * @returns {TaskQueue} - Queue instance
 */
function getQueue(name = 'default') {
    if (!queues.has(name)) {
        queues.set(name, new TaskQueue(name));
    }
    return queues.get(name);
}

// Periodic timeout check (every minute)
setInterval(() => {
    for (const queue of queues.values()) {
        queue.checkTimeouts();
    }
}, 60000);

module.exports = {
    TaskQueue,
    getQueue,
    queues
};
