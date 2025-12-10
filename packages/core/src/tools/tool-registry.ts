import {
  ToolDefinition,
  ToolExecutorFunction,
  RegisteredTool,
  ToolDefinitionSchema,
  toOpenAIFunction,
  toAnthropicTool,
  toJSONSchema,
} from './tool-schema';

/**
 * Centralized tool registry for managing all available tools
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a new tool
   */
  register(definition: ToolDefinition, executor: ToolExecutorFunction): void {
    // Validate definition
    const validated = ToolDefinitionSchema.parse(definition);

    // Check for duplicates
    if (this.tools.has(validated.name)) {
      throw new Error(`Tool '${validated.name}' is already registered`);
    }

    // Register tool
    this.tools.set(validated.name, {
      definition: validated,
      executor,
    });

    // Add to category index
    if (!this.categories.has(validated.category)) {
      this.categories.set(validated.category, new Set());
    }
    this.categories.get(validated.category)!.add(validated.name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }

    // Remove from category index
    const category = this.categories.get(tool.definition.category);
    if (category) {
      category.delete(name);
      if (category.size === 0) {
        this.categories.delete(tool.definition.category);
      }
    }

    // Remove tool
    return this.tools.delete(name);
  }

  /**
   * Get a registered tool
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): RegisteredTool[] {
    const toolNames = this.categories.get(category);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map(name => this.tools.get(name))
      .filter((tool): tool is RegisteredTool => tool !== undefined);
  }

  /**
   * Get tools by permission requirement
   */
  getByPermission(permission: string): RegisteredTool[] {
    return this.getAll().filter(tool =>
      tool.definition.requiredPermissions.includes(permission)
    );
  }

  /**
   * Search tools by name or description
   */
  search(query: string): RegisteredTool[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(tool => {
      const def = tool.definition;
      return (
        def.name.toLowerCase().includes(lowerQuery) ||
        def.description.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get tool definitions in OpenAI function format
   */
  getOpenAIFunctions(filter?: (tool: ToolDefinition) => boolean): any[] {
    const tools = filter ? this.getAll().filter(t => filter(t.definition)) : this.getAll();
    return tools.map(tool => toOpenAIFunction(tool.definition));
  }

  /**
   * Get tool definitions in Anthropic tool format
   */
  getAnthropicTools(filter?: (tool: ToolDefinition) => boolean): any[] {
    const tools = filter ? this.getAll().filter(t => filter(t.definition)) : this.getAll();
    return tools.map(tool => toAnthropicTool(tool.definition));
  }

  /**
   * Get tool definitions in generic JSON schema format
   */
  getJSONSchemas(filter?: (tool: ToolDefinition) => boolean): any[] {
    const tools = filter ? this.getAll().filter(t => filter(t.definition)) : this.getAll();
    return tools.map(tool => toJSONSchema(tool.definition));
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tools that can run on a specific peer
   */
  getForPeer(peerId: string, peerCapabilities: string[]): RegisteredTool[] {
    return this.getAll().filter(tool => {
      // If tool doesn't require a peer, it can run anywhere
      if (!tool.definition.peerRequired) {
        return true;
      }

      // Check if peer has required capabilities
      const requiredCaps = tool.definition.metadata?.requiredCapabilities || [];
      return requiredCaps.every((cap: string) => peerCapabilities.includes(cap));
    });
  }

  /**
   * Get tools available to a user based on their permissions
   */
  getForUser(userPermissions: string[]): RegisteredTool[] {
    return this.getAll().filter(tool => {
      // Check if user has all required permissions
      return tool.definition.requiredPermissions.every(perm =>
        userPermissions.includes(perm)
      );
    });
  }
}

// Global singleton instance
let globalRegistry: ToolRegistry | null = null;

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global tool registry (useful for testing)
 */
export function resetToolRegistry(): void {
  globalRegistry = new ToolRegistry();
}
