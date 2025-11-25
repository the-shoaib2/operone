import { Sidebar } from './sidebar'
import type { View } from '@/types'

interface LayoutProps {
    children: React.ReactNode
    activeView: View
    onNavigate: (view: View) => void
}

export function Layout({ children, activeView, onNavigate }: LayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar className="hidden md:flex" activeView={activeView} onNavigate={onNavigate} />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {children}
            </main>
        </div>
    )
}
