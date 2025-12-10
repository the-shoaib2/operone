import type { ModelInfo, ProviderType } from '@repo/types'

/**
 * Browser-compatible Model Registry
 * Contains only the methods needed for browser functionality
 */
export class BrowserModelRegistry {
  // Dynamic model registry - populated only with detected/imported models
  private static models: Record<ProviderType, ModelInfo[]> = {
    openai: [],
    anthropic: [],
    google: [],
    mistral: [],
    ollama: [],
    openrouter: [],
    local: [],
    custom: [],
  };

  /**
   * Update Ollama models dynamically
   */
  static updateOllamaModels(models: ModelInfo[]): void {
    this.models.ollama = models;
  }

  /**
   * Get Ollama models from a local instance
   */
  static async getOllamaModelsFromInstance(baseURL: string = 'http://localhost:11434'): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const ollamaModels = data.models || [];
        
        return ollamaModels.map((model: any) => ({
          id: model.name,
          name: model.name,
          provider: 'ollama' as const,
          description: `${model.details.family} - ${model.details.parameter_size}`,
          contextWindow: model.details.format === 'gguf' ? 4096 : 8192, // Estimate
        }));
      }
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
    }

    return []; // Return empty array if detection fails
  }

  static getModels(provider: ProviderType): ModelInfo[] {
    return this.models[provider] || [];
  }

  static getModel(provider: ProviderType, modelId: string): ModelInfo | undefined {
    return this.models[provider]?.find(m => m.id === modelId);
  }

  static getAllProviders(): ProviderType[] {
    return Object.keys(this.models) as ProviderType[];
  }
}
