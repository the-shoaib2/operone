import { useState, useEffect } from 'react'
import './App.css'

interface ElectronAPI {
    onAuthSuccess: (callback: (data: { token: string }) => void) => void
    openExternal: (url: string) => void
}

declare global {
    interface Window {
        electron: ElectronAPI
    }
}

function App() {
    const [token, setToken] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        // Check for stored token
        const storedToken = localStorage.getItem('authToken')
        if (storedToken) {
            setToken(storedToken)
            setIsAuthenticated(true)
        }

        // Listen for auth success from deep link
        if (window.electron) {
            window.electron.onAuthSuccess((data) => {
                setToken(data.token)
                setIsAuthenticated(true)
                localStorage.setItem('authToken', data.token)
            })
        }
    }, [])

    const handleLogin = () => {
        const loginUrl = 'http://localhost:3000/login?from=desktop'
        window.open(loginUrl, '_blank')
    }

    const handleLogout = () => {
        setToken(null)
        setIsAuthenticated(false)
        localStorage.removeItem('authToken')
    }

    return (
        <div className="app">
            <div className="container">
                <h1 className="title">Operon Desktop</h1>

                {!isAuthenticated ? (
                    <div className="auth-section">
                        <p className="description">
                            Welcome to Operon Desktop. Please sign in to continue.
                        </p>
                        <button onClick={handleLogin} className="btn btn-primary">
                            Sign In
                        </button>
                        <p className="hint">
                            This will open your browser to complete authentication
                        </p>
                    </div>
                ) : (
                    <div className="auth-section">
                        <div className="success-icon">✓</div>
                        <h2 className="success-title">You're signed in!</h2>
                        <p className="description">
                            Your authentication token is stored securely.
                        </p>
                        <div className="token-display">
                            <code>{token?.substring(0, 20)}...</code>
                        </div>
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
