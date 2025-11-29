import { RoutingDecision, ToolRoute, ExecutionPlan, ToolType } from '../types';

/**
 * Tool Router
 * 
 * Routes execution plans to appropriate tools based on:
 * - Tool capabilities
 * - Availability
 * - Performance characteristics
 * - Fallback strategies
 */

interface ToolCapability {
  tool: ToolType;
  operations: string[];
  available: boolean;
  priority: number;
  supportsStreaming: boolean;
}

export class ToolRouter {
  private capabilities: Map<ToolType, ToolCapability>;

  constructor() {
    this.capabilities = this.initializeCapabilities();
  }

  /**
   * Creates routing decisions for an execution plan
   */
  async route(plan: ExecutionPlan): Promise<RoutingDecision> {
    const routes: ToolRoute[] = [];
    let streamingEnabled = false;

    for (const step of plan.steps) {
      const route = this.routeStep(step.tool, step.parameters);
      routes.push(route);

      // Enable streaming if any route supports it
      if (route.parameters.streaming) {
        streamingEnabled = true;
      }
    }

    // Determine execution mode based on parallel groups
    const executionMode = this.determineExecutionMode(plan);

    return {
      routes,
      executionMode,
      streamingEnabled,
    };
  }

  /**
   * Routes a single step to the appropriate tool
   */
  private routeStep(tool: ToolType, parameters: Record<string, any>): ToolRoute {
    const capability = this.capabilities.get(tool);

    if (!capability || !capability.available) {
      // Tool not available, find fallback
      const fallback = this.findFallback(tool, parameters);
      
      return {
        tool,
        method: 'execute',
        parameters: {
          ...parameters,
          error: `Tool '${tool}' not available`,
        },
        fallback,
        timeout: 30000,
        retries: 0,
      };
    }

    // Determine method based on operation
    const method = this.determineMethod(tool, parameters);

    // Configure timeout based on tool type
    const timeout = this.getTimeout(tool);

    // Configure retries
    const retries = this.getRetries(tool);

    // Add streaming support if available
    const enhancedParams = {
      ...parameters,
      streaming: capability.supportsStreaming,
    };

    return {
      tool,
      method,
      parameters: enhancedParams,
      timeout,
      retries,
    };
  }

  /**
   * Finds a fallback tool for unavailable tools
   */
  private findFallback(tool: ToolType, parameters: Record<string, any>): ToolRoute | undefined {
    // Fallback strategies
    const fallbacks: Partial<Record<ToolType, ToolType>> = {
      'github': 'networking', // GitHub can fall back to generic networking
      'mcp': 'networking',    // MCP can fall back to HTTP
      'sdb': 'memory',        // SDB can fall back to memory
    };

    const fallbackTool = fallbacks[tool];
    if (!fallbackTool) return undefined;

    const fallbackCapability = this.capabilities.get(fallbackTool);
    if (!fallbackCapability || !fallbackCapability.available) return undefined;

    return {
      tool: fallbackTool,
      method: 'execute',
      parameters: {
        ...parameters,
        fallbackFrom: tool,
      },
      timeout: this.getTimeout(fallbackTool),
      retries: 1,
    };
  }

  /**
   * Determines the execution method for a tool
   */
  private determineMethod(tool: ToolType, parameters: Record<string, any>): string {
    const operation = parameters.operation as string;

    switch (tool) {
      case 'fs':
        return operation || 'execute';
      
      case 'shell':
        return 'executeCommand';
      
      case 'networking':
        if (parameters.service === 'github') {
          return 'queryGitHub';
        }
        return parameters.method || 'request';
      
      case 'ai':
        return parameters.mode || 'generate';
      
      case 'memory':
        return 'recall';
      
      case 'sdb':
        return 'search';
      
      case 'peer':
        return 'executeRemote';
      
      case 'automation':
        return 'schedule';
      
      case 'mcp':
        return 'callTool';
      
      default:
        return 'execute';
    }
  }

  /**
   * Gets timeout for a tool (in milliseconds)
   */
  private getTimeout(tool: ToolType): number {
    const timeouts: Record<ToolType, number> = {
      'fs': 5000,
      'shell': 30000,
      'networking': 15000,
      'github': 10000,
      'ai': 60000,
      'memory': 2000,
      'sdb': 5000,
      'peer': 30000,
      'automation': 60000,
      'mcp': 20000,
    };

    return timeouts[tool] || 10000;
  }

