import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { useAI } from '@/contexts/ai-context'
import { useModelDetector } from '@/contexts/model-context'
import type { ProviderConfig, ProviderType } from '@repo/types'
import { cn } from '@/lib/utils'
import {
    Loader2Icon,
    RefreshCwIcon,
    HardDriveIcon,
    TrashIcon,
    AlertCircleIcon,
    CheckCircleIcon,
} from 'lucide-react'

export function AISettings() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-6">
                <ModelsTab />
            </div>
        </div>
    )
}

function ModelsTab() {
    const { availableModels, isLoading, refreshModels } = useModelDetector()
    const [filter, setFilter] = useState('')

    const filteredModels = availableModels.filter(model =>
        model.name.toLowerCase().includes(filter.toLowerCase()) ||
        model.provider.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Import Local Model Section */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Import Local Model</h3>
                <LocalModelForm onComplete={refreshModels} />
            </Card>

            {/* Provider Configuration Section */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Provider Configuration</h3>
                <ProviderConfigForm />
            </Card>

            {/* Models List Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Available Models</h3>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search models..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-9 w-64"
                            data-testid="search-models-input"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshModels}
                            disabled={isLoading}
                            data-testid="refresh-models-button"
                        >
                            <RefreshCwIcon className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {filteredModels.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <HardDriveIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No models found</p>
                            <p className="text-sm mt-1">Import a model or configure a provider to get started</p>
                        </div>
                    ) : (
                        filteredModels.map((model) => (
                            <ModelCard key={model.id} model={model} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function ModelCard({ model }: { model: any }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const { refreshModels } = useModelDetector()
    const [isDeleting, setIsDeleting] = useState(false)

    const getProviderIcon = (provider: string) => {
        const icons: Record<string, string> = {
            openai: '🤖',
            anthropic: '🧠',
            google: '🔍',
            mistral: '🌊',
            ollama: '🦙',
            openrouter: '🛣️',
            local: '📦',
            custom: '⚙️',
        }
        return icons[provider] || '🤖'
    }

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to remove "${model.name}"?`)) {
            return
        }

        setIsDeleting(true)
        try {
            // For local models, call the electron API to remove
            if (model.provider === 'local' && model.id.startsWith('local:')) {
                const modelId = model.id.replace('local:', '')
                // @ts-ignore
                const result = await window.electronAPI.model.remove(modelId)

                if (result.success) {
                    // Refresh the models list
                    await refreshModels()
                } else {
                    alert('Failed to remove model')
                }
            } else {
                // For other providers, you might have different logic
                alert('Removing this model type is not yet implemented')
            }
        } catch (error) {
            console.error('Failed to remove model:', error)
            alert('Failed to remove model')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Card className="p-4 hover:bg-muted/50 transition-colors" data-testid="model-card">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">{getProviderIcon(model.provider)}</div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            {model.isActive && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                    Active
                                </Badge>
                            )}
                            {model.isLocal && (
                                <Badge variant="secondary" className="text-xs">
                                    Local
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                            {model.provider} {model.description && `• ${model.description}`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        data-testid="model-remove-button"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}



function LocalModelForm({ onBack, onComplete }: { onBack?: () => void; onComplete: () => void }) {
    const { refreshModels } = useModelDetector()
    const [filePath, setFilePath] = useState('')
    const [fileName, setFileName] = useState('')
    const [modelName, setModelName] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleFileSelect = async () => {
        // @ts-ignore
        if (!window.electronAPI?.dialog) return

        try {
            // @ts-ignore
            const result = await window.electronAPI.dialog.openFile({
                title: 'Select Model File',
                filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
            })

            if (!result.canceled && result.filePath) {
                setFilePath(result.filePath)
                const name = result.filePath.split(/[/\\]/).pop() || 'model.gguf'
                setFileName(name)
                setModelName(name.replace('.gguf', ''))
                setError('')
            }
        } catch (e) {
            console.error('Failed to select file:', e)
            setError('Failed to open file dialog')
        }
    }

    const handleImport = async () => {
        if (!filePath) return

        setIsImporting(true)
        setError('')
        setSuccess(false)

        try {
            // @ts-ignore
            const result = await window.electronAPI.model.import(filePath, {
                name: modelName,
                description: 'Imported local model',
            })

            if (result.success) {
                setSuccess(true);
                // Wait for electron-store to persist the data
                await new Promise(resolve => setTimeout(resolve, 300));
                // Refresh the models list
                await refreshModels();
                // Close the form after showing success message
                setTimeout(() => {
                    onComplete();
                }, 1200);
            } else {
                setError(result.error || 'Failed to import model');
            }
        } catch (e) {
            console.error('Import failed:', e)
            setError(e instanceof Error ? e.message : 'Failed to import model')
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="space-y-4">
                    <div>
                        <Label>Model File</Label>
                        <div
                            className="mt-2 p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={handleFileSelect}
                        >
                            <HardDriveIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="font-medium">{fileName || 'Select GGUF File'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click to browse your file system
                            </p>
                        </div>
                    </div>

                    {filePath && (
                        <div>
                            <Label>Model Name</Label>
                            <Input
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                placeholder="e.g. Llama 3 8B"
                                className="mt-2"
                                data-testid="model-name-input"
                            />
                        </div>
                    )}

                    {error && (
                        <Alert className="bg-destructive/10 border-destructive/50">
                            <AlertCircleIcon className="h-4 w-4 text-destructive" />
                            <AlertDescription className="text-destructive">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-500/10 border-green-500/50">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-500">
                                Model imported successfully!
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </Card>

            <div className="flex justify-end gap-2">
                {onBack && (
                    <Button variant="outline" onClick={onBack} disabled={isImporting} data-testid="cancel-import-button">
                        Cancel
                    </Button>
                )}
                <Button onClick={handleImport} disabled={!filePath || isImporting || success} data-testid="import-model-button">
                    {isImporting && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    {success ? 'Imported!' : 'Import Model'}
                </Button>
            </div>
        </div>
    )
}

function ProviderConfigForm() {
    const { addProvider } = useAI()
    const { refreshModels } = useModelDetector()
    const [providerType, setProviderType] = useState('openai')
    const [apiKey, setApiKey] = useState('')
    const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
    const [isSaving, setIsSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const providers = [
        { value: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1' },
        { value: 'anthropic', label: 'Anthropic', url: 'https://api.anthropic.com/v1' },
        { value: 'google', label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1' },
        { value: 'mistral', label: 'Mistral AI', url: 'https://api.mistral.ai/v1' },
        { value: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
        { value: 'ollama', label: 'Ollama', url: 'http://localhost:11434' },
    ]

    // Auto-set base URL when provider changes
    useEffect(() => {
        const provider = providers.find(p => p.value === providerType)
        if (provider) {
            setBaseUrl(provider.url)
        }
    }, [providerType])

    const handleSave = async () => {
        setIsSaving(true)
        setSuccess(false)
        setError('')

        try {
            // Create provider config
            const config: ProviderConfig = {
                type: providerType as ProviderType,
                apiKey: providerType === 'ollama' ? undefined : apiKey,
                baseURL: baseUrl,
                model: '', // Will be set by the provider
            }

            // Generate unique provider ID
            const providerId = `${providerType}-${Date.now()}`

            // Add provider using AI context
            await addProvider(providerId, config)

            // Refresh models to pick up the new provider
            await refreshModels()

            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                // Clear form
                setApiKey('')
            }, 2000)
        } catch (err) {
            console.error('Failed to save provider config:', err)
            setError(err instanceof Error ? err.message : 'Failed to save provider configuration')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Provider</Label>
                    <Select value={providerType} onValueChange={setProviderType}>
                        <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                            {providers.map(provider => (
                                <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Base URL (Optional)</Label>
                    <Input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={providerType === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com'}
                        className="mt-2"
                    />
                </div>
            </div>

            <div>
                <Label>API Key</Label>
                <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={providerType === 'ollama' ? 'Not required for Ollama' : 'sk-...'}
                    disabled={providerType === 'ollama'}
                    className="mt-2"
                />
            </div>

            {error && (
                <Alert className="bg-destructive/10 border-destructive/50">
                    <AlertCircleIcon className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                        Provider configuration saved successfully!
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || (!apiKey && providerType !== 'ollama')}>
                    {isSaving && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </div>
    )
}
