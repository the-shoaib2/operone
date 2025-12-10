/* TODO: Re-enable when tool calling is fixed
import { getToolRegistry, ToolExecutor, ToolExecutionContext } from '@operone/core';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import type { ToolCall, ToolResult, ToolCallOptions } from './providers/OpenAIProvider';

// AIToolOrchestrator temporarily disabled - depends on tool calling functionality
// which is currently incompatible with the latest OpenAI and Anthropic SDK versions
// Will be re-enabled once tool calling is properly implemented

export class AIToolOrchestrator {
  // Implementation commented out
}

export function createOpenAIOrchestrator() {
  throw new Error('AIToolOrchestrator temporarily disabled');
}

export function createAnthropicOrchestrator() {
  throw new Error('AIToolOrchestrator temporarily disabled');
}
*/

// Placeholder export to satisfy TypeScript
export {};
