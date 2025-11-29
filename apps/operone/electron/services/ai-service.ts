import { 
  AssistantAgent,
  OSAgent,
  MemoryManager, 
  ProviderManager, 
  createDefaultConfig,
  ModelRegistry,
  RAGEngine,
  Planner,
  ReasoningEngine,
  EventBus,
  AgentManager
} from '@repo/operone'
import { createThinkingPipeline, ThinkingPipeline } from '@operone/thinking'
import type { ProviderType } from '@repo/types'
import Store from 'electron-store'
import path from 'path'
import { app, BrowserWindow } from 'electron'

const store = new Store()

class AIService {
  private assistantAgent: AssistantAgent | null = null;
  private osAgent: OSAgent | null = null;
  private memoryManager: MemoryManager;
  private providerManager: ProviderManager;
  private ragEngine: RAGEngine | null = null;
  private planner: Planner | null = null;
  private reasoningEngine: ReasoningEngine;
  private thinkingPipeline: ThinkingPipeline | null = null;
  private agentManager: AgentManager;
  private eventBus: EventBus;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // Initialize EventBus
    this.eventBus = EventBus.getInstance();

    // Subscribe to all events and forward to renderer
    this.setupEventForwarding();

    // Initialize Provider Manager
    this.providerManager = new ProviderManager();

    // Load saved providers or use default
    const savedProviders = store.get('ai.providers', {}) as Record<string, any>;
    const activeProviderId = store.get('ai.activeProviderId') as string;

    if (Object.keys(savedProviders).length === 0) {
      const defaultConfig = createDefaultConfig();
      this.providerManager.addProvider('default', defaultConfig);
    } else {
      Object.entries(savedProviders).forEach(([id, config]) => {
        this.providerManager.addProvider(id, config);
      });
    }

    if (activeProviderId && this.providerManager.getProvider(activeProviderId)) {
      this.providerManager.setActiveProvider(activeProviderId);
    }

    // Initialize Memory Manager
    const userDataPath = app.getPath('userData');
    this.memoryManager = new MemoryManager(path.join(userDataPath, 'operone-memory.db'));

    // Initialize Reasoning Engine
    this.reasoningEngine = new ReasoningEngine();

    // Initialize Agent Manager
    this.agentManager = new AgentManager();

