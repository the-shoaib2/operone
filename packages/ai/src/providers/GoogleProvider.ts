import { ModelProvider, ModelOptions } from '../types';

export interface GoogleConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class GoogleProvider implements ModelProvider {
  id = 'google';
  providerType = 'google' as const;
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: GoogleConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const model = options?.model || this.model;
      const url = `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`;

      const contents = [
        ...(options?.system ? [{
          role: 'user',
          parts: [{ text: `System: ${options.system}` }]
        }] : []),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
            stopSequences: options?.stop,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Google generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const model = options?.model || this.model;
      const url = `${this.baseURL}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

      const contents = [
        ...(options?.system ? [{
          role: 'user',
          parts: [{ text: `System: ${options.system}` }]
        }] : []),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
            stopSequences: options?.stop,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${response.status} - ${error}`);
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
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
              }
            } catch (e) {
              console.warn('Failed to parse Google SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Google streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.apiKey;
  }
}
