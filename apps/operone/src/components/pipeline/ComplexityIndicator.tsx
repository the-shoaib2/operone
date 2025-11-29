import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Zap, Brain } from 'lucide-react';
import type { ComplexityCheckData } from '@operone/thinking';

interface ComplexityIndicatorProps {
    data?: ComplexityCheckData;
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function ComplexityIndicator({ data, status }: ComplexityIndicatorProps) {
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

    const getComplexityBadge = (level: string) => {
        switch (level) {
            case 'simple':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <Zap className="w-3 h-3" />
                        <span className="text-xs font-medium">Simple</span>
                    </div>
                );
            case 'moderate':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                        <Brain className="w-3 h-3" />
                        <span className="text-xs font-medium">Moderate</span>
                    </div>
                );
            case 'complex':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        <Brain className="w-3 h-3" />
                        <span className="text-xs font-medium">Complex</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Complexity Check
                    </h4>
                </div>

                {data && status === 'complete' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {getComplexityBadge(data.complexity.level)}

                            {data.shouldUsePipeline ? (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    → Full pipeline
                                </span>
                            ) : (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    → Direct response
                                </span>
                            )}
                        </div>

                        <div className="text-sm text-slate-700 dark:text-slate-300">
                            {data.reasoning}
                        </div>

                        {data.bypassReason && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                                {data.bypassReason}
                            </div>
                        )}

                        {data.factors && data.factors.length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                                    Complexity Factors ({data.factors.length})
                                </summary>
                                <ul className="mt-1 pl-4 space-y-1 list-disc list-inside">
                                    {data.factors.map((factor, i) => (
                                        <li key={i} className="text-slate-600 dark:text-slate-400">
                                            {factor}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {status === 'running' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Analyzing query complexity...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to analyze complexity
                    </p>
                )}
            </div>
        </div>
    );
}
