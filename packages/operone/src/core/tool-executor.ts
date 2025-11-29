import { ToolType, ToolRoute } from '@operone/thinking';
import { ToolRegistry, ToolExecutorFunction } from './tool-registry';

/**
 * Simple browser-compatible EventEmitter
 */
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    listeners.forEach(listener => listener(...args));
    return true;
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

/**
 * Tool Executor
 * 
 * Executes tools with timeout, retry, caching, and error handling.
 */

export interface ExecutionOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  streaming?: boolean;
  onProgress?: (data: any) => void;
}

export interface ExecutionResult {
  success: boolean;
  data: any;
  executionTime: number;
  fromCache: boolean;
  retryCount: number;
  error?: string;
}

export class ToolExecutor extends EventEmitter {
  private registry: ToolRegistry;
  private cache: Map<string, { result: any; expiry: number }>;
  private cacheDuration: number;
  private activeExecutions: Map<string, Promise<ExecutionResult>>;

  constructor(registry: ToolRegistry, cacheDuration: number = 60000) {
    super();
    this.registry = registry;
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
    this.activeExecutions = new Map();
  }

  /**
   * Executes a tool route
   */
  async execute(
    route: ToolRoute,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(route);

    // Check cache
    if (options.cache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          executionTime: Date.now() - startTime,
          fromCache: true,
          retryCount: 0,
        };
      }
    }

    // Check for duplicate in-flight requests
    const existing = this.activeExecutions.get(cacheKey);
    if (existing) {
      return existing;
    }

    // Execute with retry logic
    const executionPromise = this.executeWithRetry(route, options, startTime);
    this.activeExecutions.set(cacheKey, executionPromise);

    try {
      const result = await executionPromise;
      
      // Cache successful results
      if (result.success && options.cache !== false) {
        this.setCache(cacheKey, result.data);
      }

      return result;
    } finally {
      this.activeExecutions.delete(cacheKey);
    }
  }

  /**
   * Executes multiple routes in parallel
   */
  async executeParallel(
    routes: ToolRoute[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const promises = routes.map(route => this.execute(route, options));
    return Promise.all(promises);
  }

  /**
   * Executes multiple routes sequentially
   */
  async executeSequential(
    routes: ToolRoute[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const route of routes) {
      const result = await this.execute(route, options);
      results.push(result);

      // Stop on first failure if not configured to continue
      if (!result.success && !options.cache) {
        break;
      }
    }

    return results;
  }

  /**
   * Executes with retry logic
   */
  private async executeWithRetry(
    route: ToolRoute,
    options: ExecutionOptions,
    startTime: number
  ): Promise<ExecutionResult> {
    const maxRetries = options.retries ?? route.retries ?? 0;
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.executeSingle(route, options);
        
        return {
          success: true,
          data,
          executionTime: Date.now() - startTime,
          fromCache: false,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          this.emit('retry', {
            route,
            attempt: attempt + 1,
            maxRetries,
            error: lastError,
          });
        }
      }
    }

    return {
      success: false,
      data: null,
      executionTime: Date.now() - startTime,
      fromCache: false,
      retryCount,
      error: lastError?.message || 'Execution failed',
    };
  }

  /**
   * Executes a single tool
   */
  private async executeSingle(
    route: ToolRoute,
    options: ExecutionOptions
  ): Promise<any> {
    const tool = this.registry.get(route.tool);
    
    if (!tool) {
      throw new Error(`Tool ${route.tool} not found in registry`);
    }

    if (!tool.capability.available) {
      throw new Error(`Tool ${route.tool} is not available`);
    }

    // Validate dependencies
    const depValidation = this.registry.validateDependencies(route.tool);
    if (!depValidation.valid) {
      throw new Error(
        `Tool ${route.tool} has missing dependencies: ${depValidation.missing.join(', ')}`
      );
    }

    const timeout = options.timeout ?? route.timeout ?? tool.capability.timeout;

    // Execute with timeout
    const result = await this.executeWithTimeout(
      () => tool.executor(route.method, route.parameters),
      timeout
    );

    this.emit('executed', {
      tool: route.tool,
      method: route.method,
      success: true,
    });

    return result;
  }

  /**
   * Executes with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Gets cache key for a route
   */
  private getCacheKey(route: ToolRoute): string {
    return `${route.tool}:${route.method}:${JSON.stringify(route.parameters)}`;
  }

  /**
   * Gets from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    // Clean up expired cache
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Sets cache
   */
  private setCache(key: string, result: any): void {
    this.cache.set(key, {
      result,
      expiry: Date.now() + this.cacheDuration,
    });
  }

  /**
   * Clears cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    activeExecutions: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      activeExecutions: this.activeExecutions.size,
    };
  }

  /**
   * Cleans up expired cache entries
   */
  cleanupCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export factory
export function createToolExecutor(
  registry: ToolRegistry,
  cacheDuration?: number
): ToolExecutor {
  return new ToolExecutor(registry, cacheDuration);
}
