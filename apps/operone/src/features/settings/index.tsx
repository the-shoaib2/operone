import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components'
import { Input } from '@/components'
import { Card } from '@/components'

import { Label } from '@/components'
import { Badge } from '@/components'
import { Alert, AlertDescription } from '@/components'
import { useAI } from '@/contexts/ai-context'
import type { ProviderType } from '@repo/types'
import { BrowserAdapter } from '@repo/operone'
import { Search, Settings, Database, Cpu } from 'lucide-react'
import { SystemStatus } from '@/components/system-status'
import { cn } from '@/lib/utils'

const { OllamaDetector } = BrowserAdapter;

type TabType = 'ai' | 'memory' | 'system';

interface SettingsSection {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const settingsSections: SettingsSection[] = [
    {
        id: 'ai',
        label: 'AI',
        icon: <Settings className="w-4 h-4" />,
        description: 'Configure AI providers and models'
    },
    {
        id: 'memory',
        label: 'Memory',
        icon: <Database className="w-4 h-4" />,
        description: 'Manage memory and storage'
    },
    {
        id: 'system',
        label: 'System',
        icon: <Cpu className="w-4 h-4" />,
        description: 'System status and configuration'
    }
];

export function UnifiedSettings() {
    const [activeTab, setActiveTab] = useState<TabType>('ai');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<TabType, HTMLDivElement | null>>({
        ai: null,
        memory: null,
        system: null
    });

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollContainerRef.current) return;

            const scrollTop = scrollContainerRef.current.scrollTop;
            const containerHeight = scrollContainerRef.current.clientHeight;
            const scrollHeight = scrollContainerRef.current.scrollHeight;

            // Determine which section is most visible
            let mostVisibleSection: TabType = 'ai';
            let maxVisibility = 0;

            Object.entries(sectionRefs.current).forEach(([sectionId, element]) => {
                if (!element) return;

                const rect = element.getBoundingClientRect();
                const containerRect = scrollContainerRef.current!.getBoundingClientRect();

                const relativeTop = rect.top - containerRect.top;
                const relativeBottom = rect.bottom - containerRect.top;

                const visibleTop = Math.max(0, relativeTop);
                const visibleBottom = Math.min(containerHeight, relativeBottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);

                const visibilityPercentage = visibleHeight / rect.height;

                if (visibilityPercentage > maxVisibility) {
                    maxVisibility = visibilityPercentage;
                    mostVisibleSection = sectionId as TabType;
                }
            });

