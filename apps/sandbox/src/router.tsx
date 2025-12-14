import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const NetworkingPage = lazy(() => import('./pages/NetworkingPage').then(m => ({ default: m.NetworkingPage })));
const FileSystemPage = lazy(() => import('./pages/FileSystemPage').then(m => ({ default: m.FileSystemPage })));
const ShellPage = lazy(() => import('./pages/ShellPage').then(m => ({ default: m.ShellPage })));
const MCPPage = lazy(() => import('./pages/MCPPage').then(m => ({ default: m.MCPPage })));
const MemoryPage = lazy(() => import('./pages/MemoryPage').then(m => ({ default: m.MemoryPage })));
const ProcessPage = lazy(() => import('./pages/ProcessPage').then(m => ({ default: m.ProcessPage })));
const DatabasePage = lazy(() => import('./pages/DatabasePage').then(m => ({ default: m.DatabasePage })));
const AutomationPage = lazy(() => import('./pages/AutomationPage').then(m => ({ default: m.AutomationPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then(m => ({ default: m.DocsPage })));

// Loading Component
const PageLoader = () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            <span className="text-dark-muted text-sm">Loading..</span>
        </div>
    </div>
);

// Wrapper for suspended routes
const SuspensedElement = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const router = createBrowserRouter([
    {
        path: '/',
        element: <SuspensedElement><Dashboard /></SuspensedElement>,
    },
    {
        path: '/docs',
        element: <SuspensedElement><DocsPage /></SuspensedElement>,
    },
    {
        path: '/networking',
        element: <SuspensedElement><NetworkingPage /></SuspensedElement>,
    },
    {
        path: '/filesystem',
        element: <SuspensedElement><FileSystemPage /></SuspensedElement>,
    },
    {
        path: '/shell',
        element: <SuspensedElement><ShellPage /></SuspensedElement>,
    },
    {
        path: '/mcp',
        element: <SuspensedElement><MCPPage /></SuspensedElement>,
    },
    {
        path: '/memory',
        element: <SuspensedElement><MemoryPage /></SuspensedElement>,
    },
    {
        path: '/process',
        element: <SuspensedElement><ProcessPage /></SuspensedElement>,
    },
    {
        path: '/database',
        element: <SuspensedElement><DatabasePage /></SuspensedElement>,
    },
    {
        path: '/automation',
        element: <SuspensedElement><AutomationPage /></SuspensedElement>,
    },
]);
