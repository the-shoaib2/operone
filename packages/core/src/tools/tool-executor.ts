import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolParameter,
} from './tool-schema';
import type { ToolRegistry } from './tool-registry';

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number; // Execution timeout in milliseconds
  validatePermissions?: boolean; // Whether to validate permissions
  recordHistory?: boolean; // Whether to record in command history
  captureState?: boolean; // Whether to capture state for undo
}

/**
 * Tool executor service
 */
export class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private permissionValidator?: PermissionValidator,
    private historyRecorder?: HistoryRecorder
  ) {}

  /**
   * Execute a tool by name
   */
  async execute(
    toolName: string,
    params: Record<string, any>,
    context: ToolExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // Get tool from registry
      const tool = this.registry.get(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
          duration: Date.now() - startTime,
        };
      }

      // Validate permissions
      if (options.validatePermissions !== false && this.permissionValidator) {
        const hasPermission = await this.permissionValidator.validate(
          context.userId,
          tool.definition.requiredPermissions
        );

        if (!hasPermission) {
          return {
            success: false,
            error: `Insufficient permissions for tool '${toolName}'`,
            duration: Date.now() - startTime,
          };
        }
      }

      // Validate parameters
      const validationError = this.validateParameters(params, tool.definition.parameters);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          duration: Date.now() - startTime,
        };
      }

      // Capture state before execution (for undo)
      let stateBefore: any = undefined;
      if (options.captureState && tool.definition.reversible) {
        stateBefore = await this.captureState(toolName, params, context);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        tool.executor,
        params,
        context,
        options.timeout || 30000
      );

      // Capture state after execution
      let stateAfter: any = undefined;
      if (options.captureState && tool.definition.reversible && result.success) {
        stateAfter = await this.captureState(toolName, params, context);
      }

      // Record in history
      if (options.recordHistory !== false && this.historyRecorder) {
        await this.historyRecorder.record({
          toolName,
          params,
          context,
          result,
          stateBefore,
          stateAfter,
          reversible: tool.definition.reversible,
        });
      }

      // Add metadata to result
      if (result.success && tool.definition.reversible) {
        result.metadata = {
          ...result.metadata,
          reversible: true,
          stateBefore,
          stateAfter,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
      context: ToolExecutionContext;
      options?: ToolExecutionOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      executions.map(exec =>
        this.execute(exec.toolName, exec.params, exec.context, exec.options)
      )
    );
  }

  /**
   * Execute tools in sequence
   */
  async executeSequence(
    executions: Array<{
      toolName: string;
      params: Record<string, any>;
      context: ToolExecutionContext;
      options?: ToolExecutionOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const exec of executions) {
      const result = await this.execute(
        exec.toolName,
        exec.params,
        exec.context,
        exec.options
      );
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(
    params: Record<string, any>,
    paramDefs: Array<{ name: string; required: boolean; type: string }>
  ): string | null {
    // Check required parameters
    for (const paramDef of paramDefs) {
      if (paramDef.required && !(paramDef.name in params)) {
        return `Missing required parameter: ${paramDef.name}`;
      }
    }

    // Check parameter types
    for (const [name, value] of Object.entries(params)) {
      const paramDef = paramDefs.find(p => p.name === name);
      if (!paramDef) {
        continue; // Allow extra parameters
      }

      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== paramDef.type && paramDef.type !== 'object') {
        return `Invalid type for parameter '${name}': expected ${paramDef.type}, got ${actualType}`;
      }
    }

    return null;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    executor: (params: Record<string, any>, context: ToolExecutionContext) => Promise<ToolExecutionResult>,
    params: Record<string, any>,
    context: ToolExecutionContext,
    timeout: number
  ): Promise<ToolExecutionResult> {
    return Promise.race([
      executor(params, context),
      new Promise<ToolExecutionResult>((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Capture state for undo functionality
   */
  private async captureState(
    toolName: string,
    params: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    // This is a placeholder - actual implementation would depend on the tool
    // For file operations, capture file content
    // For system operations, capture config values
    return { toolName, params, timestamp: new Date() };
  }
}

/**
 * Permission validator interface
 */
export interface PermissionValidator {
  validate(userId: string, requiredPermissions: string[]): Promise<boolean>;
}

/**
 * History recorder interface
 */
export interface HistoryRecorder {
  record(entry: {
    toolName: string;
    params: Record<string, any>;
    context: ToolExecutionContext;
    result: ToolExecutionResult;
    stateBefore?: any;
    stateAfter?: any;
    reversible: boolean;
  }): Promise<void>;
}
