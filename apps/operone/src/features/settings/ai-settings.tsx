import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAI } from '@/contexts/ai-context'
import type { ProviderConfig, ProviderType } from '@repo/types'
import { OllamaDetector, type OllamaModel } from '@/utils/ollama-detector'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Loader2Icon,
    RefreshCwIcon,
    ServerIcon,
    HardDriveIcon,
    CheckIcon,
    PlusIcon,
    ArrowLeftIcon,
    DatabaseIcon
} from "lucide-react"

// Simplified Provider Options for Dropdown
const PROVIDER_OPTIONS = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "google", label: "Google Gemini" },
    { value: "mistral", label: "Mistral AI" },
    { value: "openrouter", label: "OpenRouter" },
    // Ollama is handled via detection, but allow manual add if needed
    { value: "ollama", label: "Ollama (Manual)" },
];

export function AISettings() {
    // Top level state to toggle between List and Add
    const [view, setView] = useState<'list' | 'add'>('list');

    return (
        <div className="space-y-6">
            {view === 'list' ? (
                <AISettingsList onAddClick={() => setView('add')} />
            ) : (
                <AISettingsAdd onCancel={() => setView('list')} onSave={() => setView('list')} />
            )}
        </div>
    )
}

function AISettingsList({ onAddClick }: { onAddClick: () => void }) {
    const { activeProvider, allProviders, setActiveProvider, removeProvider, testProvider, addProvider } = useAI()
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

    // Ollama detection state
    const [ollamaDetector] = useState(() => OllamaDetector.getInstance())
    const [isDetectingOllama, setIsDetectingOllama] = useState(false)
    const [ollamaAvailable, setOllamaAvailable] = useState(false)
    const [detectedOllamaModels, setDetectedOllamaModels] = useState<OllamaModel[]>([])

    useEffect(() => {
        detectOllama()
    }, [])

    const detectOllama = async () => {
        setIsDetectingOllama(true)
        try {
            const available = await ollamaDetector.checkAvailability()
            setOllamaAvailable(available)

            if (available) {
                const models = await ollamaDetector.getAvailableModels()
                setDetectedOllamaModels(models)
            } else {
                setDetectedOllamaModels([])
            }
        } catch (error) {
            console.error('Failed to detect Ollama:', error)
            setOllamaAvailable(false)
        } finally {
            setIsDetectingOllama(false)
        }
    }

    const handleTestProvider = async (providerId: string) => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const result = await testProvider(providerId)
            setTestResult(result)
        } catch (error) {
            setTestResult({ success: false, error: 'Test failed' })
        } finally {
            setIsTesting(false)
        }
    }

    const handleSetActiveProvider = async (providerId: string) => {
        try {
            await setActiveProvider(providerId)
        } catch (error) {
            console.error('Failed to set active provider:', error)
        }
    }

    const handleRemoveProvider = async (providerId: string) => {
        if (confirm('Are you sure you want to remove this provider?')) {
            try {
                await removeProvider(providerId)
            } catch (error) {
                console.error('Failed to remove provider:', error)
            }
        }
    }

    const handleAddDetectedOllama = async (model: OllamaModel) => {
        const id = `ollama-${model.name}`;
        // Check if already exists
        if (allProviders[id]) {
            handleSetActiveProvider(id);
            return;
        }

        const config: ProviderConfig = {
            type: 'ollama',
            model: model.name,
            baseURL: 'http://localhost:11434'
        };
        await addProvider(id, config);
        // await handleSetActiveProvider(id); // Optional: auto-activate?
    };

    const getProviderIcon = (type: ProviderType) => {
        const icons: Record<ProviderType, string> = {
            openai: '🤖',
            anthropic: '🧠',
            google: '🔍',
            mistral: '🌊',
            ollama: '🦙',
            openrouter: '🛣️',
            local: '📦',
            custom: '⚙️'
        }
        return icons[type] || '🤖'
    }

    // Combine configured providers and detected models not yet configured
    // We want to show a unified list of "Available Models"

    // 1. Get all Configured Providers
    const configuredList = Object.entries(allProviders).map(([id, config]) => ({
        id,
        config,
        isConfigured: true,
        source: 'configured' as const
    }));

    // 2. Get Detected Ollama Models that are NOT in configured list
    // We check by model name generally, assuming ID convention or just checking if a provider with that model exists?
    // Actually simpler: Just show them as separate items "Detected (Not Configured)" if they aren't configured.
    // A simple heuristic: check if any provider has type='ollama' and model={model.name}
    const detectedList = detectedOllamaModels.filter(m => {
        return !Object.values(allProviders).some(p => p.type === 'ollama' && p.model === m.name);
    }).map(m => ({
        id: `detected-${m.name}`,
        config: { type: 'ollama' as ProviderType, model: m.name, baseURL: 'http://localhost:11434' } as ProviderConfig,
        isConfigured: false,
        source: 'detected' as const,
        details: m.details
    }));

    const allItems = [...configuredList, ...detectedList];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Available Models</h3>
                    <p className="text-sm text-muted-foreground">Manage your AI models and providers</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={detectOllama} disabled={isDetectingOllama}>
                        <RefreshCwIcon className={cn("w-4 h-4 mr-2", isDetectingOllama && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button onClick={onAddClick}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Model
                    </Button>
                </div>
            </div>

            {/* Test Result */}
            {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"} className="mb-4">
                    <AlertDescription>
                        {testResult.success ? 'Provider test successful!' : `Test failed: ${testResult.error}`}
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {allItems.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                        No models configured or detected. Click "Add Model" to start.
                    </div>
                ) : (
                    allItems.map((item) => {
                        const isConfigured = item.isConfigured;
                        const config = item.config;
                        const id = item.id;
                        const isActive = isConfigured && activeProvider?.type === config.type && activeProvider?.model === config.model;

                        return (
                            <div key={id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl flex-shrink-0 bg-muted p-2 rounded-md">
                                        {getProviderIcon(config.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{isConfigured ? id : config.model}</span>
                                            {!isConfigured && <Badge variant="secondary" className="text-xs">Discovered</Badge>}
                                            {isActive && <Badge variant="default" className="bg-green-600">Active</Badge>}
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>{config.type === 'local' ? 'Local GGUF' : config.type}</span>
                                            {item.source === 'detected' && item.details && (
                                                <>
                                                    <span>•</span>
                                                    <span>{item.details.parameter_size}</span>
                                                </>
                                            )}
                                            {isConfigured && config.model && (
                                                <>
                                                    <span>•</span>
                                                    <span>{config.model}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isConfigured ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestProvider(id)}
                                                disabled={isTesting}
                                            >
                                                Test
                                            </Button>
                                            {!isActive && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleSetActiveProvider(id)}
                                                >
                                                    Set Active
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveProvider(id)}
                                            >
                                                Remove
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddDetectedOllama(detectedList.find(d => d.id === id)!.config.model! as any)}
                                        >
                                            Use Model
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {!ollamaAvailable && (
                <Alert className="mt-6 bg-muted/50 border-none">
                    <DatabaseIcon className="h-4 w-4" />
                    <AlertDescription>
                        Ollama is not running. Start Ollama to auto-detect local models.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}

function AISettingsAdd({ onCancel, onSave }: { onCancel: () => void, onSave: () => void }) {
    const { addProvider } = useAI();
    // Default to 'local' tab as requested
    const [activeTab, setActiveTab] = useState<'local' | 'api'>('local');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Form state
    const [selectedProvider, setSelectedProvider] = useState<string>("openai");
    const [providerName, setProviderName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [baseURL, setBaseURL] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [ggufFilePath, setGgufFilePath] = useState("");
    const [ggufFileName, setGgufFileName] = useState("");
    const [importError, setImportError] = useState("");


    const handleGGUFFileSelect = async () => {
        // @ts-ignore
        if (!window.electronAPI?.dialog) {
            setImportError("File dialog not available");
            return;
        }
        try {
            // @ts-ignore
            const result = await window.electronAPI.dialog.openFile({
                title: "Select GGUF Model File",
                filters: [{ name: "GGUF Models", extensions: ["gguf"] }],
            });
            if (!result.canceled && result.filePath) {
                setGgufFilePath(result.filePath);
                const fileName = result.filePath.split(/[/\\]/).pop() || "model.gguf";
                setGgufFileName(fileName);
                setProviderName(fileName.replace(".gguf", ""));
                setImportError("");
            }
        } catch (e) {
            setImportError("Failed to select file");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setImportError("");

        try {
            const id = `${activeTab === 'local' ? 'local' : selectedProvider}-${Date.now()}`;
            let config: ProviderConfig;

            if (activeTab === 'local') {
                if (!ggufFilePath) throw new Error("Please select a GGUF file");

                // @ts-ignore
                const importResult = await window.electronAPI.model.import(ggufFilePath, {
                    name: providerName,
                    description: "Imported GGUF"
                });
                if (!importResult.success) throw new Error(importResult.error || "Import failed");

                config = {
                    type: "local",
                    modelPath: ggufFilePath,
                    model: providerName,
                    contextSize: 2048,
                };
            } else {
                if (!apiKey && selectedProvider !== 'custom' && selectedProvider !== 'ollama') throw new Error("API Key is required");

                config = {
                    type: selectedProvider as ProviderType,
                    apiKey,
                    baseURL: baseURL || undefined,
                    model: selectedModel || undefined,
                };

                // Special handling for manual Ollama
                if (selectedProvider === 'ollama') {
                    config.baseURL = baseURL || 'http://localhost:11434';
                }
            }

            await addProvider(id, config);
            setIsSaved(true);
            setTimeout(() => {
                onSave();
            }, 800);
        } catch (err: any) {
            setImportError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <ArrowLeftIcon className="w-5 h-5" />
                </Button>
                <h2 className="text-xl font-semibold">Add New Model</h2>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Tab Selection */}
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'local' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                        )}
                    >
                        <HardDriveIcon className="w-4 h-4" /> Local Model (GGUF)
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
                            activeTab === 'api' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                        )}
                    >
                        <ServerIcon className="w-4 h-4" /> Cloud/API Provider
                    </button>
                </div>

                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle>
                            {activeTab === 'local' ? 'Import Local GGUF Model' : 'Connect Provider'}
                        </CardTitle>
                        <CardDescription>
                            {activeTab === 'local'
                                ? 'Run LLMs locally on your machine for privacy and offline capability.'
                                : 'Connect to external AI providers like OpenAI, Anthropic, or others.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {importError && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertDescription>{importError}</AlertDescription>
                                </Alert>
                            )}
                            {isSaved && (
                                <Alert className="py-2 border-green-200 bg-green-50 text-green-800">
                                    <CheckIcon className="w-4 h-4 mr-2" />
                                    <AlertDescription>Saved!</AlertDescription>
                                </Alert>
                            )}

                            {activeTab === 'local' && (
                                <>
                                    <div className="p-6 bg-muted/30 border-2 border-dashed rounded-lg text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleGGUFFileSelect}>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                                <HardDriveIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{ggufFileName || "Select GGUF File"}</div>
                                                <div className="text-xs text-muted-foreground mt-1">Click to browse your file system</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Display Name</Label>
                                        <Input
                                            value={providerName}
                                            onChange={e => setProviderName(e.target.value)}
                                            placeholder="e.g. Llama 3 8B"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'api' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Provider</Label>
                                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PROVIDER_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <Input
                                            type="password"
                                            value={apiKey}
                                            onChange={e => setApiKey(e.target.value)}
                                            placeholder={selectedProvider === 'ollama' ? "Not required for Ollama" : "sk-..."}
                                            disabled={selectedProvider === 'ollama'}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Model ID (Optional)</Label>
                                        <Input
                                            value={selectedModel}
                                            onChange={e => setSelectedModel(e.target.value)}
                                            placeholder="e.g. gpt-4-turbo"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground font-normal">Base URL (Advanced)</Label>
                                        <Input
                                            value={baseURL}
                                            onChange={e => setBaseURL(e.target.value)}
                                            placeholder={selectedProvider === 'ollama' ? "http://localhost:11434" : "https://api.example.com/v1"}
                                        />
                                    </div>
                                </>
                            )}

                            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                                {isLoading ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isLoading ? "Saving..." : "Save Model"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
