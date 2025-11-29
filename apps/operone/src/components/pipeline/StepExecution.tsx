import { CheckCircle2, Circle, Loader2, XCircle, Play } from 'lucide-react';
import type { StepExecutionData } from '@operone/thinking';

interface StepExecutionProps {
    steps: StepExecutionData[];
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function StepExecution({ steps, status }: StepExecutionProps) {
    const getStepStatusIcon = (stepStatus: string) => {
        switch (stepStatus) {
            case 'complete':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'running':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pending':
                return <Circle className="w-4 h-4 text-gray-400" />;
            default:
                return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getOverallStatusIcon = () => {
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

    const completedSteps = steps.filter(s => s.status === 'complete').length;
    const totalSteps = steps.length > 0 ? steps[0].totalSteps : 0;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getOverallStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <Play className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Step Execution
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {completedSteps}/{totalSteps} steps
                    </span>
                </div>

                {totalSteps > 0 && (
                    <div className="mb-3">
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {progress.toFixed(0)}% complete
                        </div>
                    </div>
                )}

                {steps.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {steps.map((step) => (
                            <div
                                key={step.stepId}
                                className="flex items-start gap-2 p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                            >
                                <div className="mt-0.5">{getStepStatusIcon(step.status)}</div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-900 dark:text-slate-100">
                                            {step.description}
                                        </span>
                                        {step.duration && (
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {step.duration}ms
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            {step.tool}
                                        </span>

                                        {step.status === 'running' && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                Running...
                                            </span>
                                        )}

                                        {step.status === 'complete' && step.output && (
                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                ✓ {step.output.message || 'Complete'}
                                            </span>
                                        )}

                                        {step.status === 'failed' && step.error && (
                                            <span className="text-xs text-red-600 dark:text-red-400">
                                                ✗ {step.error}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {status === 'pending' && steps.length === 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Waiting to execute steps...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Execution failed
                    </p>
                )}
            </div>
        </div>
    );
}
