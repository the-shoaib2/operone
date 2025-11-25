import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, ScrollArea } from '@repo/ui'
import { MessageSquare, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface DashboardLayoutProps {
    children: React.ReactNode
    onNewChat?: () => void
}

export function DashboardLayout({ children, onNewChat }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    // Close sidebar on mobile by default
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
            }
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            {/* Mobile overlay */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div
                className={cn(
                    "flex-shrink-0 bg-muted/30 border-r transition-all duration-300 ease-in-out flex flex-col fixed md:relative h-full z-50",
                    isSidebarOpen ? (isMobile ? "w-full" : "w-[260px]") : "w-0 opacity-0 overflow-hidden"
                )}
            >
                <div className="p-3">
                    <Button
                        onClick={onNewChat}
                        variant="outline"
                        className="w-full justify-start gap-2 h-10 bg-background hover:bg-muted/50 border-muted-foreground/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New chat</span>
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="space-y-4 py-2">
                        <div className="px-2 text-xs font-medium text-muted-foreground/50">Today</div>
                        <div className="space-y-1">
                            {[1, 2, 3].map((i) => (
                                <Button
                                    key={i}
                                    variant="ghost"
                                    className="w-full justify-start text-sm font-normal h-9 px-2 overflow-hidden text-ellipsis whitespace-nowrap"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground" />
                                    <span className="truncate">Previous Chat Session {i}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-3 border-t mt-auto">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">U</span>
                        </div>
                        <span className="text-sm font-medium">User Account</span>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative md:ml-0">
                {/* Header / Toggle */}
                <div className="sticky top-0 z-10 bg-background border-b p-3">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            {isSidebarOpen ? (
                                <PanelLeftClose className="w-4 h-4" />
                            ) : (
                                <PanelLeftOpen className="w-4 h-4" />
                            )}
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground">
                            {isMobile ? "Operone" : "Dashboard"}
                        </div>
                        <div className="w-8" /> {/* Spacer for alignment */}
                    </div>
                </div>

                {children}
            </div>
        </div>
    )
}
