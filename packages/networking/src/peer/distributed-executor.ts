import { ToolExecutor, ToolExecutionContext, ToolExecutionResult } from '@operone/core';
import { ToolRouter } from './tool-router';

/**
 * Distributed executor for running tools across multiple peers
 */
export class DistributedExecutor {
  constructor(
    private localExecutor: ToolExecutor,
    private router: ToolRouter
  ) {}

  /**
   * Execute a tool on the best available peer
   */
  async execute(
    toolName: string,
    params: Record<string, any>,
    context: ToolExecutionContext,
    options?: {
      preferLocal?: boolean;
      requiredCapabilities?: string[];
    }
  ): Promise<ToolExecutionResult & { executedOn?: string }> {
    // Route the tool
    const decision = this.router.route(toolName, options?.requiredCapabilities);

    if (!decision) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        duration: 0,
      };
    }

    // If local execution or preferred local
    if (decision.local || options?.preferLocal) {
      const result = await this.localExecutor.execute(toolName, params, context);
      return {
        ...result,
        executedOn: 'local',
      };
    }

    // Execute remotely
    try {
      const result = await this.executeRemote(decision.peerId, toolName, params, context);
      return {
        ...result,
        executedOn: decision.peerName,
      };
    } catch (error) {
      // Fallback to local on remote failure
      console.warn(`Remote execution failed, falling back to local:`, error);
      const result = await this.localExecutor.execute(toolName, params, context);
      return {
        ...result,
        executedOn: 'local (fallback)',
      };
    }
  }

  /**
   * Execute multiple tools in parallel across peers
   */
  async executeParallel(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
      context: ToolExecutionContext;
      requiredCapabilities?: string[];
    }>
  ): Promise<Array<ToolExecutionResult & { executedOn?: string }>> {
    // Route all tools
    const routingMap = this.router.routeMultiple(
      executions.map(e => ({
        toolName: e.toolName,
        requiredCapabilities: e.requiredCapabilities,
      }))
    );

    // Execute on each peer in parallel
    const promises: Promise<ToolExecutionResult & { executedOn?: string }>[] = [];

    for (const [peerId, tools] of routingMap.entries()) {
      for (const { toolName } of tools) {
        const execution = executions.find(e => e.toolName === toolName);
        if (execution) {
          promises.push(
            this.execute(
              execution.toolName,
              execution.params,
              execution.context,
              { requiredCapabilities: execution.requiredCapabilities }
            )
          );
        }
      }
    }

    return Promise.all(promises);
  }

  /**
   * Execute a tool on a specific remote peer
   */
  private async executeRemote(
    peerId: string,
    toolName: string,
    params: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // TODO: Implement actual remote execution via networking package
    // This is a placeholder that would use SSH, WebSocket, or other protocol
    
    // For now, throw an error indicating remote execution is not yet implemented
    throw new Error(`Remote execution to peer ${peerId} not yet implemented`);
    
    // Future implementation would:
    // 1. Serialize the tool call
    // 2. Send to remote peer via network
    // 3. Wait for response
    // 4. Deserialize and return result
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    localExecutions: number;
    remoteExecutions: number;
    failedRemote: number;
  } {
    // TODO: Implement statistics tracking
    return {
      localExecutions: 0,
      remoteExecutions: 0,
      failedRemote: 0,
    };
  }
}

/**
 * Create a distributed executor instance
 */
export function createDistributedExecutor(
  localExecutor: ToolExecutor,
  router: ToolRouter
): DistributedExecutor {
  return new DistributedExecutor(localExecutor, router);
}
