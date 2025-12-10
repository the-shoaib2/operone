import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OllamaDetector, type OllamaModel } from '../utils/ollama-detector';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'custom' | 'local';
  description?: string;
  contextLength?: number;
  isLocal?: boolean;
  isActive?: boolean;
  requiresAuth?: boolean;
  authStatus?: 'authenticated' | 'pending' | 'failed' | 'not_required';
}

interface ModelDetectorContextType {
  // Available models
  availableModels: ModelInfo[];
  isLoading: boolean;
  error: string | null;

  // Ollama specific
  isOllamaAvailable: boolean;
  ollamaModels: OllamaModel[];

  // Authentication (placeholder for future implementation)
  authenticateModel: (modelId: string, credentials: any) => Promise<boolean>;
  deauthenticateModel: (modelId: string) => Promise<void>;
  getAuthStatus: (modelId: string) => 'authenticated' | 'pending' | 'failed' | 'not_required';

  // Actions
  refreshModels: () => Promise<void>;
  detectOllama: () => Promise<boolean>;
}

const ModelDetectorContext = createContext<ModelDetectorContextType | null>(null);

export function ModelDetectorProvider({ children }: { children: ReactNode }) {
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);

  const ollamaDetector = OllamaDetector.getInstance();

  // Detect imported GGUF models from electron storage
  const detectImportedModels = async () => {
    try {
      // @ts-ignore
      if (!window.electronAPI?.model) {
        return [];
      }

      // @ts-ignore
      const ggufModels = await window.electronAPI.model.list();

      // Convert GGUF models to ModelInfo format
      const modelInfos: ModelInfo[] = ggufModels.map((model: any) => ({
        id: `local:${model.id}`,
        name: model.name,
        provider: 'local' as const,
        description: `${model.parameterCount || 'Unknown size'} • ${model.quantization || 'GGUF'} • ${(model.fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`,
        contextLength: model.contextSize || 2048,
        isLocal: true,
        isActive: false,
        requiresAuth: false,
        authStatus: 'not_required' as const,
      }));

      return modelInfos;
    } catch (err) {
      console.error('Failed to detect imported GGUF models:', err);
      return [];
    }
  };

  // Detect Ollama models
  const detectOllamaModels = async () => {
    try {
      const available = await ollamaDetector.checkAvailability();
      setIsOllamaAvailable(available);

      if (available) {
        const models = await ollamaDetector.getAvailableModels();
        setOllamaModels(models);

        // Convert Ollama models to ModelInfo format
        const modelInfos: ModelInfo[] = models.map(model => ({
          id: `ollama:${model.name}`,
          name: model.name,
          provider: 'ollama' as const,
          description: `${model.details.family} • ${model.details.parameter_size} • ${model.details.quantization_level}`,
          contextLength: model.details.parameter_size === '7B' ? 4096 : 8192,
          isLocal: true,
          isActive: true,
          requiresAuth: false,
          authStatus: 'not_required' as const,
        }));

        return modelInfos;
      }
      return [];
    } catch (err) {
      // Silently handle Ollama detection errors
      setIsOllamaAvailable(false);
      setOllamaModels([]);
      return [];
    }
  };

  // Detect all available models
  const detectAllModels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const models: ModelInfo[] = [];

      // Detect Ollama models
      const ollamaModelInfos = await detectOllamaModels();
      models.push(...ollamaModelInfos);

      // Detect imported GGUF models
      const importedModelInfos = await detectImportedModels();
      models.push(...importedModelInfos);

      // Note: Cloud provider models will be added when user configures them with API keys
      setAvailableModels(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect models');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh models
  const refreshModels = async () => {
    await detectAllModels();
  };

  // Detect Ollama only
  const detectOllama = async () => {
    const available = await ollamaDetector.checkAvailability();
    setIsOllamaAvailable(available);
    return available;
  };

  // Authentication methods (placeholder for future implementation)
  const authenticateModel = async (modelId: string, credentials: any): Promise<boolean> => {
    // TODO: Implement actual authentication logic
    console.log(`Authenticating model ${modelId} with credentials:`, credentials);

    // Simulate authentication
    setAvailableModels(prev =>
      prev.map(model =>
        model.id === modelId
          ? { ...model, authStatus: 'authenticated' as const, isActive: true }
          : model
      )
    );

    return true;
  };

  const deauthenticateModel = async (modelId: string): Promise<void> => {
    // TODO: Implement actual deauthentication logic
    console.log(`Deauthenticating model ${modelId}`);

    setAvailableModels(prev =>
      prev.map(model =>
        model.id === modelId
          ? { ...model, authStatus: 'pending' as const, isActive: false }
          : model
      )
    );
  };

  const getAuthStatus = (modelId: string): 'authenticated' | 'pending' | 'failed' | 'not_required' => {
    const model = availableModels.find(m => m.id === modelId);
    return model?.authStatus || 'not_required';
  };

  // Initial detection
  useEffect(() => {
    detectAllModels();

    // Set up periodic refresh for all models
    const interval = setInterval(async () => {
      const ollamaModelInfos = await detectOllamaModels();
      const importedModelInfos = await detectImportedModels();

      setAvailableModels(prev => {
        // Remove old Ollama and local models, add refreshed ones
        const otherModels = prev.filter(m => m.provider !== 'ollama' && m.provider !== 'local');
        return [...otherModels, ...ollamaModelInfos, ...importedModelInfos];
      });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const value: ModelDetectorContextType = {
    availableModels,
    isLoading,
    error,
    isOllamaAvailable,
    ollamaModels,
    authenticateModel,
    deauthenticateModel,
    getAuthStatus,
    refreshModels,
    detectOllama,
  };

  return (
    <ModelDetectorContext.Provider value={value}>
      {children}
    </ModelDetectorContext.Provider>
  );
}

export function useModelDetector() {
  const context = useContext(ModelDetectorContext);
  if (!context) {
    throw new Error('useModelDetector must be used within a ModelDetectorProvider');
  }
  return context;
}
