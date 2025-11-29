import { Agent, AgentConfig } from './Agent';

export class WorkerAgent extends Agent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async run(task: string): Promise<any> {
    this.emit('start', task);
    
    // 1. Add task to memory
    this.shortTermMemory.set('current_task', task);
    await this.longTermMemory.store({
      id: Date.now().toString(),
      content: task,
      type: 'task_request',
      timestamp: Date.now()
    });

    // 2. Plan the task
    const planId = `plan-${Date.now()}`;
    
    // Add task to planner (simplified without TaskNode)
    this.planner.addTask({
      id: planId,
      description: task,
      status: 'pending'
    } as any);

    // 3. Execute (simulated)
    try {
      // Simulate AI processing
      const response = await this.ai.processRequest(`Execute task: ${task}`);
      
      // Update memory with result
      await this.longTermMemory.store({
        id: Date.now().toString(),
        content: response,
        type: 'task_result',
        timestamp: Date.now(),
        metadata: JSON.stringify({ taskId: planId })
      });

      this.emit('completed', response);
      return response;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}
