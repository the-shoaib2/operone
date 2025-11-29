import { EventEmitter } from 'events';
import { ThinkingPipeline, PipelineResult, PipelineConfig } from '@operone/thinking';
import { ToolRegistry, toolRegistry } from './core/tool-registry';
import { ToolExecutor, createToolExecutor, ExecutionResult } from './core/tool-executor';
import { memoryRecall, memoryStore } from '@operone/memory';

/**
 * Cascade Agent
 * 
 * Main agent that orchestrates the complete Cascade-like pipeline
 * with thinking engine, memory, and tool execution.
 */

export interface CascadeAgentConfig extends PipelineConfig {
  toolRegistry?: ToolRegistry;
  cacheDuration?: number;
  autoRegisterTools?: boolean;
}

export class CascadeAgent extends EventEmitter {
  private pipeline: ThinkingPipeline;
  private toolRegistry: ToolRegistry;
  private toolExecutor: ToolExecutor;
  private config: CascadeAgentConfig;

  constructor(config: CascadeAgentConfig = {}) {
    super();
    this.config = config;
    
    // Initialize tool registry
    this.toolRegistry = config.toolRegistry || toolRegistry;
    
    // Initialize tool executor
    this.toolExecutor = createToolExecutor(
      this.toolRegistry,
      config.cacheDuration
    );

    // Initialize thinking pipeline
    this.pipeline = new ThinkingPipeline({
      ...config,
      enableMemory: config.enableMemory !== false,
    });

    // Auto-register built-in tools if enabled
    if (config.autoRegisterTools !== false) {
      this.registerBuiltInTools();
    }

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Processes user input through the complete pipeline
   */
  async process(input: string): Promise<PipelineResult> {
    this.emit('processing-started', { input });

    try {
      // Run through thinking pipeline
      const pipelineResult = await this.pipeline.process(input);

      // If pipeline succeeded and has routing decisions, execute tools
      if (pipelineResult.success && pipelineResult.context.routing) {
        const executionResults = await this.executeTools(pipelineResult);
        
        // Update output with execution results
        pipelineResult.output.content = this.formatExecutionResults(
          pipelineResult.output.content,
          executionResults
        );

        // Store in memory
        if (this.config.enableMemory) {
          await memoryStore.saveTask({
            id: pipelineResult.context.sessionId || 'unknown',
            description: input,
            input,
            output: pipelineResult.output,
            success: true,
            steps: pipelineResult.stepsExecuted,
            executionTime: pipelineResult.executionTime,
            timestamp: Date.now(),
            userId: this.config.userId,
            sessionId: this.config.sessionId,
          });
        }
      }

      this.emit('processing-completed', pipelineResult);
      return pipelineResult;

    } catch (error) {
      this.emit('processing-error', error);
      throw error;
    }
  }

  /**
   * Processes with streaming output
   */
  async processStreaming(
    input: string,
    onChunk: (chunk: string) => void
  ): Promise<PipelineResult> {
    // Wrap the callback
    const streamingCallback = (chunk: string) => {
      this.emit('stream-chunk', chunk);
      onChunk(chunk);
    };

    // Process with streaming
    const config = { ...this.config, streamingCallback };
    const tempPipeline = new ThinkingPipeline(config);
    
    return tempPipeline.process(input);
  }

  /**
   * Executes tools from routing decisions
   */
  private async executeTools(pipelineResult: PipelineResult): Promise<ExecutionResult[]> {
    const { routing } = pipelineResult.context;
    if (!routing) return [];

    this.emit('tools-executing', { routes: routing.routes });

    let results: ExecutionResult[];

    // Execute based on mode
    if (routing.executionMode === 'parallel') {
      results = await this.toolExecutor.executeParallel(routing.routes, {
        streaming: routing.streamingEnabled,
      });
    } else {
      results = await this.toolExecutor.executeSequential(routing.routes, {
        streaming: routing.streamingEnabled,
      });
    }

    this.emit('tools-executed', { results });
    return results;
  }

  /**
   * Formats execution results into output
   */
  private formatExecutionResults(
    originalContent: string,
    results: ExecutionResult[]
  ): string {
    if (results.length === 0) return originalContent;

    let formatted = originalContent + '\n\n## Execution Results\n\n';

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      formatted += `### Result ${i + 1}\n\n`;
      
      if (result.success) {
        formatted += `✅ **Success** (${result.executionTime}ms`;
        if (result.fromCache) formatted += ', from cache';
        if (result.retryCount > 0) formatted += `, ${result.retryCount} retries`;
        formatted += ')\n\n';
        
        if (typeof result.data === 'string') {
          formatted += result.data + '\n\n';
        } else {
          formatted += '```json\n' + JSON.stringify(result.data, null, 2) + '\n```\n\n';
        }
      } else {
        formatted += `❌ **Failed** (${result.executionTime}ms, ${result.retryCount} retries)\n\n`;
        formatted += `Error: ${result.error}\n\n`;
      }
    }

    return formatted;
  }

  /**
   * Registers built-in tools
   */
  private registerBuiltInTools(): void {
    // Note: Actual tool implementations would be imported and registered here
    // This is a placeholder showing the structure
    
    // Example: File System tool
    // this.toolRegistry.register({
    //   capability: {
    //     name: 'File System',
    //     type: 'fs',
    //     version: '1.0.0',
    //     description: 'File system operations',
    //     operations: ['read', 'write', 'search', 'delete'],
    //     available: true,
    //     supportsStreaming: false,
    //     timeout: 5000,
    //     retries: 2,
    //     priority: 10,
    //   },
    //   executor: async (operation, params) => {
    //     // Implementation would go here
    //     return { success: true };
    //   },
    // });

    this.emit('tools-registered', {
      count: this.toolRegistry.getToolCount(),
    });
  }

  /**
   * Sets up event forwarding from sub-components
   */
  private setupEventForwarding(): void {
    // Forward tool executor events
    this.toolExecutor.on('executed', (data) => {
      this.emit('tool-executed', data);
    });

    this.toolExecutor.on('retry', (data) => {
      this.emit('tool-retry', data);
    });
  }

  /**
   * Gets agent statistics
   */
  getStats(): {
    tools: any;
    cache: any;
    memory: any;
  } {
    return {
      tools: this.toolRegistry.getStats(),
      cache: this.toolExecutor.getCacheStats(),
      memory: memoryStore.getStats(),
    };
  }

  /**
   * Clears caches
   */
  clearCaches(): void {
    this.toolExecutor.clearCache();
    memoryStore.clearShortTerm();
  }

  /**
   * Gets tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Gets tool executor
   */
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }
}

// Export factory
export function createCascadeAgent(config?: CascadeAgentConfig): CascadeAgent {
  return new CascadeAgent(config);
}
