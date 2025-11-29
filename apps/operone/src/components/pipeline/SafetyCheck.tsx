import { CheckCircle2, Circle, Loader2, XCircle, Shield, AlertTriangle } from 'lucide-react';
import type { SafetyCheckData } from '@operone/thinking';

interface SafetyCheckProps {
    data?: SafetyCheckData;
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
}

export function SafetyCheck({ data, status }: SafetyCheckProps) {
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

    const getRiskBadge = (riskLevel: string) => {
        const colors: Record<string, string> = {
            safe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
            high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
            critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        };
        return colors[riskLevel] || colors.safe;
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Safety Check
                    </h4>
                </div>

                {data && status === 'complete' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadge(data.riskLevel)}`}>
                                {data.riskLevel.toUpperCase()}
                            </span>

                            {data.overallSafe ? (
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                    ✓ Safe to proceed
                                </span>
                            ) : (
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    ✗ Blocked
                                </span>
                            )}
                        </div>

                        {data.allowed.length > 0 && (
                            <div className="text-xs">
                                <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    Allowed steps: {data.allowed.length}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {data.allowed.slice(0, 5).map((stepId) => (
                                        <span
                                            key={stepId}
                                            className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-mono"
                                        >
                                            {stepId}
                                        </span>
                                    ))}
                                    {data.allowed.length > 5 && (
                                        <span className="text-slate-500 dark:text-slate-400">
                                            +{data.allowed.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {data.blocked.length > 0 && (
                            <div className="text-xs">
                                <div className="text-red-600 dark:text-red-400 font-medium mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Blocked steps: {data.blocked.length}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {data.blocked.map((stepId) => (
                                        <span
                                            key={stepId}
                                            className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-mono"
                                        >
                                            {stepId}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {data.warnings.length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Warnings ({data.warnings.length})
                                </summary>
                                <ul className="mt-1 pl-4 space-y-1 list-disc list-inside">
                                    {data.warnings.map((warning, i) => (
                                        <li key={i} className="text-yellow-600 dark:text-yellow-400">
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        {data.requiresConfirmation && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                User confirmation required
                            </div>
                        )}
                    </div>
                )}

                {status === 'running' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Validating safety...
                    </p>
                )}

                {status === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Safety check failed
                    </p>
                )}
            </div>
        </div>
    );
}
