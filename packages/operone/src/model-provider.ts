import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOllama } from 'ollama-ai-provider-v2';
import type { 
  ProviderConfig, 
  ProviderType, 
  ModelInfo,
  OpenAIConfig,
  AnthropicConfig,
  OllamaConfig,
  OpenRouterConfig,
  GoogleConfig,
  MistralConfig,
  CustomConfig
} from '@repo/types';
import { custom } from 'zod';

/**
 * Model Provider Factory
 * Creates AI SDK provider instances based on configuration
 */
export class ModelProvider {
  private config: ProviderConfig;
  private provider: any;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.provider = this.createProvider();
  }

  private createProvider() {
    switch (this.config.type) {
      case 'openai':
        return this.createOpenAIProvider(this.config as OpenAIConfig);
      
      case 'anthropic':
        return this.createAnthropicProvider(this.config as AnthropicConfig);
      
      case 'ollama':
        return this.createOllamaProvider(this.config as OllamaConfig);
      
      case 'openrouter':
        return this.createOpenRouterProvider(this.config as OpenRouterConfig);
      
      case 'google':
        return this.createGoogleProvider(this.config as GoogleConfig);
      
      case 'mistral':
        return this.createMistralProvider(this.config as MistralConfig);
      
      case 'custom':
        return this.createCustomProvider(this.config as CustomConfig);
      
      default: {
        const exhaustiveCheck: never = this.config;
        throw new Error(`Unsupported provider type: ${(exhaustiveCheck as any).type}`);
      }
    }
  }

  private createOpenAIProvider(config: OpenAIConfig) {
    return createOpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    });
  }

  private createAnthropicProvider(config: AnthropicConfig) {
    return createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  private createOllamaProvider(config: OllamaConfig) {
    // Use native Ollama provider
    return createOllama({
      baseURL: config.baseURL + '/api',
    });
  }

  private createOpenRouterProvider(config: OpenRouterConfig) {
    // OpenRouter uses OpenAI-compatible API
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  private createGoogleProvider(config: GoogleConfig) {
    return createGoogleGenerativeAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  private createMistralProvider(config: MistralConfig) {
    return createMistral({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  private createCustomProvider(config: CustomConfig) {
    // Custom endpoints are assumed to be OpenAI-compatible
    return createOpenAI({
      apiKey: config.apiKey || 'custom',
      baseURL: config.baseURL,
    });
  }

  /**
   * Get the AI SDK model instance
   */
  getModel() {
    return this.provider(this.config.model);
  }

  /**
   * Get the AI SDK embedding model instance
   * Returns null for providers that don't support embeddings (Ollama, Anthropic, OpenRouter, Custom)
   * 
   * Supported providers:
   * - OpenAI: text-embedding-3-small
   * - Google: text-embedding-004
   * - Mistral: mistral-embed
   */
  getEmbeddingModel(): any | null {
    // For now, we'll default to a standard embedding model based on the provider
    // In the future, this should be configurable
    switch (this.config.type) {
      case 'openai':
        return this.provider.textEmbeddingModel('text-embedding-3-small');
      case 'google':
        return this.provider.textEmbeddingModel('text-embedding-004');
      case 'mistral':
        return this.provider.textEmbeddingModel('mistral-embed');
      default:
        // Return null for providers that don't support embeddings yet
        return null;
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return this.config;
  }

  /**
   * Update model
   */
  setModel(model: string) {
    this.config.model = model;
  }

  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.getModel();
      // Try a simple generation to test the connection
      const { generateText } = await import('ai');
      await generateText({
        model,
        prompt: 'Hello',
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Model Registry
 * Maintains information about available models for each provider
 */
export class ModelRegistry {
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

    return this.models.ollama; // Return default models if detection fails
  }

  /**
   * Get OpenRouter models dynamically
   */
  static async getOpenRouterModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];
        
        return models.map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: 'openrouter' as const,
          description: `${model.description?.substring(0, 100)}...` || 'Via OpenRouter',
          contextWindow: model.context_length || 4096,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
    }

    return this.models.openrouter;
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

/**
 * Provider Manager
 * Manages multiple provider instances and switching between them
 */
export class ProviderManager {
  private providers: Map<string, ModelProvider> = new Map();
  private activeProviderId: string | null = null;

  /**
   * Add a provider
   */
  addProvider(id: string, config: ProviderConfig): ModelProvider {
    const provider = new ModelProvider(config);
    this.providers.set(id, provider);
    
    // Set as active if it's the first provider
    if (!this.activeProviderId) {
      this.activeProviderId = id;
    }
    
    return provider;
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get the active provider
   */
  getActiveProvider(): ModelProvider | undefined {
    if (!this.activeProviderId) return undefined;
    return this.providers.get(this.activeProviderId);
  }

  /**
   * Set the active provider
   */
  setActiveProvider(id: string): boolean {
    if (!this.providers.has(id)) return false;
    this.activeProviderId = id;
    return true;
  }

  /**
   * Remove a provider
   */
  removeProvider(id: string): boolean {
    const removed = this.providers.delete(id);
    
    // If we removed the active provider, set a new one
    if (removed && this.activeProviderId === id) {
      const firstProvider = this.providers.keys().next().value;
      this.activeProviderId = firstProvider || null;
    }
    
    return removed;
  }

  /**
   * Get all provider IDs
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all providers
   */
  getAllProviders(): Map<string, ModelProvider> {
    return this.providers;
  }
}

/**
 * Create a default provider configuration
 */
export function createDefaultConfig(): ProviderConfig {
  return {
    type: 'ollama',
    model: 'llama3.2',
    baseURL: 'http://localhost:11434',
  };
}
