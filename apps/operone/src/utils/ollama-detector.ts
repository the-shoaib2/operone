import { BrowserModelRegistry } from './browser-model-registry'
import { BrowserMemoryManager } from './browser-memory-manager'
import type { ProviderConfig } from '@repo/types'

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface OllamaInfo {
  version: string;
  build: string;
}

/**
 * Silent fetch wrapper that prevents browser DevTools from logging network errors
 */
async function silentFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, options);
  } catch (error) {
    // Silently catch all fetch errors to prevent browser console spam
    return null;
  }
}

export class OllamaDetector {
  private static instance: OllamaDetector;
  private baseURL: string = 'http://localhost:11434';
  private isAvailable: boolean = false;
  private availableModels: OllamaModel[] = [];

  static getInstance(): OllamaDetector {
    if (!OllamaDetector.instance) {
      OllamaDetector.instance = new OllamaDetector();
    }
    return OllamaDetector.instance;
  }

  async checkAvailability(baseURL?: string): Promise<boolean> {
    if (baseURL) {
      this.baseURL = baseURL;
    }

    const response = await silentFetch(`${this.baseURL}/api/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response?.ok) {
      this.isAvailable = true;
      return true;
    }

    this.isAvailable = false;
    return false;
  }

  async getAvailableModels(): Promise<OllamaModel[]> {
    if (!this.isAvailable) {
      await this.checkAvailability();
    }

    if (!this.isAvailable) {
      return [];
    }

    try {
      const response = await silentFetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response?.ok) {
        const data = await response.json();
        this.availableModels = data?.models || [];
        return this.availableModels;
      }
    } catch (error) {
      // Silently handle errors when fetching models
    }

    return [];
  }

  async getInfo(): Promise<OllamaInfo | null> {
    if (!this.isAvailable) {
      await this.checkAvailability();
    }

    if (!this.isAvailable) {
      return null;
    }

    try {
      const response = await silentFetch(`${this.baseURL}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response?.ok) {
        return await response.json();
      }
    } catch (error) {
      // Silently handle errors when fetching Ollama info
    }

    return null;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  isOllamaAvailable(): boolean {
    return this.isAvailable;
  }

  getCachedModels(): OllamaModel[] {
    return this.availableModels;
  }

  /**
   * Try to detect Ollama on common ports and URLs
   */
  async detectOllama(): Promise<string | null> {
    const commonUrls = [
      'http://localhost:11434',
      'http://127.0.0.1:11434',
      'http://localhost:11435',
      'http://127.0.0.1:11435',
    ];

    for (const url of commonUrls) {
      try {
        if (await this.checkAvailability(url)) {
          return url;
        }
      } catch (error) {
        // Continue to next URL
      }
    }

    return null;
  }
}

/**
 * Browser-compatible AI service fallback
 * Provides basic AI functionality using detected Ollama instance
 */
export class BrowserAIService {
  private ollamaDetector: OllamaDetector;
  private memoryManager: BrowserMemoryManager;
  private baseURL: string | null = null;
  private activeModel: string | null = null;

  constructor() {
    this.ollamaDetector = OllamaDetector.getInstance();
    this.memoryManager = new BrowserMemoryManager();
  }

  async initialize(): Promise<boolean> {
    try {
      // Try to detect Ollama
      const detectedURL = await this.ollamaDetector.detectOllama();
      
      if (detectedURL) {
        this.baseURL = detectedURL;
        await this.loadModels();
        return true;
      }
      
      return false;
    } catch (error) {
      // Silently handle initialization errors
      return false;
    }
  }

  private async loadModels(): Promise<void> {
    if (!this.baseURL) return;

    const models = await this.ollamaDetector.getAvailableModels();
    if (models.length > 0) {
      // Select the first available model as default
      this.activeModel = models[0].name;
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.baseURL || !this.activeModel) {
      throw new Error('Ollama not available or no model selected');
    }

    try {
      const response = await silentFetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.activeModel,
          prompt: message,
          stream: false,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response?.ok) {
        throw new Error(`Ollama API error: ${response?.statusText || 'Connection failed'}`);
      }

      const data = await response.json();
      return data.response || 'No response received';
    } catch (error) {
      // Re-throw error for caller to handle
      throw error;
    }
  }

  getActiveProviderConfig() {
    if (!this.baseURL || !this.activeModel) {
      return null;
    }

    return {
      type: 'ollama' as const,
      baseURL: this.baseURL,
      model: this.activeModel,
    };
  }

  getAllProviderConfigs() {
    const config = this.getActiveProviderConfig();
    return config ? { 'detected-ollama': config } : {} as Record<string, ProviderConfig>;
  }

  async getModels(providerType: 'ollama') {
    if (providerType !== 'ollama') {
      return [];
    }

    try {
      // Use BrowserModelRegistry to get dynamic Ollama models
      const models = await BrowserModelRegistry.getOllamaModelsFromInstance(this.baseURL || 'http://localhost:11434');
      
      // Update the registry with detected models
      BrowserModelRegistry.updateOllamaModels(models);
      
      return models;
    } catch (error) {
      // Silently handle errors when getting models
      return [];
    }
  }

  isAvailable(): boolean {
    return this.baseURL !== null && this.activeModel !== null;
  }

  async ingestDocument(id: string, content: string, metadata?: any): Promise<void> {
    this.memoryManager.longTerm.store(content);
  }

  async queryMemory(query: string): Promise<string[]> {
    return await this.memoryManager.longTerm.query(query);
  }

  getMemoryStats(): { vectorDocuments: number; shortTermMemory: number } {
    return this.memoryManager.getStats();
  }

  getOllamaInfo() {
    return this.ollamaDetector.getInfo();
  }
}
