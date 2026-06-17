import { randomUUID } from 'crypto';

const EXPIRY_MS = 10 * 60 * 1000;

export class TaskRegistry {
    constructor() {
        this.tasks = new Map();
        this.agentCurrentTask = new Map();

        setInterval(() => this._cleanup(), 60_000);
    }

    create(agentName, startTurnId) {
        const id = randomUUID();
        const task = {
            id,
            agentName,
            status: 'running',
            reason: null,
            startTurnId,
            chatHistory: null,
            createdAt: Date.now(),
            completedAt: null,
        };
        this.tasks.set(id, task);
        this.agentCurrentTask.set(agentName, id);
        return task;
    }

    get(id) {
        return this.tasks.get(id) || null;
    }

    getCurrentForAgent(agentName) {
        const taskId = this.agentCurrentTask.get(agentName);
        if (!taskId) return null;
        const task = this.tasks.get(taskId);
        if (task && task.status === 'running') return task;
        return null;
    }

    interrupt(agentName, chatHistory = []) {
        const current = this.getCurrentForAgent(agentName);
        if (current) {
            current.status = 'interrupted';
            current.reason = 'interrupted';
            current.completedAt = Date.now();
            current.chatHistory = chatHistory;
            this.agentCurrentTask.delete(agentName);
        }
        return current;
    }

    interruptTask(taskId, reason, chatHistory = []) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'running') return;
        task.status = 'interrupted';
        task.reason = reason;
        task.completedAt = Date.now();
        task.chatHistory = chatHistory;
        if (this.agentCurrentTask.get(task.agentName) === taskId) {
            this.agentCurrentTask.delete(task.agentName);
        }
    }

    finish(taskId, reason, chatHistory) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'running') return;
        task.status = 'finished';
        task.reason = reason;
        task.chatHistory = chatHistory;
        task.completedAt = Date.now();
        if (this.agentCurrentTask.get(task.agentName) === taskId) {
            this.agentCurrentTask.delete(task.agentName);
        }
    }

    _cleanup() {
        const now = Date.now();
        for (const [id, task] of this.tasks) {
            if (task.completedAt && (now - task.completedAt) > EXPIRY_MS) {
                this.tasks.delete(id);
            }
        }
    }
}

export const taskRegistry = new TaskRegistry();
