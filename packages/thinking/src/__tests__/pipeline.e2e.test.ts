import { describe, it, expect, beforeEach } from 'vitest';
import { ThinkingPipeline } from '../pipeline';
import { ComplexityDetector } from '../complexity';
import { IntentEngine } from '../intent';
import { PlanningEngine } from '../planning';
import { ReasoningEngine } from '../reasoning';
import { SafetyEngine } from '../safety';
import { ToolRouter } from '../routing';
import { OutputEngine } from '../output';

/**
 * End-to-End Tests for Thinking Pipeline
 * 
 * Tests the complete 8-stage pipeline with various scenarios
 */

describe('ThinkingPipeline E2E', () => {
  let pipeline: ThinkingPipeline;

  beforeEach(() => {
    pipeline = new ThinkingPipeline({
      userId: 'test-user',
      sessionId: 'test-session',
      enableMemory: false, // Disable for testing
    });
  });

  describe('Simple Queries', () => {
    it('should handle simple question with fast-path', async () => {
      const result = await pipeline.process('What is TypeScript?');

      expect(result.success).toBe(true);
      expect(result.output.format).toBe('markdown');
      expect(result.stepsExecuted).toContain('complexity_detection');
      expect(result.executionTime).toBeLessThan(1000);
    });

    it('should handle simple greeting', async () => {
      const result = await pipeline.process('Hello!');

      expect(result.success).toBe(true);
      expect(result.output.content).toBeTruthy();
    });
  });

  describe('Complex Queries', () => {
    it('should process file operation intent', async () => {
      const result = await pipeline.process(
        'Read all TypeScript files in src directory and analyze patterns'
      );

      expect(result.success).toBe(true);
      expect(result.context.complexity?.level).toBe('complex');
      expect(result.context.intent?.category).toBe('file_read');
      expect(result.context.plan).toBeDefined();
      expect(result.context.plan?.steps.length).toBeGreaterThan(0);
    });

    it('should process shell command intent', async () => {
      const result = await pipeline.process('Run npm test in the project');

      expect(result.success).toBe(true);
      expect(result.context.intent?.category).toBe('shell_command');
      expect(result.context.safety).toBeDefined();
    });

    it('should process multi-intent query', async () => {
      const result = await pipeline.process(
        'Search for TODO comments in code files and create a summary report'
      );

      expect(result.success).toBe(true);
      expect(result.context.intent?.multiIntent).toBe(true);
      expect(result.context.plan?.steps.length).toBeGreaterThan(1);
    });
  });

  describe('Safety Validation', () => {
    it('should block dangerous commands', async () => {
      const result = await pipeline.process('Run rm -rf / on the system');

      expect(result.success).toBe(false);
      expect(result.context.safety?.allowed).toBe(false);
      expect(result.context.safety?.riskLevel).toBe('critical');
    });

    it('should require confirmation for high-risk operations', async () => {
      const result = await pipeline.process('Delete all log files');

      expect(result.context.safety?.requiresConfirmation).toBe(true);
      expect(result.context.safety?.riskLevel).toMatch(/high|medium/);
    });

    it('should allow safe operations', async () => {
      const result = await pipeline.process('List files in current directory');

      expect(result.success).toBe(true);
      expect(result.context.safety?.allowed).toBe(true);
      expect(result.context.safety?.riskLevel).toMatch(/safe|low/);
    });
  });

  describe('Tool Routing', () => {
    it('should route to file system tool', async () => {
      const result = await pipeline.process('Read package.json');

      expect(result.context.routing?.routes.length).toBeGreaterThan(0);
      expect(result.context.routing?.routes[0].tool).toBe('fs');
    });

    it('should route to shell tool', async () => {
      const result = await pipeline.process('Execute npm install');

      expect(result.context.routing?.routes[0].tool).toBe('shell');
    });

    it('should route to networking tool', async () => {
      const result = await pipeline.process('Fetch data from https://api.example.com');

      expect(result.context.routing?.routes[0].tool).toBe('networking');
    });

    it('should use fallback routing', async () => {
      const result = await pipeline.process('Get GitHub repository info');

      const route = result.context.routing?.routes[0];
      expect(route?.fallback).toBeDefined();
    });
  });

  describe('Plan Optimization', () => {
    it('should optimize duplicate steps', async () => {
      const result = await pipeline.process(
        'Read file.txt, process it, read file.txt again, and save results'
      );

      const originalSteps = result.context.plan?.steps.length || 0;
      const optimizedSteps = result.context.optimization?.optimizedPlan.steps.length || 0;

      expect(optimizedSteps).toBeLessThanOrEqual(originalSteps);
    });

    it('should identify parallel execution opportunities', async () => {
      const result = await pipeline.process(
        'Read file1.txt and file2.txt simultaneously'
      );

      expect(result.context.plan?.parallelGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Output Formatting', () => {
    it('should format as markdown by default', async () => {
      const result = await pipeline.process('Explain async/await');

      expect(result.output.format).toBe('markdown');
      expect(result.output.content).toContain('#');
    });

    it('should detect code output', async () => {
      const result = await pipeline.process('Show example TypeScript code');

      expect(result.output.format).toMatch(/code|markdown/);
    });

    it('should format errors properly', async () => {
      const result = await pipeline.process('rm -rf /');

      expect(result.output.error).toBe(true);
      expect(result.output.errorMessage).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should complete simple queries quickly', async () => {
      const start = Date.now();
      await pipeline.process('Hello');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should complete complex queries in reasonable time', async () => {
      const start = Date.now();
      await pipeline.process('Analyze all TypeScript files and generate report');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty input', async () => {
      const result = await pipeline.process('');

      expect(result.success).toBe(true);
      expect(result.output.content).toBeTruthy();
    });

    it('should handle very long input', async () => {
      const longInput = 'a'.repeat(10000);
      const result = await pipeline.process(longInput);

      expect(result.success).toBe(true);
    });

    it('should handle special characters', async () => {
      const result = await pipeline.process('Process file with name: test@#$%.txt');

      expect(result.success).toBe(true);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve all pipeline stages in context', async () => {
      const result = await pipeline.process('Complex multi-step task');

      expect(result.context.complexity).toBeDefined();
      expect(result.context.intent).toBeDefined();
      expect(result.context.plan).toBeDefined();
      expect(result.context.optimization).toBeDefined();
      expect(result.context.safety).toBeDefined();
      expect(result.context.routing).toBeDefined();
    });

    it('should track execution steps', async () => {
      const result = await pipeline.process('Test query');

      expect(result.stepsExecuted.length).toBeGreaterThan(0);
      expect(result.stepsExecuted).toContain('complexity_detection');
    });
  });
});

describe('Individual Engine Tests', () => {
  describe('ComplexityDetector', () => {
    let detector: ComplexityDetector;

    beforeEach(() => {
      detector = new ComplexityDetector();
    });

    it('should detect simple queries', async () => {
      const result = await detector.detect('Hello');
      expect(result.level).toBe('simple');
      expect(result.shouldUsePipeline).toBe(false);
    });

    it('should detect complex queries', async () => {
      const result = await detector.detect(
        'Analyze all files, process data, generate report, and send email'
      );
      expect(result.level).toBe('complex');
      expect(result.shouldUsePipeline).toBe(true);
    });
  });

  describe('IntentEngine', () => {
    let engine: IntentEngine;

    beforeEach(() => {
      engine = new IntentEngine();
    });

    it('should detect file_read intent', async () => {
      const result = await engine.detect('Read the config file');
      expect(result.category).toBe('file_read');
    });

    it('should detect shell_command intent', async () => {
      const result = await engine.detect('Run npm install');
      expect(result.category).toBe('shell_command');
    });

    it('should extract entities', async () => {
      const result = await engine.detect('Read /path/to/file.txt');
      expect(result.entities).toBeDefined();
      expect(result.entities?.paths).toBeDefined();
    });
  });

  describe('SafetyEngine', () => {
    let engine: SafetyEngine;

    beforeEach(() => {
      engine = new SafetyEngine();
    });

    it('should validate safe plans', async () => {
      const plan = {
        id: 'test',
        steps: [{
          id: '1',
          description: 'List files',
          tool: 'fs' as const,
          operation: 'list',
          parameters: {},
          dependencies: [],
          estimatedDuration: 100,
        }],
        totalEstimatedDuration: 100,
        parallelGroups: [],
        metadata: {},
      };

      const result = await engine.validate(plan);
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toMatch(/safe|low/);
    });

    it('should block dangerous plans', async () => {
      const plan = {
        id: 'test',
        steps: [{
          id: '1',
          description: 'Delete system files',
          tool: 'shell' as const,
          operation: 'execute',
          parameters: { command: 'rm -rf /' },
          dependencies: [],
          estimatedDuration: 100,
        }],
        totalEstimatedDuration: 100,
        parallelGroups: [],
        metadata: {},
      };

      const result = await engine.validate(plan);
      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });
  });
});
