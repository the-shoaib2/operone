export interface Agent {
  id: string;
  name: string;
  role: 'os' | 'assistant';
  think(input: string, options?: unknown): Promise<string>;
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
  execute(args: Record<string, unknown>): Promise<unknown>;
}

// AI Provider Types
export type ProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'ollama' 
  | 'openrouter' 
  | 'google' 
  | 'mistral' 
  | 'local'
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

export interface LocalConfig extends BaseProviderConfig {
  type: 'local';
  modelPath: string;
  contextSize?: number;
  threads?: number;
  gpuLayers?: number;
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
  | LocalConfig
  | CustomConfig;

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow?: number;
  maxTokens?: number;
  description?: string;
}

export interface GGUFModelMetadata {
  id: string;
  name: string;
  filePath: string;
  fileSize: number;
  importedAt: Date;
  description?: string;
  contextSize?: number;
  parameterCount?: string;
  quantization?: string;
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
  input?: unknown;
  output?: unknown;
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
  metadata?: Record<string, unknown>;
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

// Task Tracking Types
export interface TaskStep {
  id: string;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AITask {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: TaskStep[];
  currentStepId?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface TaskStorage {
  saveTask(task: AITask): Promise<void>;
  getTask(id: string): Promise<AITask | undefined>;
  updateTaskStatus(id: string, status: AITask['status']): Promise<void>;
  updateStepStatus(taskId: string, stepId: string, status: TaskStep['status'], result?: unknown, error?: string): Promise<void>;
  listTasks(limit?: number): Promise<AITask[]>;
}
