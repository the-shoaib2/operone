'use client'

import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useState } from 'react'
import { ExternalLink, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

function generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function AuthSuccessPage(props: {
    searchParams: Promise<{ token?: string; from?: string }>
}) {
    const [token, setToken] = useState<string>('')
    const [deepLink, setDeepLink] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const searchParams = await props.searchParams
                const { token: searchToken, from } = searchParams
                
                // Check if user is authenticated
                const response = await fetch('/api/auth/session')
                const session = await response.json()
                
                if (!session?.user) {
                    redirect('/login')
                    return
                }

                // If coming from desktop login or has token
                if (searchToken || from === 'desktop') {
                    // Generate a secure token for the desktop app
                    const newToken = generateToken()
                    const tokenResponse = await fetch('/api/auth/store-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: newToken, userId: session.user.id })
                    })
                    
                    if (!tokenResponse.ok) {
                        throw new Error('Failed to store token')
                    }
                    
                    const tokenData = await tokenResponse.json()
                    setToken(tokenData.token)
                    setDeepLink(`operone://auth?token=${tokenData.token}`)
                } else {
                    // Otherwise, just redirect to dashboard
                    redirect('/dashboard')
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Authentication failed')
            } finally {
                setIsLoading(false)
            }
        }

        initializeAuth()
    }, [props.searchParams])

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-4">
                <Card className="w-full border-none shadow-none bg-transparent max-w-sm">
                    <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent"></div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">Preparing Authentication</h3>
                            <p className="text-muted-foreground text-sm">Setting up your secure token...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center space-y-3">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <CardTitle className="text-red-700">Authentication Error</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <Button 
                            onClick={() => window.location.reload()} 
                            variant="outline" 
                            className="w-full"
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!token || !deepLink) {
        return null
    }

    return (
            <Card className="w-full max-w-md border-none shadow-none bg-transparent">
                <CardHeader className="text-center space-y-6 pb-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-transparent border-2 border-green-500">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="space-y-3">
                        <CardTitle className="text-2xl font-bold text-green-700">Authentication Successful!</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            You can now return to the Operone Desktop App
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="w-full hover:bg-green-900  bg-green-700 text-white h-8"
                        >
                            <a href={deepLink} className="flex items-center justify-center">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open Operone Desktop
                            </a>
                        </Button>
                        
                        <div className="w-full text-center">
                            <AlertCircle className="h-4 w-4 mr-2 inline text-xs" />
                            <span className="text-primary text-xs">
                                Having trouble with login?{' '}
                                <a 
                                    href="/auth-success/troubleshoot" 
                                    className="underline text-green-700 transition-colors"
                                >
                                    Click here
                                </a>
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
    )

}
