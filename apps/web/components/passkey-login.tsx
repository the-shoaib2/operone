'use client'

import { useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export function PasskeyLogin() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Get authentication options from server
            const optionsResponse = await fetch('/api/webauthn/authenticate/options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email || undefined }),
            })

            if (!optionsResponse.ok) {
                const errorData = await optionsResponse.json()
                throw new Error(errorData.error || 'Failed to get authentication options')
            }

            const { options } = await optionsResponse.json()

            // Start authentication with the browser
            const authenticationResponse = await startAuthentication(options)

            // Verify authentication with server
            const verificationResponse = await fetch('/api/webauthn/authenticate/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    response: authenticationResponse,
                    challenge: options.challenge,
                    email: email || undefined,
                }),
            })

            if (!verificationResponse.ok) {
                throw new Error('Failed to verify authentication')
            }

            const { verified, user } = await verificationResponse.json()

            if (verified && user) {
                // Redirect to dashboard
                router.push('/dashboard')
                router.refresh()
            } else {
                throw new Error('Authentication verification failed')
            }
        } catch (err) {
            console.error('Passkey login error:', err)
            setError(err instanceof Error ? err.message : 'Failed to login with passkey')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                    Email (optional for discoverable credentials)
                </Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
            </div>
            <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/20"
                variant="outline"
            >
                {isLoading ? 'Authenticating...' : 'Sign in with Passkey'}
            </Button>
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
            <p className="text-xs text-gray-400 text-center">
                Use your device's biometric authentication or security key
            </p>
        </div>
    )
}
