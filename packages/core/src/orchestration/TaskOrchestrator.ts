import { EventEmitter } from 'events';
import { ProcessManager } from '../os/ProcessManager';
import { AITask, TaskStep, TaskStorage } from '@repo/types';

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies?: string[];
  execute: () => Promise<any>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: Error;
}

/**
 * Task orchestrator for managing task execution
 */
export class TaskOrchestrator extends EventEmitter {
  private tasks: Map<string, Task>;
  private aiTasks: Map<string, AITask>;
  private queue: Task[];
  private running: Set<string>;
  private maxConcurrent: number;
  private processManager: ProcessManager;
  private storage?: TaskStorage;
  private toolExecutor?: (tool: string, args: any, stepId?: string) => Promise<any>;

  constructor(maxConcurrent: number = 5, storage?: TaskStorage) {
    super();
    this.tasks = new Map();
    this.aiTasks = new Map();
    this.queue = [];
    this.running = new Set();
    this.maxConcurrent = maxConcurrent;
    this.processManager = new ProcessManager();
    this.storage = storage;
  }

  setToolExecutor(executor: (tool: string, args: any, stepId?: string) => Promise<any>) {
    this.toolExecutor = executor;
  }

  /**
   * Submit an AI Task for execution
   */
  async submitAITask(task: AITask): Promise<void> {
    this.aiTasks.set(task.id, task);
    
    // Persist initial state
    if (this.storage) {
      await this.storage.saveTask(task);
    }
    
    this.emit('aitask:created', task);

    // Create wrapper task for execution
    const wrapperTask: Omit<Task, 'status' | 'createdAt'> = {
      id: task.id, // Use same ID or derived
      name: `AI Task: ${task.prompt.substring(0, 30)}...`,
      priority: TaskPriority.NORMAL,
      execute: async () => this.executeAITaskSteps(task)
    };

    this.addTask(wrapperTask);
  }

  private async executeAITaskSteps(task: AITask): Promise<any> {
    if (!this.toolExecutor) {
      throw new Error('Tool executor not configured for AI tasks');
    }

    if (this.storage) {
        await this.storage.updateTaskStatus(task.id, 'running');
    }
    task.status = 'running';
    this.emit('aitask:updated', task);

    const results: any[] = [];

    for (const step of task.steps) {
      if (step.status === 'completed') continue; // Skip already completed steps if resuming
      
      try {
        // Update step status
        step.status = 'running';
        step.startedAt = Date.now();
        task.currentStepId = step.id;
        
        if (this.storage) {
            await this.storage.updateStepStatus(task.id, step.id, 'running');
        }
        this.emit('aitask:step-started', { taskId: task.id, step });

        // Execute tool
        const result = await this.toolExecutor(step.tool, step.args, step.id);
        
        // Complete step
        step.status = 'completed';
        step.result = result;
        step.completedAt = Date.now();
        results.push(result);

        if (this.storage) {
            await this.storage.updateStepStatus(task.id, step.id, 'completed', result);
        }
        this.emit('aitask:step-completed', { taskId: task.id, step, result });
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;
        step.completedAt = Date.now();
        task.status = 'failed';
        
        if (this.storage) {
            await this.storage.updateStepStatus(task.id, step.id, 'failed', undefined, error.message);
            await this.storage.updateTaskStatus(task.id, 'failed');
        }
        this.emit('aitask:step-failed', { taskId: task.id, step, error });
        this.emit('aitask:failed', { taskId: task.id, error });
        
        throw error; // Stop execution
      }
    }

    task.status = 'completed';
    if (this.storage) {
        await this.storage.updateTaskStatus(task.id, 'completed');
    }
    this.emit('aitask:completed', task);
    return results;
  }

  /**
   * Add a task to the orchestrator
   */
  addTask(task: Omit<Task, 'status' | 'createdAt'>): Task {
    const fullTask: Task = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, fullTask);
    this.emit('task:added', fullTask);

    // Check if dependencies are met
    if (this.areDependenciesMet(fullTask)) {
      this.queueTask(fullTask);
    }

    return fullTask;
  }

  /**
   * Queue a task for execution
   */
  private queueTask(task: Task): void {
    task.status = TaskStatus.QUEUED;
    
    // Insert task in priority order
    const index = this.queue.findIndex((t) => t.priority < task.priority);
    if (index === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(index, 0, task);
    }

    this.emit('task:queued', task);
    this.processQueue();
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: Task): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((depId) => {
      const dep = this.tasks.get(depId);
      return dep?.status === TaskStatus.COMPLETED;
    });
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.running.size < this.maxConcurrent
    ) {
      const task = this.queue.shift();
      if (!task) break;

      this.executeTask(task);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task): Promise<void> {
    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.running.add(task.id);

    this.emit('task:started', task);

    try {
      const result = await task.execute();
      
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Date.now();
      task.result = result;

      this.emit('task:completed', task);

      // Check if any waiting tasks can now run
      this.checkWaitingTasks(task.id);
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.completedAt = Date.now();
      task.error = error as Error;

      this.emit('task:failed', task);
    } finally {
      this.running.delete(task.id);
      this.processQueue();
    }
  }

  /**
   * Check if any tasks are waiting for this task
   */
  private checkWaitingTasks(completedTaskId: string): void {
    for (const task of this.tasks.values()) {
      if (
        task.status === TaskStatus.PENDING &&
        task.dependencies?.includes(completedTaskId) &&
        this.areDependenciesMet(task)
      ) {
        this.queueTask(task);
      }
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.RUNNING) {
      // For AI tasks, we might want to try to cancel the current step too
      // throw new Error(`Cannot cancel running task ${taskId}`);
    }

    task.status = TaskStatus.CANCELLED;
    
    // Remove from queue if present
    const index = this.queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    this.emit('task:cancelled', task);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }
  
  getAITask(taskId: string): AITask | undefined {
    return this.aiTasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForAll(timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.running.size === 0 && this.queue.length === 0) {
          cleanup();
          resolve();
        }
      };

      const onTaskCompleted = () => check();
      const onTaskFailed = () => check();

      const cleanup = () => {
        this.off('task:completed', onTaskCompleted);
        this.off('task:failed', onTaskFailed);
        if (timer) clearTimeout(timer);
      };

      this.on('task:completed', onTaskCompleted);
      this.on('task:failed', onTaskFailed);

      let timer: NodeJS.Timeout | undefined;
      if (timeout) {
        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for tasks after ${timeout}ms`));
        }, timeout);
      }

      check();
    });
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      total: this.tasks.size,
      aiTasks: this.aiTasks.size,
      pending: this.getTasksByStatus(TaskStatus.PENDING).length,
      queued: this.queue.length,
      running: this.running.size,
      completed: this.getTasksByStatus(TaskStatus.COMPLETED).length,
      failed: this.getTasksByStatus(TaskStatus.FAILED).length,
      cancelled: this.getTasksByStatus(TaskStatus.CANCELLED).length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}
