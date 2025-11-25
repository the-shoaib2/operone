import { useState } from 'react'
import { ChatInterface } from './features/chat/chat-interface'
import { Layout } from './components/layout/layout'
import { SettingsPanel } from './features/settings/settings-panel'
import { MemoryInspector } from './features/memory/memory-inspector'
import { AuthProvider, useAuth } from './contexts/auth-context'
import { LoginScreen } from './components/auth/login-screen'
import faviconUrl from './assets/favicon.ico'
import type { View } from './types'
import './App.css'

function AppContent() {
    const [activeView, setActiveView] = useState<View>('chat')
    const { isAuthenticated, isLoading } = useAuth()

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <img
                        src={faviconUrl}
                        alt="Operone"
                        className="w-20 h-20 mx-auto animate-pulse"
                    />
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

