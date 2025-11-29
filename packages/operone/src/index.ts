// Core exports
export { MemoryManager } from './memory/MemoryManager';
export * from './core/tool-registry';
export * from './core/tool-executor';
export { ModelProvider, ModelRegistry, ProviderManager, createDefaultConfig } from './model-provider';
export { StreamHandler } from './streaming/StreamHandler';
export type { StreamOptions } from './streaming/StreamHandler';
export * from './core/StorageManager';
export { EventBus } from './core/EventBus';
export { WorkerPool } from './core/WorkerPool';
export { ToolRegistry } from './core/ToolRegistry';

// Agent exports
export { AssistantAgent } from './agents/AssistantAgent';
export { OSAgent } from './agents/OSAgent';
export { Planner } from './agents/Planner';
export { RAGEngine } from './agents/RAGEngine';

// Browser adapter exports
export { BrowserAdapter } from './adapters/BrowserAdapter';
export type { 
  OllamaModel, 
  OllamaInfo 
} from './adapters/BrowserAdapter';

// Agent Manager
export class AgentManager {
  private agents: Map<any, string> = new Map();
  
  registerAgent(agent: any, description: string): void {
    this.agents.set(agent, description);
  }
  
  getAgents(): Map<any, string> {
    return this.agents;
  }
}

// Reasoning Engine
export class ReasoningEngine {
  async reason(agent: any, message: string): Promise<{ finalAnswer: string }> {
    // Check if agent has generateResponse method
    if (typeof agent.generateResponse === 'function') {
      const response = await agent.generateResponse(message);
      return { finalAnswer: response };
    }
    
    // Check if agent has generateStreamingResponse method
    if (typeof agent.generateStreamingResponse === 'function') {
      const response = await agent.generateStreamingResponse(message);
      return { finalAnswer: response };
    }
    
    return { finalAnswer: "Error: Invalid agent type" };
  }
}