  /**
   * Gets retry count for a tool
   */
  private getRetries(tool: ToolType): number {
    const retries: Record<ToolType, number> = {
      'fs': 2,
      'shell': 1,
      'networking': 3,
      'github': 3,
      'ai': 2,
      'memory': 1,
      'sdb': 2,
      'peer': 2,
      'automation': 1,
      'mcp': 2,
    };

    return retries[tool] || 1;
  }

  /**
   * Determines execution mode based on plan structure
   */
  private determineExecutionMode(plan: ExecutionPlan): 'sequential' | 'parallel' | 'conditional' {
    // If there are parallel groups, use parallel mode
    if (plan.parallelGroups && plan.parallelGroups.length > 0) {
      return 'parallel';
    }

    // If all steps have no dependencies, can run in parallel
    const allIndependent = plan.steps.every(s => s.dependencies.length === 0);
    if (allIndependent && plan.steps.length > 1) {
      return 'parallel';
    }

    // Check for conditional logic (steps with different priorities)
    const hasPriorityVariation = new Set(plan.steps.map(s => s.priority)).size > 1;
    if (hasPriorityVariation) {
      return 'conditional';
    }

    // Default to sequential
    return 'sequential';
  }

  /**
   * Initializes tool capabilities
   */
  private initializeCapabilities(): Map<ToolType, ToolCapability> {
    const capabilities = new Map<ToolType, ToolCapability>();

    // File System
    capabilities.set('fs', {
      tool: 'fs',
      operations: ['read', 'write', 'search', 'delete', 'list'],
      available: true,
      priority: 10,
      supportsStreaming: false,
    });

    // Shell
    capabilities.set('shell', {
      tool: 'shell',
      operations: ['executeCommand'],
      available: true,
      priority: 9,
      supportsStreaming: true,
    });

    // Networking
    capabilities.set('networking', {
      tool: 'networking',
      operations: ['request', 'download', 'upload'],
      available: true,
      priority: 8,
      supportsStreaming: true,
    });

    // GitHub (via networking)
    capabilities.set('github', {
      tool: 'github',
      operations: ['queryUser', 'queryRepo', 'queryIssues'],
      available: true,
      priority: 8,
      supportsStreaming: false,
    });

    // AI
    capabilities.set('ai', {
      tool: 'ai',
      operations: ['generate', 'analyze', 'plan'],
      available: true,
      priority: 7,
      supportsStreaming: true,
    });

    // Memory
    capabilities.set('memory', {
      tool: 'memory',
      operations: ['recall', 'store'],
      available: true,
      priority: 10,
      supportsStreaming: false,
    });

    // SDB (Semantic Database)
    capabilities.set('sdb', {
      tool: 'sdb',
      operations: ['search', 'embed', 'query'],
      available: true,
      priority: 7,
      supportsStreaming: false,
    });

    // Peer (Multi-PC)
    capabilities.set('peer', {
      tool: 'peer',
      operations: ['executeRemote', 'sync', 'fetchInfo'],
      available: false, // Disabled by default, requires configuration
      priority: 6,
      supportsStreaming: true,
    });

    // Automation
    capabilities.set('automation', {
      tool: 'automation',
      operations: ['schedule', 'workflow'],
      available: true,
      priority: 7,
      supportsStreaming: false,
    });

    // MCP
    capabilities.set('mcp', {
      tool: 'mcp',
      operations: ['callTool', 'listTools'],
      available: true,
      priority: 6,
      supportsStreaming: false,
    });

    return capabilities;
  }

  /**
   * Updates tool availability (for dynamic tool registration)
   */
  setToolAvailability(tool: ToolType, available: boolean): void {
    const capability = this.capabilities.get(tool);
    if (capability) {
      capability.available = available;
    }
  }

  /**
   * Gets available tools
   */
  getAvailableTools(): ToolType[] {
    return Array.from(this.capabilities.entries())
      .filter(([_, cap]) => cap.available)
      .map(([tool, _]) => tool);
  }
}

// Export singleton instance
export const toolRouter = new ToolRouter();

// Export factory
export function createToolRouter(): ToolRouter {
  return new ToolRouter();
}
