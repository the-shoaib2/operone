import { Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { memo, useEffect, useState } from 'react';

export type ChatMode = 'chat' | 'planning';

// Optimized mode configuration with memoized icons
const modes = [
    {
        id: 'chat' as const,
        label: 'Chat',
        icon: Zap,
        color: 'text-blue-500',
    },
    {
        id: 'planning' as const,
        label: 'Planning',
        icon: Brain,
        color: 'text-purple-500',
    },
] as const;

// Button-based selector for compact spaces
interface ChatModeSelectorProps {
    mode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
    className?: string;
}

export const ChatModeSelector = memo(function ChatModeSelector({ mode, onModeChange, className }: ChatModeSelectorProps) {
    return (
        <div className={cn('flex items-center gap-2 p-2 bg-muted/50 rounded-full', className)}>
            {modes.map((m) => {
                const isActive = mode === m.id;
                const iconColor = isActive ? 'text-destructive-foreground' : 'text-muted-foreground';
                const textColor = isActive ? 'text-destructive-foreground' : 'text-muted-foreground';
                const buttonClass = isActive
                    ? 'bg-destructive text-destructive-foreground'
                    : 'hover:bg-background/80';

                return (
                    <button
                        key={m.id}
                        onClick={() => onModeChange(m.id)}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-full transition-all',
                            buttonClass
                        )}
                        title={m.label}
                        type="button"
                    >
                        <m.icon className={cn('w-4 h-4', iconColor)} />
                        <span className={cn('text-sm font-medium', textColor)}>
                            {m.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

// Dropdown-based selector that matches model selector UI
export type ChatModeDropdownProps = {
    mode?: ChatMode;
    onModeChange?: (mode: ChatMode) => void;
    className?: string;
    placeholder?: string;
    maxContentHeight?: string;
    maxContentWidth?: string;
};

export const ChatModeDropdown = memo(function ChatModeDropdown({
    mode: propMode = 'chat',
    onModeChange,
    className,
    maxContentHeight = "400px",
    maxContentWidth = "320px",
}: ChatModeDropdownProps) {
    // Initialize mode from localStorage or prop
    const [mode, setMode] = useState<ChatMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat-mode');
            if (saved && (saved === 'chat' || saved === 'planning')) {
                return saved as ChatMode;
            }
        }
        return propMode;
    });

    // Sync with localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('chat-mode', mode);
        }
    }, [mode]);

    // Handle mode change
    const handleModeChange = (newMode: ChatMode) => {
        setMode(newMode);
        onModeChange?.(newMode);
    };

    const selectedMode = modes.find(m => m.id === mode);

    return (
        <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className={cn("w-full rounded-full border-0 outline-none ring-0 focus:ring-0 focus:border-0 px-1.5 py-0.5", className)}>
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    {selectedMode && (
                        <>
                            <selectedMode.icon className={cn("size-2.5", selectedMode.color)} />
                            <span className="truncate text-xs font-medium">
                                {selectedMode.label}
                            </span>
                        </>
                    )}
                </div>
            </SelectTrigger>
            <SelectContent
                className={cn(
                    "z-50 max-h-[var(--radix-select-content-available-height)] min-w-[110px] border-0",
                    "max-h-[--radix-select-content-available-height] w-[110px]"
                )}
                style={{
                    maxHeight: maxContentHeight,
                    maxWidth: maxContentWidth,
                }}
            >
                {modes.map((modeInfo) => (
                    <SelectItem
                        key={modeInfo.id}
                        value={modeInfo.id}
                        className="px-1.5 py-0.5 data-[state=checked]:bg-muted"
                    >
                        <div className="flex items-center gap-1.5">
                            <modeInfo.icon className={cn("size-2.5", modeInfo.color)} />
                            <span className="text-xs font-medium">{modeInfo.label}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
});