    // Initialize Agents
    this.initializeAgents();
  }

  private setupEventForwarding() {
    // Helper to forward events with topic context
    const subscribeToTopic = (topic: string) => {
      this.eventBus.subscribe(`${topic}:*`, (data: { event: string, payload: any }) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('agent:event', {
            topic,
            event: data.event,
            data: data.payload
          });
        }
      });
    };

    // Subscribe to agent event topics
    subscribeToTopic('agent');
    subscribeToTopic('reasoning');
    subscribeToTopic('planner');
    subscribeToTopic('rag');
    subscribeToTopic('pipeline'); // New pipeline events

    // Special handling for stream events to match preload API
    this.eventBus.subscribe('stream:*', (data: { event: string, payload: any }) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Forward as agent event for consistency
        this.mainWindow.webContents.send('agent:event', {
          topic: 'stream',
          event: data.event,
          data: data.payload
        });

        // Also forward as specific streaming IPC events
        if (data.event === 'token') {
          this.mainWindow.webContents.send('ai:stream:token', data.payload);
        } else if (data.event === 'complete') {
          this.mainWindow.webContents.send('ai:stream:complete', data.payload);
        } else if (data.event === 'error') {
          this.mainWindow.webContents.send('ai:stream:error', data.payload);
        }
      }
    });
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private initializeAgents() {
    const provider = this.providerManager.getActiveProvider();
    if (!provider) {
      console.warn('No active AI provider found. Agents will not be initialized.');
      return;
    }

    try {
      // Initialize AssistantAgent
      this.assistantAgent = new AssistantAgent({
        provider: provider,
        eventBus: this.eventBus
      });

      // Initialize OSAgent
      this.osAgent = new OSAgent({
        provider: provider,
        eventBus: this.eventBus
      });

      // Initialize RAGEngine (only if embeddings are supported)
      const embeddingModel = provider.getEmbeddingModel();
      if (embeddingModel) {
        this.ragEngine = new RAGEngine(this.memoryManager, embeddingModel);
        console.log('RAG Engine initialized with embeddings');
      } else {
        // Create RAGEngine without embedding support - it will handle this gracefully
        this.ragEngine = new RAGEngine(this.memoryManager, null);
        console.warn('Embeddings not supported by provider, RAG features will be limited');
      }

      // Initialize Planner
      this.planner = new Planner(provider);

      // Initialize Thinking Pipeline
      this.thinkingPipeline = createThinkingPipeline({
        userId: 'user',
        enableMemory: true,
        sessionId: store.get('ai.sessionId') as string || undefined
      }, this.eventBus);

      // Register agents with AgentManager
      this.agentManager.registerAgent(this.assistantAgent, 'General assistance');
      this.agentManager.registerAgent(this.osAgent, 'OS operations');

      console.log('All agents initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agents:', error);
    }
  }

  private saveProviders() {
    const providers: Record<string, any> = {};
    this.providerManager.getAllProviders().forEach((provider, id) => {
      providers[id] = provider.getConfig();
    });
    store.set('ai.providers', providers);
  }

  async sendMessageStreaming(message: string, mode: 'chat' | 'planning' = 'chat'): Promise<void> {
    if (!this.assistantAgent) {
      this.eventBus.publish('stream', 'error', 'AI service is not configured. Please go to Settings and add an AI provider with your API key.');
      return;
    }

    try {
      if (mode === 'planning') {
        if (!this.thinkingPipeline) {
          this.eventBus.publish('stream', 'error', 'Thinking pipeline not initialized.');
          return;
        }

        // Use the comprehensive thinking pipeline
        // The pipeline emits events for each stage via EventBus, which are forwarded to UI
        const result = await this.thinkingPipeline.process(message);

        if (result.success) {
          // Emit the final response as a stream completion
          this.eventBus.publish('stream', 'token', result.output.content);
          this.eventBus.publish('stream', 'complete', result.output.content);
        } else {
          this.eventBus.publish('stream', 'error', result.error || 'Pipeline execution failed');
        }
      } else {
        // Standard chat streaming
        await this.assistantAgent.generateStreamingResponse(message);
      }
    } catch (error) {
      console.error('Failed to send streaming message:', error);
      this.eventBus.publish('stream', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async sendMessage(message: string, mode: 'chat' | 'planning' = 'chat'): Promise<string> {
    if (!this.assistantAgent) {
      return 'AI service is not configured. Please go to Settings and add an AI provider with your API key.';
    }

    try {
      if (mode === 'planning') {
        if (!this.thinkingPipeline) {
          return 'Thinking pipeline not initialized. Please check your AI settings.';
        }

        const result = await this.thinkingPipeline.process(message);
        return result.output.content;
      }

      // Use ReasoningEngine for more sophisticated responses
      const result = await this.reasoningEngine.reason(this.assistantAgent, message);
      return result.finalAnswer;
    } catch (error) {
      console.error('Failed to send message:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  /**
   * Extract command from natural language action
   */
  private extractCommand(action: string): string {
    // Simple command extraction - in production this would be more sophisticated
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes('list') || lowerAction.includes('find')) {
      if (lowerAction.includes('desktop')) {
        return 'ls ~/Desktop';
      }
      if (lowerAction.includes('documents')) {
        return 'ls ~/Documents';
      }
      // Default to current directory
      return 'ls -la';
    }

    if (lowerAction.includes('search') || lowerAction.includes('find')) {
      // Extract folder name from action
      const match = action.match(/["']([^"']+)["']|(\w+)\s+folder/i);
      if (match) {
        const folderName = match[1] || match[2];
        return `find ~ -type d -name "${folderName}" 2>/dev/null | head -10`;
      }
    }

    // Fallback
    return action;
  }

  async sendMessageWithAgent(message: string, agentType: 'assistant' | 'os' = 'assistant'): Promise<string> {
    const agent = agentType === 'os' ? this.osAgent : this.assistantAgent;

    if (!agent) {
      return 'AI service is not configured. Please go to Settings and add an AI provider with your API key.';
    }

    try {
      const result = await this.reasoningEngine.reason(agent, message);
      return result.finalAnswer;
    } catch (error) {
      console.error('Failed to send message with agent:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  async createPlan(goal: string): Promise<any> {
    if (!this.planner) {
      throw new Error('Planner not initialized');
    }

    const availableTools = ['file.read', 'file.write', 'shell.execute', 'ai.generate'];
    return await this.planner.createPlan(goal, availableTools);
  }

  async ingestDocument(id: string, content: string, metadata?: any): Promise<void> {
    if (!this.ragEngine) {
      console.warn('RAG Engine not initialized');
      return;
    }

    await this.ragEngine.ingestDocument(id, content, metadata);
  }

  async queryRAG(query: string, topK: number = 3): Promise<any[]> {
    if (!this.ragEngine) {
      return [];
    }

    return await this.ragEngine.query(query, topK);
  }

  async getMemoryStats() {
    if (!this.ragEngine) {
      return {
        vectorDocuments: 0,
        shortTermMemory: this.memoryManager.shortTerm.length
      };
    }

    return this.ragEngine.getStats();
  }

  getActiveProviderConfig() {
    return this.providerManager.getActiveProvider()?.getConfig();
  }

  getAllProviderConfigs() {
    const configs: Record<string, any> = {};
    this.providerManager.getAllProviders().forEach((provider, id) => {
      configs[id] = provider.getConfig();
    });
    return configs;
  }

  setActiveProvider(id: string) {
    const success = this.providerManager.setActiveProvider(id);
    if (success) {
      store.set('ai.activeProviderId', id);
      // Re-initialize all agents with new provider
      this.initializeAgents();
    }
    return success;
  }

  addProvider(id: string, config: any) {
    this.providerManager.addProvider(id, config);
    this.saveProviders();
  }

  removeProvider(id: string) {
    const success = this.providerManager.removeProvider(id);
    if (success) {
      this.saveProviders();
      this.initializeAgents();
    }
    return success;
  }

  updateProvider(id: string, config: any) {
    this.providerManager.removeProvider(id);
    this.providerManager.addProvider(id, config);
    this.saveProviders();
    this.initializeAgents();
  }

  async testProvider(id: string) {
    const provider = this.providerManager.getProvider(id);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }
    return await provider.testConnection();
  }

  getModels(providerType: ProviderType) {
    return ModelRegistry.getModels(providerType);
  }

  // Get agent status for UI
  getAgentStatus() {
    return {
      assistantAgent: !!this.assistantAgent,
      osAgent: !!this.osAgent,
      ragEngine: !!this.ragEngine,
      planner: !!this.planner,
      thinkingPipeline: !!this.thinkingPipeline
    };
  }
}

let aiService: AIService | null = null;

export function getAIService() {
  if (!aiService) {
    aiService = new AIService();
  }
  return aiService;
}
