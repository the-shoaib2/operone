import { ModelProvider, ModelOptions } from '../types';

export interface OpenRouterConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  siteName?: string;
  siteURL?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export class OpenRouterProvider implements ModelProvider {
  id = 'openrouter';
  providerType = 'openrouter' as const;
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private siteName?: string;
  private siteURL?: string;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'openai/gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.siteName = config.siteName;
    this.siteURL = config.siteURL;
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
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
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenRouter generation failed:', error);
      throw error;
    }
  }


  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
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
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
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
              console.warn('Failed to parse OpenRouter SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': this.siteURL || 'https://operone.app',
      'X-Title': this.siteName || 'Operone',
    };
    return headers;
  }

  /**
   * Get available models from OpenRouter
   */
  static async getAvailableModels(apiKey: string, baseURL: string = 'https://openrouter.ai/api/v1'): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(`${baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = (await response.json()) as { data: OpenRouterModel[] };
      return data.data || [];
    } catch (error) {
      console.error('Failed to get OpenRouter models:', error);
      return [];
    }
  }


  /**
   * Get generation stats (credits used, etc.)
   */
  async getGenerationStats(generationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/generation?id=${generationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch generation stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get generation stats:', error);
      return null;
    }
  }
}
