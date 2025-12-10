import { ModelProvider, ModelOptions } from '../types';
import OpenAI from 'openai';

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
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
}

export class OpenAIProvider implements ModelProvider {
  id = 'openai';
  providerType = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      baseURL: baseURL
    });
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4',
        messages: [
          ...(options?.system ? [{ role: 'system' as const, content: options.system }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4',
        messages: [
          ...(options?.system ? [{ role: 'system' as const, content: options.system }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      console.error('OpenAI streaming failed:', error);
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
    // Implementation commented out - incompatible with current OpenAI SDK
    throw new Error('Tool calling not yet implemented');
  }

  async continueWithToolResults(
    messages: any[],
    toolResults: ToolResult[],
    options: ToolCallOptions
  ): Promise<{ content?: string; toolCalls?: ToolCall[] }> {
    // Implementation commented out - incompatible with current OpenAI SDK
    throw new Error('Tool calling not yet implemented');
  }
  */
}
