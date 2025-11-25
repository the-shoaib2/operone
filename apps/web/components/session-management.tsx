'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge } from '@repo/ui'
import { Loader2, Monitor, Smartphone, Tablet, LogOut } from 'lucide-react'

interface Session {
    id: string
    userAgent: string | null
    ipAddress: string | null
    deviceName: string | null
    lastActivity: string
    createdAt: string
    isCurrent: boolean
}

export function SessionManagement() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [revokingSession, setRevokingSession] = useState<Session | null>(null)

    const fetchSessions = async () => {
        try {
            const response = await fetch('/api/sessions')
            if (response.ok) {
                const data = await response.json()
                setSessions(data.sessions)
            }
        } catch (error) {
            console.error('Error fetching sessions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSessions()
        // Refresh sessions every 30 seconds
        const interval = setInterval(fetchSessions, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleRevoke = async () => {
        if (!revokingSession) return

        try {
            const response = await fetch(`/api/sessions/${revokingSession.id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                await fetchSessions()
                setRevokingSession(null)
            }
        } catch (error) {
            console.error('Error revoking session:', error)
        }
    }

    const getDeviceIcon = (userAgent: string | null) => {
        if (!userAgent) return <Monitor className="h-5 w-5" />

        const ua = userAgent.toLowerCase()
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="h-5 w-5" />
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return <Tablet className="h-5 w-5" />
        }
        return <Monitor className="h-5 w-5" />
    }

    const getDeviceInfo = (session: Session) => {
        if (session.deviceName) return session.deviceName

        if (session.userAgent) {
            const ua = session.userAgent
            // Extract browser name
            let browser = 'Unknown Browser'
            if (ua.includes('Chrome')) browser = 'Chrome'
            else if (ua.includes('Firefox')) browser = 'Firefox'
            else if (ua.includes('Safari')) browser = 'Safari'
            else if (ua.includes('Edge')) browser = 'Edge'

            // Extract OS
            let os = ''
            if (ua.includes('Windows')) os = 'Windows'
            else if (ua.includes('Mac')) os = 'macOS'
            else if (ua.includes('Linux')) os = 'Linux'
            else if (ua.includes('Android')) os = 'Android'
            else if (ua.includes('iOS')) os = 'iOS'

            return `${browser}${os ? ` on ${os}` : ''}`
        }

        return 'Unknown Device'
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

        const diffDays = Math.floor(diffHours / 24)
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {sessions.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <Monitor className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p>No active sessions found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {sessions.map((session) => (
                        <Card key={session.id} className={session.isCurrent ? 'border-primary' : ''}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1">
                                        {getDeviceIcon(session.userAgent)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">
                                                    {getDeviceInfo(session)}
                                                </p>
                                                {session.isCurrent && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {session.ipAddress && `${session.ipAddress} • `}
                                                Last active {formatDate(session.lastActivity)}
                                            </p>
                                        </div>
                                    </div>
                                    {!session.isCurrent && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRevokingSession(session)}
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Revoke
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Revoke Confirmation Dialog */}
            <AlertDialog open={!!revokingSession} onOpenChange={(open) => !open && setRevokingSession(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to revoke this session? The device will be logged out immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Revoke
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
