import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/auth-context'
import { AIProvider } from './contexts/ai-context'
import { ModelDetectorProvider } from './contexts'
import { LoginScreen } from './components/auth/login-screen'
import { AppLayout } from './components/layout/app-layout'
import faviconUrl from './assets/favicon.ico'
import './App.css'
import { Loader } from './components/ai/loader'

// Lazy load feature components
const ChatInterface = lazy(() => import('./features/chat/chat').then(module => ({ default: module.default })))
const SettingsPanel = lazy(() => import('./features/settings/settings-panel').then(module => ({ default: module.SettingsPanel })))
const MemoryInspector = lazy(() => import('./features/memory/memory-inspector').then(module => ({ default: module.MemoryInspector })))
const AddModelPage = lazy(() => import('./features/settings/add-model-page').then(module => ({ default: module.AddModelPage })))

function LoadingSpinner() {
    return (
        <div className="h-full w-full flex items-center justify-center">
           <Loader />
        </div>
    )
}

function AppContent() {
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
        <AppLayout>
            <ModelDetectorProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                    <Route path="/dashboard/chat" element={<ChatInterface />} />
                    <Route path="/dashboard/memory" element={<MemoryInspector />} />
                    <Route path="/settings/account" element={<SettingsPanel />} />
                    <Route path="/settings/billing" element={<SettingsPanel />} />
                    <Route path="/settings/notifications" element={<SettingsPanel />} />
                    <Route path="/settings/models/add" element={<AddModelPage />} />
                    <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                    <Route path="/" element={<Navigate to="/dashboard/chat" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/dashboard/chat" replace />} />
                </Routes>
            </Suspense>
        </ModelDetectorProvider>
    </AppLayout>
    )
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AIProvider>
                    <AppContent />
                </AIProvider>
            </AuthProvider>
        </Router>
    )
}

