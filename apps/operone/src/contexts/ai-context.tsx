import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ProviderConfig, ProviderType, ModelInfo, ChatMessage, GeneratedImage, ExactTextResult, MessageType } from '@repo/types';
import { BrowserAdapter } from '@repo/operone';

const { BrowserAIService } = BrowserAdapter;

export type ChatMode = 'chat' | 'planning';

interface AIContextType {
    // Chat
    messages: ChatMessage[];
    setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    sendMessage: (content: string, mode?: ChatMode) => Promise<void>;
    sendMessageStreaming: (content: string, mode?: ChatMode) => Promise<void>;
    sendMessageWithMode: (content: string, mode: MessageType) => Promise<void>;
    isLoading: boolean;
    streamingMessage: string | null;
    currentMode: MessageType;

    // Provider management
    activeProvider: ProviderConfig | null;
    allProviders: Record<string, ProviderConfig>;
    setActiveProvider: (id: string) => Promise<void>;
    addProvider: (id: string, config: ProviderConfig) => Promise<void>;
    removeProvider: (id: string) => Promise<void>;
    updateProvider: (id: string, config: ProviderConfig) => Promise<void>;
    testProvider: (id: string) => Promise<{ success: boolean; error?: string }>;

    // Model information
    getAvailableModels: (provider: ProviderType) => Promise<ModelInfo[]>;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
    const [activeProvider, setActiveProviderState] = useState<ProviderConfig | null>(null);
    const [allProviders, setAllProviders] = useState<Record<string, ProviderConfig>>({});
    const [browserAIService, setBrowserAIService] = useState<InstanceType<typeof BrowserAIService> | null>(null);
    const [currentMode] = useState<MessageType>('text');

    // Load initial configuration
    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            // Wait for Electron API to be available with retries
            let retries = 0;
            const maxRetries = 10;
            const retryDelay = 500;

            while ((!window.electronAPI || !window.electronAPI.ai) && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retries++;
            }

            if (!window.electronAPI || !window.electronAPI.ai) {
                console.info('Running in browser mode - Electron API not available');
                console.info('Initializing browser AI service with Ollama detection...');

                // Initialize browser AI service
                const browserService = new BrowserAIService();
                const isAvailable = await browserService.initialize();

                if (isAvailable) {
                    setBrowserAIService(browserService);
                    const config = browserService.getActiveProviderConfig();
                    setActiveProviderState(config);
                    setAllProviders(browserService.getAllProviderConfigs());
                    console.info('✓ Browser AI service initialized successfully with Ollama');
                } else {
                    console.info('No local Ollama instance detected. AI features will be limited.');
                    console.info('To use AI features, either:');
                    console.info('  1. Run the app in Electron mode: pnpm electron:dev');
                    console.info('  2. Start Ollama locally: https://ollama.ai');
                }
                return;
            }

            // Electron mode - load configuration normally
            const config = await window.electronAPI.ai.getActiveProvider();
            setActiveProviderState(config);