            // Check if we've reached the end of a section
            if (scrollTop + containerHeight >= scrollHeight - 10) {
                // At the bottom, activate the last section
                const lastSection = settingsSections[settingsSections.length - 1];
                if (lastSection) {
                    setActiveTab(lastSection.id);
                }
            } else if (maxVisibility > 0.3) {
                // If a section is sufficiently visible, switch to it
                setActiveTab(mostVisibleSection);
            }
        };

        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const scrollToSection = (sectionId: TabType) => {
        const element = sectionRefs.current[sectionId];
        if (element && scrollContainerRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex h-full bg-background overflow-hidden">
            {/* Sidebar Navigation - Fixed height, scrollable */}
            <div className="w-40 border-r bg-[hsl(var(--sidebar-background))] flex-col h-full md:flex hidden">
                <div className="p-4 flex-shrink-0">
                    <h2 className="text-sm font-semibold tracking-tight">Settings</h2>
                </div>

                <nav className="flex-1 px-2 pb-2 space-y-1 overflow-y-auto">
                    {settingsSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={cn(
                                "w-full flex items-center px-2 py-1.5 text-xs rounded transition-colors relative",
                                activeTab === section.id
                                    ? "bg-muted text-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {activeTab === section.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />
                            )}
                            <span className="flex-1 text-left pl-1">{section.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Mobile Navigation Dropdown */}
            <div className="md:hidden w-full p-3 border-b bg-background">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-sm font-semibold tracking-tight mb-2">Settings</h2>
                    <div className="flex flex-wrap gap-1">
                        {settingsSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={cn(
                                    "flex items-center px-2 py-1 text-sm rounded transition-colors border",
                                    activeTab === section.id
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"
                                )}
                            >
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto h-full"
            >
                <div className="p-3 md:p-4 max-w-4xl mx-auto space-y-6">
                    {/* AI Settings Section */}
                    <div
                        ref={(el) => { sectionRefs.current.ai = el; }}
                        className="py-4"
                    >
                        <div className="mb-4">
                            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                AI
                            </h1>
                        </div>
                        <AISettingsTab />
                    </div>

                    {/* Memory Section */}
                    <div
                        ref={(el) => { sectionRefs.current.memory = el; }}
                        className="py-4"
                    >
                        <div className="mb-4">
                            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Memory
                            </h1>
                        </div>
                        <MemoryTab />
                    </div>

                    {/* System Section */}
                    <div
                        ref={(el) => { sectionRefs.current.system = el; }}
                        className="py-4 pb-12"
                    >
                        <div className="mb-4">
                            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                <Cpu className="w-4 h-4" />
                                System
                            </h1>
                        </div>
                        <SystemTab />
                    </div>
                </div>
            </div>
        </div>
    )
}

function AISettingsTab() {
    const { activeProvider, allProviders, setActiveProvider, removeProvider, testProvider } = useAI()
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

    // Ollama detection state
    const [ollamaDetector] = useState(() => OllamaDetector.getInstance())
    const [isDetectingOllama, setIsDetectingOllama] = useState(false)
    const [ollamaAvailable, setOllamaAvailable] = useState(false)
    const [ollamaInfo, setOllamaInfo] = useState<any>(null)
    const [detectedOllamaModels, setDetectedOllamaModels] = useState<any[]>([])

    useEffect(() => {
        detectOllama()
    }, [])

    const detectOllama = async () => {
        setIsDetectingOllama(true)
        try {
            const available = await ollamaDetector.checkAvailability()
            setOllamaAvailable(available)

            if (available) {
                const info = await ollamaDetector.getInfo()
                setOllamaInfo(info)

                const models = await ollamaDetector.getAvailableModels()
                setDetectedOllamaModels(models)
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

    return (
        <>
            {/* Ollama Detection Status */}
            <Card className="p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Ollama Detection</h3>
                    <p className="text-sm text-muted-foreground">Automatic detection of local Ollama installation</p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🦙</span>
                        <div>
                            <div className="font-medium">Local Ollama</div>
                            <div className="text-sm text-muted-foreground">
                                {isDetectingOllama ? 'Detecting...' : ollamaAvailable ? 'Available' : 'Not detected'}
                            </div>
                        </div>
                        {ollamaAvailable && (
                            <Badge variant="default" className="bg-green-500">Connected</Badge>
                        )}
                        {!ollamaAvailable && !isDetectingOllama && (
                            <Badge variant="destructive">Not Available</Badge>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={detectOllama}
                        disabled={isDetectingOllama}
                    >
                        {isDetectingOllama ? 'Detecting...' : 'Refresh'}
                    </Button>
                </div>

                {ollamaInfo && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        <div>Version: {ollamaInfo.version}</div>
                        <div>Build: {ollamaInfo.build}</div>
                        <div>Models detected: {detectedOllamaModels.length}</div>
                    </div>
                )}

                {ollamaAvailable && detectedOllamaModels.length > 0 && (
                    <div className="space-y-2">
                        <Label>Available Models</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {detectedOllamaModels.slice(0, 6).map((model) => (
                                <div key={model.name} className="text-sm p-2 border rounded">
                                    <div className="font-medium">{model.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {model.details.family} • {model.details.parameter_size}
                                    </div>
                                </div>
                            ))}
                            {detectedOllamaModels.length > 6 && (
                                <div className="text-sm p-2 border rounded text-muted-foreground">
                                    +{detectedOllamaModels.length - 6} more models
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!ollamaAvailable && (
                    <Alert>
                        <AlertDescription>
                            Ollama not detected. Install Ollama from{' '}
                            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline">
                                ollama.com
                            </a>{' '}
                            and start it with <code className="bg-muted px-1 rounded">ollama serve</code>
                        </AlertDescription>
                    </Alert>
                )}
            </Card>

            {/* Add New Provider */}
            <Card className="p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Add AI Provider</h3>
                    <p className="text-sm text-muted-foreground">Configure a new AI provider to use with Operone</p>
                </div>

                <Button onClick={() => window.location.href = '/settings/add-model'} className="w-full">
                    Add New Model
                </Button>
            </Card>

            {/* Existing Providers */}
            <Card className="p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Configured Providers</h3>
                    <p className="text-sm text-muted-foreground">Manage your existing AI providers</p>
                </div>

                {Object.entries(allProviders).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No providers configured yet. Add your first provider above.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(allProviders).map(([id, config]) => (
                            <div key={id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getProviderIcon(config.type)}</span>
                                    <div>
                                        <div className="font-medium">{id}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {config.model} • {config.type}
                                        </div>
                                    </div>
                                    {activeProvider?.type === config.type && activeProvider?.model === config.model && (
                                        <Badge variant="default">Active</Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTestProvider(id)}
                                        disabled={isTesting}
                                    >
                                        {isTesting ? 'Testing...' : 'Test'}
                                    </Button>

                                    {(!activeProvider || activeProvider.type !== config.type || activeProvider.model !== config.model) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSetActiveProvider(id)}
                                        >
                                            Set Active
                                        </Button>
                                    )}

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveProvider(id)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Test Result */}
            {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                    <AlertDescription>
                        {testResult.success ? 'Provider test successful!' : `Test failed: ${testResult.error}`}
                    </AlertDescription>
                </Alert>
            )}
        </>
    )
}

function MemoryTab() {
    const [stats, setStats] = useState({ vectorDocuments: 0, shortTermMemory: 0 })
    const [query, setQuery] = useState('')

    useEffect(() => {
        // Load stats
        // window.electron?.getStats().then(setStats)
        setStats({ vectorDocuments: 12, shortTermMemory: 5 })
    }, [])

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Vector Documents</h3>
                    <p className="text-3xl font-bold mt-2">{stats.vectorDocuments}</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Short-term Items</h3>
                    <p className="text-3xl font-bold mt-2">{stats.shortTermMemory}</p>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search memory..."
                        className="pl-9"
                    />
                </div>

                <div className="text-center py-12 text-muted-foreground">
                    No memory items found matching your query.
                </div>
            </div>
        </>
    )
}

function SystemTab() {
    return <SystemStatus />
}
