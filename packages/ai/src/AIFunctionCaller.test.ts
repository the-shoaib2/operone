import { describe, it, expect, vi } from 'vitest';
import { AIFunctionCaller } from './AIFunctionCaller';

// Mock ToolRegistry since it's used by AIFunctionCaller
vi.mock('@operone/mcp', () => {
  return {
    toolRegistry: {
      getOpenAITools: () => [
        {
          type: 'function',
          function: {
            name: 'test_tool',
            description: 'Test tool',
            parameters: {}
          }
        }
      ],
      getAllSchemas: () => [
        {
          name: 'test_tool',
          description: 'Test tool',
          parameters: {}
        }
      ]
    }
  };
});

describe('AIFunctionCaller', () => {
  it('should get tools formatted for OpenAI', () => {
    const tools = AIFunctionCaller.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('test_tool');
  });

  it('should parse OpenAI tool calls', () => {
    const response = {
      tool_calls: [
        {
          function: {
            name: 'read_file',
            arguments: '{"path": "/tmp/test.txt"}'
          }
        }
      ]
    };

    const results = AIFunctionCaller.parseResponse(response);
    expect(results).toHaveLength(1);
    expect(results[0].tool).toBe('read_file');
    expect(results[0].args).toEqual({ path: '/tmp/test.txt' });
  });

  it('should parse pre-parsed arguments', () => {
    const response = {
      tool_calls: [
        {
          function: {
            name: 'read_file',
            arguments: { path: '/tmp/test.txt' }
          }
        }
      ]
    };

    const results = AIFunctionCaller.parseResponse(response);
    expect(results).toHaveLength(1);
    expect(results[0].args).toEqual({ path: '/tmp/test.txt' });
  });

  it('should parse XML-style tool calls in text', () => {
    const text = 'I will read the file now. \ncall_tool("read_file", {"path": "/tmp/test.txt"})\nDone.';
    const results = AIFunctionCaller.parseResponse(text);
    
    expect(results).toHaveLength(1);
    expect(results[0].tool).toBe('read_file');
    expect(results[0].args).toEqual({ path: '/tmp/test.txt' });
  });
  
  it('should generate system prompt augmentation', () => {
    const prompt = AIFunctionCaller.getSystemPromptAugmentation();
    expect(prompt).toContain('AVAILABLE TOOLS');
    expect(prompt).toContain('test_tool');
  });
});
