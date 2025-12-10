import { ModelProvider, ModelOptions } from '../types';

export interface APIBaseConfig {
  baseURL: string;
  apiKey?: string;
  model: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class APIBaseProvider implements ModelProvider {
  id = 'api-base';
  providerType = 'custom' as const;
  private config: APIBaseConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: APIBaseConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    const messages: ChatMessage[] = [
      ...(options?.system ? [{ role: 'system' as const, content: options.system }] : []),
      ...this.conversationHistory,
      { role: 'user' as const, content: prompt },
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: false,
      });

      const content = response.choices?.[0]?.message?.content || '';
      
      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content }
      );

      return content;
    } catch (error) {
      console.error('API Base generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    const messages: ChatMessage[] = [
      ...(options?.system ? [{ role: 'system' as const, content: options.system }] : []),
      ...this.conversationHistory,
      { role: 'user' as const, content: prompt },
    ];

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: options?.model || this.config.model,
          messages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stop,
          stream: true,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

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
              // Update conversation history
              this.conversationHistory.push(
                { role: 'user', content: prompt },
                { role: 'assistant', content: fullContent }
              );
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                yield content;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('API Base streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.config.baseURL && !!this.config.model;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private async makeRequest(endpoint: string, body: any, retries = 0): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const error = await response.text();
        
        // Retry on 5xx errors
        if (response.status >= 500 && retries < this.config.maxRetries!) {
          await this.delay(Math.pow(2, retries) * 1000);
          return this.makeRequest(endpoint, body, retries + 1);
        }

        throw new Error(`API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest('/models', {});
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
