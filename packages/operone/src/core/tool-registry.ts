import { ToolType } from '@operone/thinking';

/**
 * Tool Registry
 * 
 * Central registry for all available tools with capability discovery.
 */

export interface ToolCapability {
  name: string;
  type: ToolType;
  version: string;
  description: string;
  operations: string[];
  available: boolean;
  supportsStreaming: boolean;
  timeout: number;
  retries: number;
  priority: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ToolRegistration {
  capability: ToolCapability;
  executor: ToolExecutorFunction;
}

export type ToolExecutorFunction = (
  operation: string,
  parameters: Record<string, any>
) => Promise<any>;

export class ToolRegistry {
  private tools: Map<ToolType, ToolRegistration>;
  private aliases: Map<string, ToolType>;

  constructor() {
    this.tools = new Map();
    this.aliases = new Map();
  }

  /**
   * Registers a tool
   */
  register(registration: ToolRegistration): void {
    const { capability, executor } = registration;
    
    if (this.tools.has(capability.type)) {
      throw new Error(`Tool ${capability.type} is already registered`);
    }

    this.tools.set(capability.type, registration);

    // Register aliases
    if (capability.metadata?.aliases) {
      for (const alias of capability.metadata.aliases) {
        this.aliases.set(alias, capability.type);
      }
    }
  }

  /**
   * Unregisters a tool
   */
  unregister(type: ToolType): boolean {
    return this.tools.delete(type);
  }

  /**
   * Gets a tool registration
   */
  get(type: ToolType): ToolRegistration | undefined {
    return this.tools.get(type);
  }

  /**
   * Gets a tool by alias
   */
  getByAlias(alias: string): ToolRegistration | undefined {
    const type = this.aliases.get(alias);
    return type ? this.tools.get(type) : undefined;
  }

  /**
   * Checks if a tool is available
   */
  isAvailable(type: ToolType): boolean {
    const tool = this.tools.get(type);
    return tool?.capability.available || false;
  }

  /**
   * Gets all available tools
   */
  getAvailableTools(): ToolCapability[] {
    return Array.from(this.tools.values())
      .filter(t => t.capability.available)
      .map(t => t.capability)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets tools by operation
   */
  getToolsByOperation(operation: string): ToolCapability[] {
    return Array.from(this.tools.values())
      .filter(t => 
        t.capability.available &&
        t.capability.operations.includes(operation)
      )
      .map(t => t.capability)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets tools that support streaming
   */
  getStreamingTools(): ToolCapability[] {
    return this.getAvailableTools().filter(t => t.supportsStreaming);
  }

  /**
   * Updates tool availability
   */
  setAvailability(type: ToolType, available: boolean): void {
    const tool = this.tools.get(type);
    if (tool) {
      tool.capability.available = available;
    }
  }

  /**
   * Gets tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Gets available tool count
   */
  getAvailableToolCount(): number {
    return this.getAvailableTools().length;
  }

  /**
   * Validates dependencies
   */
  validateDependencies(type: ToolType): { valid: boolean; missing: string[] } {
    const tool = this.tools.get(type);
    if (!tool || !tool.capability.dependencies) {
      return { valid: true, missing: [] };
    }

    const missing: string[] = [];
    for (const dep of tool.capability.dependencies) {
      if (!this.isAvailable(dep as ToolType)) {
        missing.push(dep);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Gets registry statistics
   */
  getStats(): {
    total: number;
    available: number;
    streaming: number;
    byType: Record<string, number>;
  } {
    const tools = Array.from(this.tools.values());
    const byType: Record<string, number> = {};

    for (const tool of tools) {
      byType[tool.capability.type] = (byType[tool.capability.type] || 0) + 1;
    }

    return {
      total: tools.length,
      available: tools.filter(t => t.capability.available).length,
      streaming: tools.filter(t => t.capability.supportsStreaming).length,
      byType,
    };
  }

  /**
   * Clears all registrations
   */
  clear(): void {
    this.tools.clear();
    this.aliases.clear();
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();

// Export factory
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
