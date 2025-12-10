export interface ModelProvider {
  id: string;
  providerType: 'openai' | 'anthropic' | 'local' | 'ollama' | 'mistral' | 'google' | 'openrouter' | 'custom';
  
  generate(prompt: string, options?: ModelOptions): Promise<string>;
  stream?(prompt: string, options?: ModelOptions): AsyncIterable<string>;
  
  isReady(): boolean;
}

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  model?: string; // Specific model name (e.g., 'gpt-4', 'claude-3-opus')
  system?: string; // System prompt
}

export interface ProviderCapabilities {
  streaming: boolean;
  embeddings: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxContextLength: number;
}
