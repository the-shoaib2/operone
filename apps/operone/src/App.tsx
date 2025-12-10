import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/auth-context'
import { AIProvider } from './contexts/ai-context'
import { ChatProvider } from './contexts/chat-context'
import { ModelDetectorProvider } from './contexts'
import { LoginScreen } from './components/auth/login-screen'
import { LoginAnimation } from './components/auth/login-animation'
import { MainLayout } from './components/layout/main-layout'
import faviconUrl from './assets/favicon.ico'
import './App.css'
import { Loader } from './components/ai/loader'

// Lazy load feature components
const ChatInterface = lazy(() => import('./features/chat/chat').then(module => ({ default: module.default })))
const UnifiedSettings = lazy(() => import('./features/settings/index').then(module => ({ default: module.UnifiedSettings })))


function LoadingSpinner() {
    return (
        <div className="h-full w-full flex items-center justify-center">
            <Loader />
        </div>
    )
}

function AppContent() {
    const { isAuthenticated, isLoading, user, isNewLogin, clearNewLoginFlag } = useAuth()

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

    // Show login animation on fresh login
    if (isNewLogin && user) {
        return (
            <LoginAnimation
                userName={user.name}
                onComplete={() => {
                    clearNewLoginFlag()
                }}
            />
        )
    }

    // Show main app if authenticated
    return (
        <MainLayout>
            <ModelDetectorProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/dashboard/chat" element={<ChatInterface />} />
                        <Route path="/settings" element={<UnifiedSettings />} />

                        <Route path="/" element={<Navigate to="/dashboard/chat" replace />} />
                        <Route path="/dashboard" element={<Navigate to="/dashboard/chat" replace />} />
                    </Routes>
                </Suspense>
            </ModelDetectorProvider>
        </MainLayout>
    )
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AIProvider>
                    <ChatProvider>
                        <AppContent />
                    </ChatProvider>
                </AIProvider>
            </AuthProvider>
        </Router>
    )
}