            const providers = await window.electronAPI.ai.getAllProviders();
            setAllProviders(providers);
        } catch (error) {
            console.error('Failed to load AI configuration:', error);
        }
    };

    const sendMessage = async (content: string, mode: ChatMode = 'chat') => {
        // Check if electronAPI is available
        if (!window.electronAPI || !window.electronAPI.ai) {
            // Try browser AI service
            if (browserAIService && browserAIService.isAvailable()) {
                const userMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    content,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, userMessage]);
                setIsLoading(true);

                try {
                    const response = await browserAIService.sendMessage(content);

                    const aiMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: response,
                        timestamp: new Date(),
                    };

                    setMessages(prev => [...prev, aiMessage]);
                } catch (error) {
                    console.error('Failed to send message via browser AI service:', error);

                    const errorMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: 'Failed to connect to Ollama. Please make sure Ollama is running locally.',
                        timestamp: new Date(),
                    };

                    setMessages(prev => [...prev, errorMessage]);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            console.warn('No AI service available, cannot send message');

            // Add a user message to show the attempt
            const userMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content,
                timestamp: new Date(),
            };

            // Add an error message
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'AI service not available. Please run this app in Electron mode or start Ollama locally for browser mode.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, userMessage, errorMessage]);
            return;
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await window.electronAPI.ai.sendMessage(content, mode);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);

            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request. Please check your AI provider configuration.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessageStreaming = async (content: string, mode: ChatMode = 'chat') => {
        // Check if electronAPI is available
        if (!window.electronAPI || !window.electronAPI.ai) {
            // Try browser AI service with streaming
            // Relaxed check: if service exists, try to use it
            if (browserAIService) {
                const userMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    content,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, userMessage]);
                setIsLoading(true);
                setStreamingMessage('');

                try {
                    // Create a streaming response using fetch
                    const baseURL = browserAIService.getActiveProviderConfig()?.baseURL || 'http://localhost:11434';
                    const activeModel = browserAIService.getActiveProviderConfig()?.model || 'llama3.2';

                    const response = await fetch(`${baseURL}/api/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: activeModel,
                            prompt: content,
                            stream: true,
                        }),
                        signal: AbortSignal.timeout(60000), // 60 second timeout
                    });

                    if (!response.ok) {
                        throw new Error(`Ollama API error: ${response.statusText}`);
                    }

                    if (!response.body) {
                        throw new Error('No response body available');
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let accumulatedResponse = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n').filter(line => line.trim());

                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line);
                                if (data.response) {
                                    accumulatedResponse += data.response;
                                    setStreamingMessage(accumulatedResponse);
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                                continue;
                            }
                        }
                    }

                    // Finalize the message
                    const aiMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: accumulatedResponse,
                        timestamp: new Date(),
                    };

                    setMessages(prev => [...prev, aiMessage]);
                } catch (error) {
                    console.error('Failed to send streaming message via browser AI service:', error);

                    const errorMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: 'Failed to connect to Ollama for streaming. Please make sure Ollama is running locally.',
                        timestamp: new Date(),
                    };

                    setMessages(prev => [...prev, errorMessage]);
                } finally {
                    setIsLoading(false);
                    setStreamingMessage(null);
                }
                return;
            }

            console.warn('No AI service available, cannot send streaming message');
            return;
        }

        // Electron mode - use new streaming API
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setStreamingMessage('');

        let accumulatedText = '';
        let cleanupFunctions: (() => void)[] = [];

        try {
            // Set up streaming listeners
            const onToken = (token: string) => {
                accumulatedText += token;
                setStreamingMessage(accumulatedText);
            };

            const onComplete = (fullText: string) => {
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: fullText,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, aiMessage]);
                setIsLoading(false);
                setStreamingMessage(null);

                // Cleanup listeners
                cleanupFunctions.forEach(cleanup => cleanup());
            };

            const onError = (error: string) => {
                console.error('Streaming error:', error);

                const errorMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Error: ${error}`,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, errorMessage]);
                setIsLoading(false);
                setStreamingMessage(null);

                // Cleanup listeners
                cleanupFunctions.forEach(cleanup => cleanup());
            };

            // Register listeners
            cleanupFunctions.push(window.electronAPI.ai.onStreamToken(onToken));
            cleanupFunctions.push(window.electronAPI.ai.onStreamComplete(onComplete));
            cleanupFunctions.push(window.electronAPI.ai.onStreamError(onError));

            // Start streaming
            await window.electronAPI.ai.sendMessageStreaming(content, mode);
        } catch (error) {
            console.error('Failed to send streaming message:', error);

            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
            setIsLoading(false);
            setStreamingMessage(null);

            // Cleanup listeners
            cleanupFunctions.forEach(cleanup => cleanup());
        }
    };

    const setActiveProvider = async (id: string) => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService) {
                // In browser mode, we can only use the detected Ollama
                console.warn('Browser mode: Cannot switch providers, using detected Ollama');
                return;
            }
            console.warn('Electron API not available, cannot set active provider');
            throw new Error('Electron API not available');
        }

        try {
            await window.electronAPI.ai.setActiveProvider(id);
            await loadConfiguration();
        } catch (error) {
            console.error('Failed to set active provider:', error);
            throw error;
        }
    };

    const addProvider = async (id: string, config: ProviderConfig) => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService && config.type === 'ollama') {
                // In browser mode, we can update the Ollama configuration
                console.warn('Browser mode: Cannot add providers, using detected Ollama');
                return;
            }
            console.warn('Electron API not available, cannot add provider');
            throw new Error('Electron API not available');
        }

        try {
            await window.electronAPI.ai.addProvider(id, config);
            await loadConfiguration();
        } catch (error) {
            console.error('Failed to add provider:', error);
            throw error;
        }
    };

    const removeProvider = async (id: string) => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService) {
                // In browser mode, we cannot remove the detected Ollama
                console.warn('Browser mode: Cannot remove providers');
                return;
            }
            console.warn('Electron API not available, cannot remove provider');
            throw new Error('Electron API not available');
        }

        try {
            await window.electronAPI.ai.removeProvider(id);
            await loadConfiguration();
        } catch (error) {
            console.error('Failed to remove provider:', error);
            throw error;
        }
    };

    const updateProvider = async (id: string, config: ProviderConfig) => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService && config.type === 'ollama') {
                // In browser mode, we cannot update the detected Ollama
                console.warn('Browser mode: Cannot update providers');
                return;
            }
            console.warn('Electron API not available, cannot update provider');
            throw new Error('Electron API not available');
        }

        try {
            await window.electronAPI.ai.updateProvider(id, config);
            await loadConfiguration();
        } catch (error) {
            console.error('Failed to update provider:', error);
            throw error;
        }
    };

    const testProvider = async (id: string) => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService && browserAIService.isAvailable()) {
                // In browser mode, we can test the detected Ollama
                return { success: true };
            }
            return { success: false, error: 'Electron API not available' };
        }

        try {
            return await window.electronAPI.ai.testProvider(id);
        } catch (error) {
            console.error('Failed to test provider:', error);
            return { success: false, error: 'Failed to test provider' };
        }
    };

    const getAvailableModels = async (provider: ProviderType): Promise<ModelInfo[]> => {
        if (!window.electronAPI || !window.electronAPI.ai) {
            if (browserAIService && provider === 'ollama') {
                // In browser mode, we can get Ollama models
                try {
                    return await browserAIService.getModels('ollama');
                } catch (error) {
                    console.error('Failed to get Ollama models:', error);
                    return [];
                }
            }
            console.warn('Electron API not available, cannot get models');
            return [];
        }

        try {
            return await window.electronAPI.ai.getModels(provider);
        } catch (error) {
            console.error('Failed to get models:', error);
            return [];
        }
    };

    const value: AIContextType = {
        messages,
        setMessages,
        sendMessage,
        sendMessageStreaming,
        isLoading,
        streamingMessage,
        activeProvider,
        allProviders,
        setActiveProvider,
        addProvider,
        removeProvider,
        updateProvider,
        testProvider,
        getAvailableModels,
        currentMode,
        sendMessageWithMode: (content, mode) => sendMessage(content, 'chat'), // Placeholder
    };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
}
