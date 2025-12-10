import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeftIcon,
  CheckIcon,
  Loader2Icon,
  UploadIcon,
  FileIcon,
  RefreshCwIcon,
  CloudIcon,
  PlusIcon,
} from "lucide-react";
import { useAI } from "@/contexts/ai-context";
import type { ProviderConfig, ProviderType } from "@repo/types";
import { OllamaDetector, type OllamaModel } from "@/utils/ollama-detector";
import { cn } from "@/lib/utils";

// Cloud providers configuration
const CLOUD_PROVIDERS = [
  {
    type: "openai" as const,
    name: "OpenAI",
    icon: "🤖",
    description: "GPT-4, GPT-3.5",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o"
  },
  {
    type: "anthropic" as const,
    name: "Anthropic",
    icon: "🧠",
    description: "Claude 3.5 Sonnet",
    baseURL: "https://api.anthropic.com",
    defaultModel: "claude-3-5-sonnet-20241022"
  },
  {
    type: "google" as const,
    name: "Google Gemini",
    icon: "🔍",
    description: "Gemini Pro, Flash",
    baseURL: "https://generativelanguage.googleapis.com/v1",
    defaultModel: "gemini-pro"
  },
  {
    type: "mistral" as const,
    name: "Mistral AI",
    icon: "🌊",
    description: "Mistral Large/Small",
    baseURL: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest"
  },
  {
    type: "openrouter" as const,
    name: "OpenRouter",
    icon: "rs",
    description: "Multi-provider access",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet"
  },
];

