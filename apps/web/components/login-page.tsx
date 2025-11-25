'use client'

import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { signIn, useSession } from 'next-auth/react'
import { PasskeyIcon } from '@/components/icons/passkey'
import { useToast } from '@repo/ui'

export default function LoginPage() {
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isGithubLoading, setIsGithubLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session, status } = useSession()
    const { toast } = useToast()

    const isFromDesktop = searchParams.get('from') === 'desktop'
    const callbackUrl = searchParams.get('callbackUrl') || (isFromDesktop ? '/auth-success?from=desktop' : '/dashboard')

    // Auto-redirect if already logged in and coming from desktop
    useEffect(() => {
        if (status === 'authenticated' && session?.user && isFromDesktop) {
            router.push('/auth-success?from=desktop')
        }
    }, [status, session, isFromDesktop, router])

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true)
        await signIn('google', { redirectTo: callbackUrl })
    }

    const handleGithubLogin = async () => {
        setIsGithubLoading(true)
        await signIn('github', { redirectTo: callbackUrl })
    }

    const handlePasskeyLogin = async () => {
        setIsPasskeyLoading(true)

        try {
            // Get authentication options from server
            const optionsResponse = await fetch('/api/webauthn/authenticate/options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: undefined }),
            })

            if (!optionsResponse.ok) {
                const errorData = await optionsResponse.json()
                toast({
                    title: "Error",
                    description: errorData.error || 'Failed to get authentication options',
                    variant: "destructive",
                })
                return
            }

            const { options } = await optionsResponse.json()

            // Start authentication with the browser
            const authenticationResponse = await startAuthentication(options)

            // Verify authentication with NextAuth
            const result = await signIn('webauthn', {
                response: JSON.stringify(authenticationResponse),
                challenge: options.challenge,
                redirect: false,
                callbackUrl: callbackUrl,
            })

            if (result?.error) {
                toast({
                    title: "Login Failed",
                    description: result.error,
                    variant: "destructive",
                })
                return
            }

            if (result?.ok) {
                // Redirect to callback URL
                router.push(callbackUrl)
                router.refresh()
            } else {
                toast({
                    title: "Error",
                    description: "Authentication failed",
                    variant: "destructive",
                })
            }
        } catch (err) {
            console.error('Passkey login error:', err)
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : 'Failed to login with passkey',
                variant: "destructive",
            })
        } finally {
            setIsPasskeyLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center ">
            <Card className="w-full max-w-sm border-none bg-transparent shadow-none mx-4">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        Welcome to Operone
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isFromDesktop
                            ? 'Sign in to continue to the desktop app'
                            : 'Choose your preferred sign-in method'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                        variant="outline"
                        className="w-full"
                        size="lg"
                    >
                        {isGoogleLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <Image
                                    src="https://www.google.com/favicon.ico"
                                    alt="Google"
                                    width={20}
                                    height={20}
                                    className="mr-2"
                                />
                                Continue with Google
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={handleGithubLogin}
                        disabled={isGithubLoading}
                        variant="outline"
                        className="w-full"
                        size="lg"
                    >
                        {isGithubLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <Image
                                    src="https://github.com/favicon.ico"
                                    alt="GitHub"
                                    width={20}
                                    height={20}
                                    className="mr-2"
                                />
                                Continue with GitHub
                            </>
                        )}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or use passkey
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={handlePasskeyLogin}
                        disabled={isPasskeyLoading}
                        className="w-full"
                        size="lg"
                        variant="secondary"
                    >
                        {isPasskeyLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Authenticating...
                            </>
                        ) : (
                            <>
                                <PasskeyIcon className="mr-2 h-6 w-6" />
                                Sign in with Passkey
                            </>
                        )}
                    </Button>



                    <p className="text-xs text-muted-foreground text-center">
                        Use your device&apos;s biometric authentication or security key
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
