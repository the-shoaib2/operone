import { useState, useEffect, useRef } from 'react'

import { Settings, Database, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

import { AISettings } from './ai-settings'
import { MemorySettings } from './memory-settings'
import { SystemSettings } from './system-settings'

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
                                Models
                            </h1>
                        </div>
                        <AISettings />
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
                        <MemorySettings />
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
                        <SystemSettings />
                    </div>
                </div>
            </div>
        </div>
    )
}
