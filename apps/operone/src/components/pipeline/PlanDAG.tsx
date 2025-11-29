import { CheckCircle2, Circle, Loader2, XCircle, Network, ArrowRight } from 'lucide-react';
import type { PlanGenerationData } from '@operone/thinking';

interface PlanDAGProps {
    data?: PlanGenerationData;
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function PlanDAG({ data, status }: PlanDAGProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'complete':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'progress':
            case 'running':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getToolColor = (tool: string) => {
        const colors: Record<string, string> = {
            fs: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            shell: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            networking: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
            ai: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
            memory: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        };
        return colors[tool] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <Network className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Execution Plan
                    </h4>
                    {data && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {data.totalSteps} steps
                        </span>
                    )}
                </div>

                {data && status === 'complete' && (
                    <div className="space-y-3 mt-2">
                        <div className="space-y-2">
                            {data.steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className="flex items-start gap-2 p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-slate-900 dark:text-slate-100">
                                            {step.action}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${getToolColor(step.tool)}`}>
                                                {step.tool}
                                            </span>

                                            {step.estimatedTime && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    ~{step.estimatedTime}ms
                                                </span>
                                            )}

                                            {step.dependencies.length > 0 && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    depends on: {step.dependencies.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {data.dag && data.dag.edges.length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                                    Dependency Graph ({data.dag.edges.length} dependencies)
                                </summary>
                                <div className="mt-2 space-y-1 pl-4">
                                    {data.dag.edges.map((edge, i) => (
                                        <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                            <span className="font-mono text-xs">{edge.from}</span>
                                            <ArrowRight className="w-3 h-3" />
                                            <span className="font-mono text-xs">{edge.to}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}

                        {data.estimatedDuration && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                Estimated duration: {data.estimatedDuration}ms
                            </div>
                        )}
                    </div>
                )}

                {status === 'running' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Generating execution plan...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to generate plan
                    </p>
                )}
            </div>
        </div>
    );
}
