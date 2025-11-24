import { useState } from 'react'
import { ChatInterface } from './components/chat-interface'
import { Layout } from './components/layout'
import { SettingsPanel } from './components/settings-panel'
import { MemoryInspector } from './components/memory-inspector'
import { AuthProvider, useAuth } from './components/auth-context'
import { LoginScreen } from './components/login-screen'
import './App.css'

export type View = 'chat' | 'memory' | 'settings'

function AppContent() {
    const [activeView, setActiveView] = useState<View>('chat')
    const { isAuthenticated, isLoading } = useAuth()

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto">
                        <svg
                            className="w-12 h-12 text-white animate-pulse"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        )
    }

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return <LoginScreen />
    }

    // Show main app if authenticated
    return (
        <Layout activeView={activeView} onNavigate={setActiveView}>
            {activeView === 'chat' && <ChatInterface />}
            {activeView === 'memory' && <MemoryInspector />}
            {activeView === 'settings' && <SettingsPanel />}
        </Layout>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

