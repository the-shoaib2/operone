export interface Agent {
  id: string;
  name: string;
  role: 'os' | 'assistant';
  think(input: string, options?: any): Promise<string>;
  act(action: string): Promise<void>;
  observe(): Promise<string>;
}

export interface Memory {
  shortTerm: string[];
  longTerm: {
    query(text: string): Promise<string[]>;
    store(text: string): Promise<void>;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  execute(args: Record<string, any>): Promise<any>;
}

// AI Provider Types
export type ProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'ollama' 
  | 'openrouter' 
  | 'google' 
  | 'mistral' 
  | 'custom';

export interface BaseProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseURL?: string;
  model: string;
}

export interface OpenAIConfig extends BaseProviderConfig {
  type: 'openai';
  organization?: string;
}

export interface AnthropicConfig extends BaseProviderConfig {
  type: 'anthropic';
}

export interface OllamaConfig extends BaseProviderConfig {
  type: 'ollama';
  baseURL: string; // e.g., http://localhost:11434
}

export interface OpenRouterConfig extends BaseProviderConfig {
  type: 'openrouter';
  apiKey: string;
}

export interface GoogleConfig extends BaseProviderConfig {
  type: 'google';
  apiKey: string;
}

export interface MistralConfig extends BaseProviderConfig {
  type: 'mistral';
  apiKey: string;
}

export interface CustomConfig extends BaseProviderConfig {
  type: 'custom';
  baseURL: string;
  apiKey?: string;
}

export type ProviderConfig = 
  | OpenAIConfig 
  | AnthropicConfig 
  | OllamaConfig 
  | OpenRouterConfig 
  | GoogleConfig 
  | MistralConfig 
  | CustomConfig;

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow?: number;
  maxTokens?: number;
  description?: string;
}

export interface GeneratedImage {
  base64: string;
  mediaType: string;
  width?: number;
  height?: number;
  prompt?: string;
}

export interface ExactTextResult {
  text: string;
  metadata?: {
    model: string;
    tokens?: number;
    duration?: number;
  };
}

export type MessageType = 'text' | 'image' | 'exact-text' | 'mixed';

export interface ToolCall {
  id: string;
  type: string;
  state: 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied';
  input?: any;
  output?: any;
  errorText?: string;
}

export interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: MessageType;
  images?: GeneratedImage[];
  exactText?: ExactTextResult;
  // Enhanced fields for rich content
  toolCalls?: ToolCall[];
  artifacts?: Artifact[];
  metadata?: Record<string, any>;
}

export interface AIServiceConfig {
  defaultProvider: ProviderType;
  providers: Record<string, ProviderConfig>;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  conversationIds: string[];
}

export interface Chat {
  id: string;
  title: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}
