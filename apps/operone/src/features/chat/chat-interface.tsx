import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User } from 'lucide-react'
import { Button } from '@repo/ui'
import { Input } from '@repo/ui'
import { cn } from '@/lib/utils'
import type { Message } from '../../types'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ScrollArea } from '@repo/ui'

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isLoading])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        // Simulate AI response
        setTimeout(() => {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'This is a placeholder response. The AI engine will be connected via Electron IPC.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMessage])
            setIsLoading(false)
        }, 1000)
    }

    const handleNewChat = () => {
        setMessages([])
        setInput('')
    }

    return (
        <DashboardLayout onNewChat={handleNewChat}>
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
                {/* Messages Area */}
                <div className="flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full w-full">
                        <div className="flex flex-col gap-6 p-4 pb-32 pt-16">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
                                    <div className="w-20 h-20 rounded-3xl bg-background border shadow-sm flex items-center justify-center">
                                        <Sparkles className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="space-y-2 max-w-md">
                                        <h2 className="text-2xl font-semibold tracking-tight">
                                            How can I help you today?
                                        </h2>
                                        <p className="text-muted-foreground">
                                            I'm Operone, your AI assistant. I can help you manage files, run commands, and organize your workspace.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-full max-w-lg mt-8">
                                        {['Summarize my documents', 'Clean up downloads', 'Find duplicate files', 'System status'].map((suggestion) => (
                                            <Button
                                                key={suggestion}
                                                variant="outline"
                                                className="h-auto py-3 px-4 justify-start text-left whitespace-normal border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                                onClick={() => setInput(suggestion)}
                                            >
                                                <span className="text-sm">{suggestion}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2",
                                                message.role === 'user' ? 'justify-end' : 'justify-start'
                                            )}
                                        >
                                            {message.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-full border bg-background flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                                    <Sparkles className="w-4 h-4 text-primary" />
                                                </div>
                                            )}

                                            <div
                                                className={cn(
                                                    "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm max-w-[85%] md:max-w-[75%]",
                                                    message.role === 'user'
                                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                        : 'bg-card border text-card-foreground rounded-tl-sm'
                                                )}
                                            >
                                                {message.content}
                                            </div>

                                            {message.role === 'user' && (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                                    <User className="w-4 h-4 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex gap-4 w-full animate-in fade-in">
                                            <div className="w-8 h-8 rounded-full border bg-background flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="bg-card border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                                                <div className="flex gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce delay-100" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce delay-200" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Input Area */}
                <div className="p-4 pb-6">
                    <div className="relative bg-muted/30 rounded-3xl border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all shadow-sm">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Message Operone..."
                            className="pr-12 py-6 pl-6 text-base bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full transition-all duration-200",
                                input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground/60">
                            Operone can make mistakes. Please verify important information.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
