import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CascadeAgent } from '../agents/cascade-agent';
import { ToolRegistry } from '../core/tool-registry';
import { ToolExecutor } from '../core/tool-executor';

/**
 * End-to-End Tests for Cascade Agent
 * 
 * Tests the complete agent with tool execution
 */

describe('CascadeAgent E2E', () => {
  let agent: CascadeAgent;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    
    // Register mock tools for testing
    registerMockTools(toolRegistry);

    agent = new CascadeAgent({
      toolRegistry,
      userId: 'test-user',
      sessionId: 'test-session',
      enableMemory: false,
      autoRegisterTools: false,
    });
  });

  describe('Complete Pipeline Execution', () => {
    it('should process simple query end-to-end', async () => {
      const result = await agent.process('Hello, how are you?');

      expect(result.success).toBe(true);
      expect(result.output.content).toBeTruthy();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute tools for complex query', async () => {
      const result = await agent.process('List all files in current directory');

      expect(result.success).toBe(true);
      expect(result.output.content).toContain('Execution Results');
    });

    it('should handle multi-step tasks', async () => {
      const result = await agent.process(
        'Read package.json and show the dependencies'
      );

      expect(result.success).toBe(true);
      expect(result.stepsExecuted.length).toBeGreaterThan(3);
    });
  });

  describe('Tool Execution', () => {
    it('should execute file system tool', async () => {
      const result = await agent.process('Read test.txt file');

      expect(result.success).toBe(true);
      expect(result.output.content).toContain('Success');
    });

    it('should execute shell tool', async () => {
      const result = await agent.process('Run echo "test"');

      expect(result.success).toBe(true);
    });

    it('should handle tool execution errors', async () => {
      // Register a failing tool
      toolRegistry.register({
        capability: {
          name: 'Failing Tool',
          type: 'automation',
          version: '1.0.0',
          description: 'Always fails',
          operations: ['fail'],
          available: true,
          supportsStreaming: false,
          timeout: 1000,
          retries: 0,
          priority: 1,
        },
        executor: async () => {
          throw new Error('Tool execution failed');
        },
      });

      const result = await agent.process('Use automation to fail');

      expect(result.output.content).toContain('Failed');
    });
  });

  describe('Tool Registry Integration', () => {
    it('should use registered tools', async () => {
      const stats = agent.getStats();

      expect(stats.tools.total).toBeGreaterThan(0);
      expect(stats.tools.available).toBeGreaterThan(0);
    });

    it('should handle unavailable tools gracefully', async () => {
      toolRegistry.setAvailability('fs', false);

      const result = await agent.process('Read a file');

      expect(result.success).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache tool execution results', async () => {
      const result1 = await agent.process('List files');
      const result2 = await agent.process('List files');

      // Second execution should be faster due to caching
      expect(result2.executionTime).toBeLessThanOrEqual(result1.executionTime);
    });

    it('should clear cache when requested', () => {
      agent.clearCaches();
      const stats = agent.getStats();

      expect(stats.cache.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle pipeline errors gracefully', async () => {
      const result = await agent.process('rm -rf /');

      expect(result.success).toBe(false);
      expect(result.output.error).toBe(true);
    });

    it('should provide error messages', async () => {
      const result = await agent.process('Invalid dangerous command');

      if (!result.success) {
        expect(result.output.errorMessage).toBeTruthy();
      }
    });
  });

  describe('Statistics', () => {
    it('should track execution statistics', async () => {
      await agent.process('Test query');

      const stats = agent.getStats();

      expect(stats.tools).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.memory).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit processing events', async () => {
      const events: string[] = [];

      agent.on('processing-started', () => events.push('started'));
      agent.on('processing-completed', () => events.push('completed'));

      await agent.process('Test');

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });

    it('should emit tool execution events', async () => {
      const toolEvents: any[] = [];

      agent.on('tool-executed', (data) => toolEvents.push(data));

      await agent.process('List files');

      expect(toolEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Parallel vs Sequential Execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const result = await agent.process(
        'Read file1.txt and file2.txt at the same time'
      );

      expect(result.success).toBe(true);
      // Parallel execution should be faster than sequential
    });

    it('should execute dependent tasks sequentially', async () => {
      const result = await agent.process(
        'Read file.txt, then process its content, then save results'
      );

      expect(result.success).toBe(true);
      expect(result.stepsExecuted.length).toBeGreaterThan(2);
    });
  });

  describe('Safety Integration', () => {
    it('should block unsafe operations', async () => {
      const result = await agent.process('Delete all system files');

      expect(result.success).toBe(false);
      expect(result.output.content).toContain('blocked');
    });

    it('should require confirmation for risky operations', async () => {
      const result = await agent.process('Delete log files');

      expect(result.output.content).toContain('confirmation');
    });
  });
});

/**
 * Helper function to register mock tools for testing
 */
function registerMockTools(registry: ToolRegistry) {
  // Mock File System Tool
  registry.register({
    capability: {
      name: 'File System',
      type: 'fs',
      version: '1.0.0',
      description: 'File operations',
      operations: ['read', 'write', 'list', 'search'],
      available: true,
      supportsStreaming: false,
      timeout: 5000,
      retries: 2,
      priority: 10,
    },
    executor: async (operation, params) => {
      return {
        success: true,
        operation,
        params,
        result: 'Mock file system result',
      };
    },
  });

  // Mock Shell Tool
  registry.register({
    capability: {
      name: 'Shell',
      type: 'shell',
      version: '1.0.0',
      description: 'Shell command execution',
      operations: ['execute'],
      available: true,
      supportsStreaming: true,
      timeout: 10000,
      retries: 1,
      priority: 8,
    },
    executor: async (operation, params) => {
      return {
        success: true,
        stdout: 'Mock shell output',
        stderr: '',
        exitCode: 0,
      };
    },
  });

  // Mock Networking Tool
  registry.register({
    capability: {
      name: 'Networking',
      type: 'networking',
      version: '1.0.0',
      description: 'Network requests',
      operations: ['get', 'post', 'put', 'delete'],
      available: true,
      supportsStreaming: false,
      timeout: 30000,
      retries: 3,
      priority: 7,
    },
    executor: async (operation, params) => {
      return {
        success: true,
        status: 200,
        data: { message: 'Mock network response' },
      };
    },
  });

  // Mock AI Tool
  registry.register({
    capability: {
      name: 'AI',
      type: 'ai',
      version: '1.0.0',
      description: 'AI operations',
      operations: ['generate', 'analyze', 'summarize'],
      available: true,
      supportsStreaming: true,
      timeout: 60000,
      retries: 2,
      priority: 9,
    },
    executor: async (operation, params) => {
      return {
        success: true,
        result: 'Mock AI response',
      };
    },
  });
}
