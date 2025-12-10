import { ModelProvider, ModelOptions } from '../types';

export interface OllamaConfig {
  baseURL?: string;
  model: string;
  keepAlive?: string; // e.g., "5m" or "-1" for indefinite
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider implements ModelProvider {
  id = 'ollama';
  providerType = 'ollama' as const;
  private baseURL: string;
  private model: string;
  private keepAlive: string;

  constructor(config: OllamaConfig) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.model = config.model;
    this.keepAlive = config.keepAlive || '5m';
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options?.model || this.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature,
            num_predict: options?.maxTokens,
            top_p: options?.topP,
            stop: options?.stop,
          },
          keep_alive: this.keepAlive,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response;
    } catch (error) {
      console.error('Ollama generation failed:', error);
      throw error;
    }
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options?.model || this.model,
          prompt,
          stream: true,
          options: {
            temperature: options?.temperature,
            num_predict: options?.maxTokens,
            top_p: options?.topP,
            stop: options?.stop,
          },
          keep_alive: this.keepAlive,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
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
          if (line.trim()) {
            try {
              const data: OllamaGenerateResponse = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
              if (data.done) {
                return;
              }
            } catch (e) {
              console.warn('Failed to parse Ollama response line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return !!this.model;
  }

  // Ollama-specific methods

  /**
   * Check if Ollama is available
   */
  static async checkAvailability(baseURL: string = 'http://localhost:11434'): Promise<boolean> {
    try {
      const response = await fetch(`${baseURL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all available models
   */
  static async listModels(baseURL: string = 'http://localhost:11434'): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${baseURL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }
      const data = (await response.json()) as { models: OllamaModel[] };
      return data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }


  /**
   * Pull a model from Ollama library
   */
  static async pullModel(
    modelName: string,
    baseURL: string = 'http://localhost:11434',
    onProgress?: (progress: { status: string; completed?: number; total?: number }) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${baseURL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
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
          if (line.trim()) {
            try {
              const data = JSON.parse(line) as { status: string; completed?: number; total?: number };
              if (onProgress) {
                onProgress({
                  status: data.status,
                  completed: data.completed,
                  total: data.total,
                });
              }
            } catch (e) {
              console.warn('Failed to parse pull progress:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      throw error;
    }
  }

  /**
   * Delete a model
   */
  static async deleteModel(modelName: string, baseURL: string = 'http://localhost:11434'): Promise<void> {
    try {
      const response = await fetch(`${baseURL}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete Ollama model:', error);
      throw error;
    }
  }

  /**
   * Get model information
   */
  static async getModelInfo(modelName: string, baseURL: string = 'http://localhost:11434'): Promise<any> {
    try {
      const response = await fetch(`${baseURL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Ollama model info:', error);
      throw error;
    }
  }
}
