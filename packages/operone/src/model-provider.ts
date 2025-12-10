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
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, description: 'Most capable GPT-4 model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, description: 'Affordable and fast' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000, description: 'Previous generation flagship' },
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai', contextWindow: 8192, description: 'Original GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385, description: 'Fast and efficient' },
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, description: 'Most intelligent model' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', contextWindow: 200000, description: 'Fastest model' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, description: 'Powerful model for complex tasks' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: 200000, description: 'Balanced model' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, description: 'Fast and compact' },
    ],
    google: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'google', contextWindow: 1000000, description: 'Latest experimental model' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', contextWindow: 2000000, description: 'Most capable Gemini model' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', contextWindow: 1000000, description: 'Fast and efficient' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'google', contextWindow: 32000, description: 'Stable pro model' },
    ],
    mistral: [
      { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', contextWindow: 128000, description: 'Most capable Mistral model' },
      { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', contextWindow: 32000, description: 'Efficient and fast' },
      { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', contextWindow: 32000, description: 'Specialized for code' },
      { id: 'mistral-medium', name: 'Mistral Medium', provider: 'mistral', contextWindow: 32000, description: 'Balanced model' },
      { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B', provider: 'mistral', contextWindow: 64000, description: 'Open source powerhouse' },
    ],
    ollama: [],
    openrouter: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', description: 'Via OpenRouter' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', description: 'Via OpenRouter' },
      { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'openrouter', description: 'Via OpenRouter' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', description: 'Via OpenRouter' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'openrouter', description: 'Largest open model' },
      { id: 'mistralai/mistral-large-2407', name: 'Mistral Large 2', provider: 'openrouter', description: 'Via OpenRouter' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron', provider: 'openrouter', description: 'NVIDIA optimized' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'openrouter', description: 'Top tier open model' },
    ],
    local: [],
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
