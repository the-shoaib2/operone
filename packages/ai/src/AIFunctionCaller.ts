import { toolRegistry } from '@operone/mcp';

export interface FunctionCallResult {
  tool: string;
  args: any;
}

export class AIFunctionCaller {
  /**
   * Format tools for OpenAI/compatible API consumption
   */
  static getTools() {
    return toolRegistry.getOpenAITools();
  }

  /**
   * Parse AI response for function calls
   * Handles various formats (OpenAI tool_calls, JSON in text, etc)
   */
  static parseResponse(response: any): FunctionCallResult[] {
    const results: FunctionCallResult[] = [];

    // 1. Check for standard OpenAI tool_calls
    if (response.tool_calls && Array.isArray(response.tool_calls)) {
      for (const call of response.tool_calls) {
        if (call.function) {
          try {
            results.push({
              tool: call.function.name,
              args: typeof call.function.arguments === 'string' 
                ? JSON.parse(call.function.arguments) 
                : call.function.arguments
            });
          } catch (e) {
            console.error('Failed to parse tool arguments:', e);
          }
        }
      }
      return results;
    }

    // 2. Check for XML-style tool calls (Anthropic-like sometimes)
    // <tool_code>call_tool("name", {args})</tool_code>
    if (typeof response === 'string' || typeof response.content === 'string') {
      const text = typeof response === 'string' ? response : response.content;
      
      // Regex for call_tool("name", {...}) pattern often used in prompt engineering
      const callPattern = /call_tool\s*\(\s*["']([^"']+)["']\s*,\s*({[^}]+})\s*\)/g;
      let match;
      while ((match = callPattern.exec(text)) !== null) {
        try {
          results.push({
            tool: match[1],
            args: JSON.parse(match[2])
          });
        } catch (e) {
          console.error('Failed to parse explicit tool call:', e);
        }
      }
    }

    return results;
  }

  /**
   * Create a system prompt augmentation to teach the model available tools
   * Useful for local models that don't support native function calling
   */
  static getSystemPromptAugmentation(): string {
    const tools = toolRegistry.getAllSchemas();
    
    return `
# AVAILABLE TOOLS
You have access to the following tools. To use them, output a function call in the format: call_tool("tool_name", {arg: "value"})

${tools.map(t => `
## ${t.name}
${t.description}
Parameters: ${JSON.stringify(t.parameters)}
`).join('\n')}
`;
  }
}
