import { describe, it, expect, vi } from 'vitest';
import { TaskOrchestrator } from './TaskOrchestrator';
import { AITask, TaskStep } from '@repo/types';

describe('TaskOrchestrator', () => {
  it('should execute AI task steps', async () => {
    const orchestrator = new TaskOrchestrator();
    
    // Mock executor
    const executor = vi.fn().mockResolvedValue('success');
    orchestrator.setToolExecutor(executor);

    const task: AITask = {
      id: 'task-1',
      prompt: 'Do something',
      status: 'pending',
      steps: [
        {
          id: 'step-1',
          description: 'Step 1',
          tool: 'test-tool',
          args: { foo: 'bar' },
          status: 'pending'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const completionPromise = new Promise(resolve => {
        orchestrator.on('aitask:completed', resolve);
    });

    await orchestrator.submitAITask(task);
    await completionPromise;

    expect(executor).toHaveBeenCalledWith('test-tool', { foo: 'bar' }, 'step-1');
    expect(task.status).toBe('completed');
    expect(task.steps[0].status).toBe('completed');
  });

  it('should handle step failure', async () => {
    const orchestrator = new TaskOrchestrator();
    
    // Mock executor to fail
    const executor = vi.fn().mockRejectedValue(new Error('Tool failed'));
    orchestrator.setToolExecutor(executor);

    const task: AITask = {
      id: 'task-1',
      prompt: 'Do something',
      status: 'pending',
      steps: [
        {
          id: 'step-1',
          description: 'Step 1',
          tool: 'test-tool',
          args: { foo: 'bar' },
          status: 'pending'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const failPromise = new Promise((resolve) => {
        orchestrator.on('aitask:failed', resolve);
    });

    await orchestrator.submitAITask(task);
    await failPromise;

    expect(task.status).toBe('failed');
    expect(task.steps[0].status).toBe('failed');
    expect(task.steps[0].error).toBe('Tool failed');
  });
});
