import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './ToolRegistry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  // Since it's a singleton, we might need access to reset it or just accept shared state
  // ideally we'd relax the singleton pattern for testing, but let's test the instance
  beforeEach(() => {
    registry = ToolRegistry.getInstance();
  });

  it('should have default schemas registered', () => {
    const schemas = registry.getAllSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    
    const readTool = registry.getSchema('read_file');
    expect(readTool).toBeDefined();
    expect(readTool?.name).toBe('read_file');
    expect(readTool?.parameters.required).toContain('path');
  });

  it('should register new schemas', () => {
    const newSchema = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object' as const,
        properties: {
          test_param: { type: 'string' }
        },
        required: ['test_param']
      }
    };

    registry.registerSchema(newSchema);
    const retrieved = registry.getSchema('test_tool');
    expect(retrieved).toEqual(newSchema);
  });

  it('should generate OpenAI compatible tool definitions', () => {
    const openAITools = registry.getOpenAITools();
    expect(Array.isArray(openAITools)).toBe(true);
    expect(openAITools[0]).toHaveProperty('type', 'function');
    expect(openAITools[0]).toHaveProperty('function');
    expect(openAITools[0].function).toHaveProperty('name');
    expect(openAITools[0].function).toHaveProperty('parameters');
  });
});
