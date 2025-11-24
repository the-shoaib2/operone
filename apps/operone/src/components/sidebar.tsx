import { MessageSquare, Settings, Database, Plus, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { View } from '../App'
import { useAuth } from './auth-context'

interface SidebarProps {
    className?: string
    activeView: View
    onNavigate: (view: View) => void
}

export function Sidebar({ className, activeView, onNavigate }: SidebarProps) {
    const { user, logout } = useAuth()

    return (
        <div className={cn("pb-12 w-64 border-r bg-muted/20 h-screen flex flex-col", className)}>
            <div className="space-y-4 py-4 flex-1">
                <div className="px-3 py-2">
                    <div className="flex items-center justify-between mb-4 px-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Operone
                        </h2>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">New Chat</span>
                        </Button>
                    </div>
                    <div className="space-y-1">
                        <Button
                            variant={activeView === 'chat' ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => onNavigate('chat')}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                        </Button>
                        <Button
                            variant={activeView === 'memory' ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => onNavigate('memory')}
                        >
                            <Database className="mr-2 h-4 w-4" />
                            Memory
                        </Button>
                        <Button
                            variant={activeView === 'settings' ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => onNavigate('settings')}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </div>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Recent
                    </h2>
                    <div className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start font-normal">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Project Planning
                        </Button>
                        <Button variant="ghost" className="w-full justify-start font-normal">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Code Review
                        </Button>
                    </div>
                </div>
            </div>

            {/* User section at bottom */}
            <div className="px-3 py-4 border-t">
                <div className="flex items-center gap-3 px-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={logout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )
}
