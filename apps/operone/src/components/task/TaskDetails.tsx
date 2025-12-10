import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AITask } from '@repo/types';
import { CheckCircle, XCircle, Clock, Terminal, Activity } from 'lucide-react';

interface TaskDetailsProps {
    task: AITask | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetails({ task, open, onOpenChange }: TaskDetailsProps) {
    if (!task) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Task Execution</span>
                        <Badge variant="outline">{task.id}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {task.prompt}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground mr-2">Status:</span>
                                <span className="capitalize font-medium">{task.status}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground mr-2">Created:</span>
                                <span>{new Date(task.createdAt).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold mb-2">Execution Steps</h3>
                            {task.steps.map((step, index) => (
                                <div key={step.id} className="border rounded-md p-3 space-y-2 bg-card/50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                                            <span className="text-sm font-medium">{step.description}</span>
                                        </div>
                                        {getStatusIcon(step.status)}
                                    </div>

                                    <div className="ml-6 space-y-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Terminal className="w-3 h-3" />
                                            <span className="font-mono text-muted-foreground">{step.tool}</span>
                                        </div>

                                        <div className="bg-muted/50 rounded p-2 overflow-x-auto">
                                            <pre className="text-xs font-mono">{JSON.stringify(step.args, null, 2)}</pre>
                                        </div>

                                        {step.result && (
                                            <div className="text-xs space-y-1">
                                                <div className="font-semibold text-green-500/80">Result:</div>
                                                <div className="bg-black/10 dark:bg-white/5 rounded p-2">
                                                    <pre className="font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                        {typeof step.result === 'string' ? (step.result as string) : JSON.stringify(step.result, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {step.error && (
                                            <div className="text-xs space-y-1">
                                                <div className="font-semibold text-red-500/80">Error:</div>
                                                <div className="bg-red-500/10 rounded p-2 text-red-600 dark:text-red-400">
                                                    <pre className="font-mono whitespace-pre-wrap">{step.error}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