export function AddModelPage() {
  const navigate = useNavigate();
  const { addProvider } = useAI();
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form state
  const [providerName, setProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  // Ollama detection state
  const [ollamaDetector] = useState(() => OllamaDetector.getInstance());
  const [isDetectingOllama, setIsDetectingOllama] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);

  // GGUF import state
  const [ggufFilePath, setGgufFilePath] = useState("");
  const [ggufFileName, setGgufFileName] = useState("");
  const [importError, setImportError] = useState("");

  // Auto-detect Ollama on mount
  useEffect(() => {
    detectOllama();
  }, []);

  const detectOllama = async () => {
    setIsDetectingOllama(true);
    try {
      const isAvailable = await ollamaDetector.checkAvailability();
      setOllamaAvailable(isAvailable);

      if (isAvailable) {
        const models = await ollamaDetector.getAvailableModels();
        setOllamaModels(models);
      }
    } catch (error) {
      console.error("Failed to detect Ollama:", error);
      setOllamaAvailable(false);
    } finally {
      setIsDetectingOllama(false);
    }
  };

  const handleCloudProviderSelect = (provider: typeof CLOUD_PROVIDERS[0]) => {
    setSelectedProvider(provider.type);
    setProviderName(provider.name);
    setBaseURL(provider.baseURL);
    setSelectedModel(provider.defaultModel);
    setApiKey("");
    setImportError("");
  };

  const handleOllamaModelSelect = (model: OllamaModel) => {
    setSelectedProvider("ollama");
    setProviderName(model.name);
    setBaseURL("http://localhost:11434");
    setSelectedModel(model.name);
    setApiKey(""); // Not needed for Ollama
    setImportError("");
  };

  const handleGGUFFileSelect = async () => {
    if (!window.electronAPI?.dialog) {
      setImportError("File dialog not available in browser mode");
      return;
    }

    try {
      const result = await window.electronAPI.dialog.openFile({
        title: "Select GGUF Model File",
        filters: [{ name: "GGUF Models", extensions: ["gguf"] }],
      });

      if (!result.canceled && result.filePath) {
        setImportError("");
        setGgufFilePath(result.filePath);

        const fileName = result.filePath.split("/").pop() || result.filePath.split("\\").pop() || "";
        setGgufFileName(fileName);

        // Pre-fill form state
        setSelectedProvider("local");
        setProviderName(fileName.replace(".gguf", ""));
        // Using file path as 'model' identifier for local provider often makes sense, 
        // or effectively the UI form will handle the import.
      }
    } catch (error) {
      console.error("Failed to select file:", error);
      setImportError("Failed to select file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setIsLoading(true);
    try {
      const providerId = `${selectedProvider}-${providerName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;

      let config: ProviderConfig;

      if (selectedProvider === "local") {
        if (!ggufFilePath) {
          throw new Error("Please select a GGUF model file");
        }

        // Import the model
        const importResult = await window.electronAPI.model.import(ggufFilePath, {
          name: providerName,
          description: "Imported GGUF Model",
        });

        if (!importResult.success) {
          throw new Error(importResult.error || "Failed to import model");
        }

        config = {
          type: "local",
          modelPath: ggufFilePath,
          model: providerName,
          contextSize: 2048,
          threads: 4,
          gpuLayers: 0,
        };
      } else if (selectedProvider === "ollama") {
        config = {
          type: "ollama",
          baseURL: baseURL || "http://localhost:11434",
          model: selectedModel,
        };
      } else {
        // Cloud providers
        if (!apiKey) {
          throw new Error("API key is required");
        }
        config = {
          type: selectedProvider,
          apiKey,
          baseURL: baseURL || undefined,
          model: selectedModel,
        };
      }

      await addProvider(providerId, config);
      setIsSaved(true);

      setTimeout(() => {
        navigate("/chat");
      }, 1000);
    } catch (error) {
      console.error("Failed to add provider:", error);
      setImportError(error instanceof Error ? error.message : "Failed to add provider");
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated config form for the selected provider
  if (selectedProvider) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => setSelectedProvider(null)} className="mb-4 pl-0 hover:bg-transparent">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Model List
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedProvider === "ollama" && "🦙"}
              {selectedProvider === "local" && "📦"}
              {CLOUD_PROVIDERS.find(p => p.type === selectedProvider)?.icon}
              Configure {selectedProvider === "local" ? "GGUF Model" : selectedProvider === "ollama" ? "Ollama Model" : CLOUD_PROVIDERS.find(p => p.type === selectedProvider)?.name}
            </CardTitle>
            <CardDescription>
              {selectedProvider === "local"
                ? "Configure your imported local model settings."
                : selectedProvider === "ollama"
                  ? "Add this Ollama model to your workspace."
                  : "Enter your API key to connect."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {importError && (
                <Alert variant="destructive">
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Model Name (Display Name)</Label>
                <Input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="My Model"
                  required
                />
              </div>

              {/* Cloud API Key */}
              {selectedProvider !== "ollama" && selectedProvider !== "local" && (
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    required
                  />
                </div>
              )}

              {/* Local File Path Display (Read Only) */}
              {selectedProvider === "local" && (
                <div className="space-y-2">
                  <Label>File Path</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm break-all">
                    <FileIcon className="w-4 h-4 shrink-0" />
                    {ggufFilePath}
                  </div>
                </div>
              )}

              {/* Model ID (Hidden for local, visible for cloud/ollama if needed to change) */}
              {selectedProvider !== "local" && (
                <div className="space-y-2">
                  <Label>Model ID</Label>
                  <Input
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="Model ID"
                  />
                </div>
              )}

              {/* Base URL (Advanced) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Base URL (Advanced)</Label>
                <Input
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setSelectedProvider(null)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Save Model"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main List View
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Add Model</h1>
        </div>
      </div>

      {isSaved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckIcon className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">Model added successfully!</AlertDescription>
        </Alert>
      )}

      {/* 1. Local / Available Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available Models</h2>
          <Button variant="outline" size="sm" onClick={detectOllama} disabled={isDetectingOllama}>
            {isDetectingOllama ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <RefreshCwIcon className="w-4 h-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Card>
          <div className="divide-y">
            {/* Import GGUF Option - Prominent */}
            <div
              className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={handleGGUFFileSelect}
              role="button"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UploadIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-lg">Import GGUF File</div>
                <div className="text-sm text-muted-foreground">Select a .gguf model file from your computer</div>
              </div>
              <Button variant="ghost" size="icon"><PlusIcon className="w-5 h-5" /></Button>
            </div>

            {/* Detected Ollama Models */}
            {ollamaAvailable && ollamaModels.length > 0 ? (
              ollamaModels.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleOllamaModelSelect(model)}
                  role="button"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <span className="text-lg">🦙</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{model.name}</div>
                      <Badge variant="secondary" className="text-xs">{model.details.parameter_size}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ollama • {model.details.family} • {model.details.quantization_level}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">Add</Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {isDetectingOllama
                  ? "Scanning for local models..."
                  : "No Ollama models detected. Make sure Ollama is running."}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 2. Cloud Providers Section */}
      <section className="space-y-4 pt-4 border-t">
        <h2 className="text-lg font-semibold text-muted-foreground">Add Cloud Provider</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CLOUD_PROVIDERS.map((provider) => (
            <Button
              key={provider.type}
              variant="outline"
              className="h-auto py-3 px-4 justify-start gap-3 bg-card"
              onClick={() => handleCloudProviderSelect(provider)}
            >
              <span className="text-xl">{provider.icon}</span>
              <div className="flex flex-col items-start">
                <span className="font-medium">{provider.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{provider.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
