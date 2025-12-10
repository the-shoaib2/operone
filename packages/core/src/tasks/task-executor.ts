import { ToolExecutor, ToolExecutionContext } from '../tools';
import { TaskManager, Task, TaskStatus, StepStatus, TaskStep } from './task-manager';

/**
 * Task executor for running multi-step tasks
 */
export class TaskExecutor {
  constructor(
    private taskManager: TaskManager,
    private toolExecutor: ToolExecutor
  ) {}

  /**
   * Execute a task
   */
  async execute(
    taskId: string,
    context: ToolExecutionContext,
    options?: {
      parallel?: boolean;
      stopOnError?: boolean;
      onStepComplete?: (step: TaskStep) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<{
    success: boolean;
    completedSteps: number;
    failedSteps: number;
    error?: string;
  }> {
    const task = this.taskManager.get(taskId);
    
    if (!task) {
      return {
        success: false,
        completedSteps: 0,
        failedSteps: 0,
        error: `Task ${taskId} not found`,
      };
    }

    // Update task status
    this.taskManager.updateStatus(taskId, TaskStatus.RUNNING);

    let completedSteps = 0;
    let failedSteps = 0;

    try {
      if (options?.parallel) {
        // Execute steps in parallel
        const results = await Promise.allSettled(
          task.steps.map(step => this.executeStep(taskId, step, context, options))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            completedSteps++;
          } else {
            failedSteps++;
          }
        });
      } else {
        // Execute steps sequentially
        for (const step of task.steps) {
          const result = await this.executeStep(taskId, step, context, options);
          
          if (result.success) {
            completedSteps++;
          } else {
            failedSteps++;
            
            if (options?.stopOnError) {
              break;
            }
          }

          // Report progress
          if (options?.onProgress) {
            options.onProgress(completedSteps + failedSteps, task.steps.length);
          }
        }
      }

      // Update final task status
      if (failedSteps === 0) {
        this.taskManager.updateStatus(taskId, TaskStatus.COMPLETED);
      } else if (completedSteps === 0) {
        this.taskManager.updateStatus(taskId, TaskStatus.FAILED);
      } else {
        // Partial completion
        this.taskManager.updateStatus(taskId, TaskStatus.COMPLETED);
      }

      return {
        success: failedSteps === 0,
        completedSteps,
        failedSteps,
      };
    } catch (error) {
      this.taskManager.updateStatus(taskId, TaskStatus.FAILED);
      return {
        success: false,
        completedSteps,
        failedSteps,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    taskId: string,
    step: TaskStep,
    context: ToolExecutionContext,
    options?: {
      onStepComplete?: (step: TaskStep) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    // Update step status to running
    this.taskManager.updateStep(taskId, step.id, {
      status: StepStatus.RUNNING,
    });

    try {
      // Execute the tool
      const result = await this.toolExecutor.execute(
        step.toolName,
        step.params,
        context
      );

      // Update step with result
      this.taskManager.updateStep(taskId, step.id, {
        status: result.success ? StepStatus.COMPLETED : StepStatus.FAILED,
        result: result.data,
        error: result.error,
      });

      // Callback
      if (options?.onStepComplete) {
        const updatedTask = this.taskManager.get(taskId);
        const updatedStep = updatedTask?.steps.find(s => s.id === step.id);
        if (updatedStep) {
          options.onStepComplete(updatedStep);
        }
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.taskManager.updateStep(taskId, step.id, {
        status: StepStatus.FAILED,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Pause a running task
   */
  pause(taskId: string): boolean {
    const task = this.taskManager.get(taskId);
    if (task && task.status === TaskStatus.RUNNING) {
      this.taskManager.updateStatus(taskId, TaskStatus.PAUSED);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused task
   */
  async resume(
    taskId: string,
    context: ToolExecutionContext,
    options?: Parameters<typeof this.execute>[2]
  ): Promise<ReturnType<typeof this.execute>> {
    const task = this.taskManager.get(taskId);
    if (task && task.status === TaskStatus.PAUSED) {
      return this.execute(taskId, context, options);
    }
    return {
      success: false,
      completedSteps: 0,
      failedSteps: 0,
      error: 'Task is not paused',
    };
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): boolean {
    const task = this.taskManager.get(taskId);
    if (task && (task.status === TaskStatus.RUNNING || task.status === TaskStatus.PAUSED)) {
      this.taskManager.updateStatus(taskId, TaskStatus.CANCELLED);
      return true;
    }
    return false;
  }
}

/**
 * Create a task executor instance
 */
export function createTaskExecutor(
  taskManager: TaskManager,
  toolExecutor: ToolExecutor
): TaskExecutor {
  return new TaskExecutor(taskManager, toolExecutor);
}
