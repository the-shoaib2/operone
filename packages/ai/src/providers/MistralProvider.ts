import { ModelProvider, ModelOptions } from '../types';

export interface MistralConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class MistralProvider implements ModelProvider {
  id = 'mistral';
  providerType = 'mistral' as const;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'mistral-small-latest';
    this.baseURL = config.baseURL || 'https://api.mistral.ai/v1';
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || this.model,
          messages: [
            ...(options?.system ? [{ role: 'system', content: options.system }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          stop: options?.stop,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('Mistral generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || this.model,
          messages: [
            ...(options?.system ? [{ role: 'system', content: options.system }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          stop: options?.stop,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              console.warn('Failed to parse Mistral SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Mistral streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.apiKey;
  }
}
