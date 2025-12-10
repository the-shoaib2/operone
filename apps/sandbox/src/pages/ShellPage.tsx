import { PageLayout } from '../components/PageLayout';
import { RealShell } from '../components/RealShell';

export function ShellPage() {
    return (
        <PageLayout
            title="Shell"
            description="Real shell command execution with history and undo/redo"
        >
            <div className="h-[calc(100vh-10rem)] border border-dark-border bg-dark-bg overflow-hidden">
                <RealShell />
            </div>
        </PageLayout>
    );
}
