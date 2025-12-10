import { OllamaProvider, OllamaModel } from '@operone/ai';

export interface OllamaServiceConfig {
  baseURL?: string;
}

export class OllamaService {
  private baseURL: string;
  private static instance: OllamaService | null = null;

  private constructor(config: OllamaServiceConfig = {}) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  static getInstance(config?: OllamaServiceConfig): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService(config);
    }
    return OllamaService.instance;
  }

  /**
   * Check if Ollama is available
   */
  async checkAvailability(): Promise<boolean> {
    return await OllamaProvider.checkAvailability(this.baseURL);
  }

  /**
   * List all installed models
   */
  async listModels(): Promise<OllamaModel[]> {
    return await OllamaProvider.listModels(this.baseURL);
  }

  /**
   * Pull a model from Ollama library
   */
  async pullModel(
    modelName: string,
    onProgress?: (progress: { status: string; completed?: number; total?: number }) => void
  ): Promise<void> {
    return await OllamaProvider.pullModel(modelName, this.baseURL, onProgress);
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    return await OllamaProvider.deleteModel(modelName, this.baseURL);
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<any> {
    return await OllamaProvider.getModelInfo(modelName, this.baseURL);
  }

  /**
   * Create an Ollama provider instance
   */
  createProvider(modelName: string, keepAlive?: string): OllamaProvider {
    return new OllamaProvider({
      baseURL: this.baseURL,
      model: modelName,
      keepAlive,
    });
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

export const ollamaService = OllamaService.getInstance();
