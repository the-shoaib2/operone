import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: string
    email: string
    name: string
    image?: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: () => Promise<void>
    logout: () => Promise<void>
    error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Check authentication status on mount
    useEffect(() => {
        checkAuth()

        // Listen for auth success events from deep links
        const handleAuthSuccess = (_event: any, data: { token: string }) => {
            console.log('Auth success received:', data)
            validateAndSetUser(data.token)
        }

        // Note: This will be implemented in preload.ts
        if (window.electronAPI?.onAuthSuccess) {
            window.electronAPI.onAuthSuccess(handleAuthSuccess)
        }
    }, [])

    const checkAuth = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const userData = await window.electronAPI.getUser()
            if (userData) {
                setUser(userData)
            }
        } catch (err) {
            console.error('Failed to check auth:', err)
            setError(err instanceof Error ? err.message : 'Failed to check authentication')
        } finally {
            setIsLoading(false)
        }
    }

    const validateAndSetUser = async (token: string) => {
        setIsLoading(true)
        setError(null)

        try {
            // Validate token with backend and get user data
            const response = await fetch('http://localhost:3000/api/auth/validate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })

            if (!response.ok) {
                throw new Error('Token validation failed')
            }

            const { user: userData } = await response.json()

            // Store user data via IPC
            await window.electronAPI.setUser(userData, token)
            setUser(userData)
        } catch (err) {
            console.error('Failed to validate token:', err)
            setError(err instanceof Error ? err.message : 'Authentication failed')
        } finally {
            setIsLoading(false)
        }
    }

    const login = async () => {
        setIsLoading(true)
        setError(null)

        try {
            await window.electronAPI.login()
            // The actual authentication will happen via deep link callback
        } catch (err) {
            console.error('Failed to initiate login:', err)
            setError(err instanceof Error ? err.message : 'Failed to start login')
            setIsLoading(false)
        }
    }

    const logout = async () => {
        setIsLoading(true)
        setError(null)

        try {
            await window.electronAPI.logout()
            setUser(null)
        } catch (err) {
            console.error('Failed to logout:', err)
            setError(err instanceof Error ? err.message : 'Failed to logout')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
