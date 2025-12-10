/**
 * Task status enumeration
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  PLANNING = 'PLANNING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Task step status
 */
export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Task step definition
 */
export interface TaskStep {
  id: string;
  description: string;
  toolName: string;
  params: Record<string, any>;
  requiredCapabilities?: string[];
  assignedPeerId?: string;
  status: StepStatus;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  steps: TaskStep[];
  plan?: string;
  userId: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Task manager for tracking and executing multi-step tasks
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  /**
   * Create a new task
   */
  create(description: string, userId: string): Task {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      status: TaskStatus.PENDING,
      steps: [],
      userId,
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Get task by ID
   */
  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by user
   */
  getByUser(userId: string): Task[] {
    return this.getAll().filter(t => t.userId === userId);
  }

  /**
   * Get tasks by status
   */
  getByStatus(status: TaskStatus): Task[] {
    return this.getAll().filter(t => t.status === status);
  }

  /**
   * Update task status
   */
  updateStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      
      if (status === TaskStatus.RUNNING && !task.startedAt) {
        task.startedAt = new Date();
      }
      
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
        task.completedAt = new Date();
      }
    }
  }

  /**
   * Add step to task
   */
  addStep(taskId: string, step: Omit<TaskStep, 'id' | 'status'>): TaskStep | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const newStep: TaskStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: StepStatus.PENDING,
    };

    task.steps.push(newStep);
    return newStep;
  }

  /**
   * Update step status
   */
  updateStep(taskId: string, stepId: string, update: Partial<TaskStep>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    const step = task.steps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, update);
      
      if (update.status === StepStatus.RUNNING && !step.startTime) {
        step.startTime = new Date();
      }
      
      if ((update.status === StepStatus.COMPLETED || update.status === StepStatus.FAILED) && !step.endTime) {
        step.endTime = new Date();
        if (step.startTime) {
          step.duration = step.endTime.getTime() - step.startTime.getTime();
        }
      }
    }
  }

  /**
   * Set task plan
   */
  setPlan(taskId: string, plan: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.plan = plan;
    }
  }

  /**
   * Delete task
   */
  delete(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
  }

  /**
   * Get task statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      pending: all.filter(t => t.status === TaskStatus.PENDING).length,
      running: all.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: all.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: all.filter(t => t.status === TaskStatus.FAILED).length,
    };
  }
}

/**
 * Create a task manager instance
 */
export function createTaskManager(): TaskManager {
  return new TaskManager();
}
