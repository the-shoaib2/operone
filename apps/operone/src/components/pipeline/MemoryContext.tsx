import { CheckCircle2, Circle, Loader2, XCircle, Database } from 'lucide-react';
import type { MemoryRetrievalData } from '@operone/thinking';

interface MemoryContextProps {
    data?: MemoryRetrievalData;
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function MemoryContext({ data, status }: MemoryContextProps) {
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

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Memory Retrieval
                    </h4>
                    {data && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {data.totalEntries} entries ({data.retrievalTime}ms)
                        </span>
                    )}
                </div>

                {data && status === 'complete' && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-600 dark:text-slate-400 mb-1">Short-term</div>
                                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    {data.shortTerm.length}
                                </div>
                            </div>
                            <div className="p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-600 dark:text-slate-400 mb-1">Long-term</div>
                                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    {data.longTerm.length}
                                </div>
                            </div>
                        </div>

                        {data.longTerm.length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                                    View context ({data.contextSize} items)
                                </summary>
                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                    {data.longTerm.slice(0, 5).map((item, i) => (
                                        <div
                                            key={i}
                                            className="p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="text-slate-900 dark:text-slate-100 line-clamp-2">
                                                {item.content}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Relevance: {(item.relevance * 100).toFixed(0)}%
                                                </span>
                                                {item.source && (
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        • {item.source}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {data.longTerm.length > 5 && (
                                        <div className="text-slate-500 dark:text-slate-400 text-center">
                                            +{data.longTerm.length - 5} more items
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {status === 'running' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Retrieving relevant context...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to retrieve memory
                    </p>
                )}
            </div>
        </div>
    );
}
