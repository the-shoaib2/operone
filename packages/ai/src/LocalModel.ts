import { LLama, ModelLoad, Generate, InferenceResult, InferenceResultType } from '@llama-node/llama-cpp';
import * as fs from 'fs';
import { ModelProvider, ModelOptions } from './types';

export interface ModelConfig {
  path: string;
  contextSize?: number;
  threads?: number;
  gpuLayers?: number;
  enableLogging?: boolean;
}

export class LocalModel implements ModelProvider {
  id = 'local';
  providerType = 'local' as const;
  private llama: LLama | null = null;
  private initialized: boolean = false;

  constructor(private config: ModelConfig) {}

  async load(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.config.path)) {
      throw new Error(`Model file not found at ${this.config.path}`);
    }

    try {
      const loadParams: Partial<ModelLoad> = {
        modelPath: this.config.path,
        nCtx: this.config.contextSize ?? 2048,
        nGpuLayers: this.config.gpuLayers ?? 0,
        seed: 0,
        f16Kv: true,
        logitsAll: false,
        vocabOnly: false,
        useMlock: false,
        embedding: false,
        useMmap: true,
      };

      this.llama = await LLama.load(loadParams as any, this.config.enableLogging ?? false);
      
      this.initialized = true;
      console.log(`Model loaded from ${this.config.path}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  async generate(prompt: string, options: Partial<Generate> | ModelOptions = {}): Promise<string> {
    if (!this.initialized || !this.llama) {
      // Auto-load if not loaded
      await this.load();
    }

    try {
      return new Promise((resolve, reject) => {
        let resultText = '';
        
        // Map ModelOptions to Generate options if needed
        const genOptions = options as any; // Cast for now, refined below
        
        const params: Generate = {
          prompt,
          nThreads: this.config.threads ?? 4,
          nTokPredict: genOptions.maxTokens ?? 1024,
          topK: genOptions.topK ?? 40,
          topP: genOptions.topP ?? 0.95,
          temp: genOptions.temperature ?? 0.7,
          repeatPenalty: genOptions.frequencyPenalty ? (1 + genOptions.frequencyPenalty) : 1.1,
          ...genOptions
        };

        this.llama!.inference(params, (response: InferenceResult) => {
          if (response.type === InferenceResultType.Data) {
            if (response.data) {
              resultText += response.data.token;
            }
          } else if (response.type === InferenceResultType.End) {
            resolve(resultText);
          } else if (response.type === InferenceResultType.Error) {
            reject(new Error(response.message || 'Unknown error'));
          }
        });
      });
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    if (!this.initialized || !this.llama) {
      await this.load();
    }

    try {
      const genOptions = options as any;
      
      const params: Generate = {
        prompt,
        nThreads: this.config.threads ?? 4,
        nTokPredict: genOptions?.maxTokens ?? 1024,
        topK: genOptions?.topK ?? 40,
        topP: genOptions?.topP ?? 0.95,
        temp: genOptions?.temperature ?? 0.7,
        repeatPenalty: genOptions?.frequencyPenalty ? (1 + genOptions.frequencyPenalty) : 1.1,
        ...genOptions
      };

      // Create a promise-based wrapper for the callback-based inference
      const stream = new ReadableStream({
        start: (controller) => {
          this.llama!.inference(params, (response: InferenceResult) => {
            if (response.type === InferenceResultType.Data) {
              if (response.data) {
                controller.enqueue(response.data.token);
              }
            } else if (response.type === InferenceResultType.End) {
              controller.close();
            } else if (response.type === InferenceResultType.Error) {
              controller.error(new Error(response.message || 'Unknown error'));
            }
          });
        }
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            yield decoder.decode(value, { stream: true });
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      throw error;
    }
  }

  isLoaded(): boolean {
    return this.initialized;
  }

  async unload(): Promise<void> {
    if (this.llama) {
      // llama-cpp doesn't have explicit unload, but we can clear the reference
      this.llama = null;
      this.initialized = false;
      console.log('Model unloaded');
    }
  }
}

