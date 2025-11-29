import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { IntentDetectionData } from '@operone/thinking';

interface IntentDisplayProps {
    data?: IntentDetectionData;
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function IntentDisplay({ data, status }: IntentDisplayProps) {
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

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-orange-600';
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Intent Detection
                    </h4>
                    {data && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {data.processingTime}ms
                        </span>
                    )}
                </div>

                {data && status === 'complete' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                {data.details.action}
                            </span>
                            <span className={`text-xs font-medium ${getConfidenceColor(data.confidence)}`}>
                                {(data.confidence * 100).toFixed(0)}% confidence
                            </span>
                        </div>

                        {data.details.target && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                Target: <span className="font-mono">{data.details.target}</span>
                            </div>
                        )}

                        {data.details.parameters && Object.keys(data.details.parameters).length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                                    Parameters ({Object.keys(data.details.parameters).length})
                                </summary>
                                <div className="mt-1 pl-4 space-y-1">
                                    {Object.entries(data.details.parameters).map(([key, value]) => (
                                        <div key={key} className="text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">{key}:</span>{' '}
                                            <span className="font-mono">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {status === 'running' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Analyzing user intent...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to detect intent
                    </p>
                )}
            </div>
        </div>
    );
}
