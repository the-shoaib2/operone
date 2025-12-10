import { ModelProvider, ModelOptions } from '../types';
import Anthropic from '@anthropic-ai/sdk';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

export interface ToolCallOptions extends ModelOptions {
  tools?: any[];
  toolChoice?: 'auto' | 'required' | 'any' | { type: 'tool'; name: string };
}

export class AnthropicProvider implements ModelProvider {
  id = 'anthropic';
  providerType = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: baseURL,
    });
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || 'claude-3-opus-20240229',
        system: options?.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1024, // Anthropic requires max_tokens
        temperature: options?.temperature,
        top_p: options?.topP,
        stop_sequences: options?.stop,
      });

      // Handle different content block types
      const textContent = response.content.find(block => block.type === 'text');
      return textContent?.text || '';
    } catch (error) {
      console.error('Anthropic generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const stream = await this.client.messages.create({
        model: options?.model || 'claude-3-opus-20240229',
        system: options?.system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature,
        top_p: options?.topP,
        stop_sequences: options?.stop,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      console.error('Anthropic streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.client.apiKey;
  }

  /* TODO: Fix tool calling implementation - currently incompatible with SDK version
  async generateWithTools(
    prompt: string,
    options: ToolCallOptions
  ): Promise<{ content?: string; toolCalls?: ToolCall[] }> {
    // Tool calling implementation commented out temporarily
    throw new Error('Tool calling not yet implemented');
  }

  async continueWithToolResults(
    messages: any[],
    toolResults: ToolResult[],
    options: ToolCallOptions
  ): Promise<{ content?: string; toolCalls?: ToolCall[] }> {
    // Tool calling implementation commented out temporarily
    throw new Error('Tool calling not yet implemented');
  }
  */
}
