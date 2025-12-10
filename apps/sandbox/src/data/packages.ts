import type { ComponentType } from 'react';
import {
    Network,
    FolderTree,
    Terminal,
    MessageSquare,
    MemoryStick,
    Cpu,
    Database,
    Settings
} from 'lucide-react';

export interface OSPackage {
    id: string;
    name: string;
    icon: ComponentType<{ className?: string }>;
    route: string;
    description: string;
    category: 'core' | 'system' | 'network' | 'storage';
}

export const osPackages: OSPackage[] = [
    {
        id: 'networking',
        name: 'Networking',
        icon: Network,
        route: '/networking',
        description: 'Network topology simulation with 5 PCs',
        category: 'network'
    },
    {
        id: 'filesystem',
        name: 'File System',
        icon: FolderTree,
        route: '/filesystem',
        description: 'File and folder management operations',
        category: 'storage'
    },
    {
        id: 'shell',
        name: 'Shell',
        icon: Terminal,
        route: '/shell',
        description: 'Command-line interface and shell ops',
        category: 'core'
    },
    {
        id: 'mcp',
        name: 'MCP',
        icon: MessageSquare,
        route: '/mcp',
        description: 'Message Control Protocol operations',
        category: 'network'
    },
    {
        id: 'memory',
        name: 'Memory',
        icon: MemoryStick,
        route: '/memory',
        description: 'Memory management and allocation view',
        category: 'system'
    },
    {
        id: 'process',
        name: 'Process',
        icon: Cpu,
        route: '/process',
        description: 'Process management and CPU scheduling',
        category: 'system'
    },
    {
        id: 'database',
        name: 'Database',
        icon: Database,
        route: '/database',
        description: 'Database operations and management',
        category: 'storage'
    },
    {
        id: 'automation',
        name: 'Automation',
        icon: Settings,
        route: '/automation',
        description: 'System automation and scripting tools',
        category: 'core'
    }
];
