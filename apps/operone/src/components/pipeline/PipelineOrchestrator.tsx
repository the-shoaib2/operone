import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
    PipelineEvent,
    IntentDetectionData,
    ComplexityCheckData,
    MemoryRetrievalData,
    PlanGenerationData,
    ReasoningOptimizationData,
    SafetyCheckData,
    StepExecutionData,
} from '@operone/thinking';

import { IntentDisplay } from './IntentDisplay';
import { ComplexityIndicator } from './ComplexityIndicator';
import { MemoryContext } from './MemoryContext';
import { PlanDAG } from './PlanDAG';
import { SafetyCheck } from './SafetyCheck';
import { StepExecution } from './StepExecution';

interface PipelineStageState {
    status: 'pending' | 'running' | 'complete' | 'error' | 'progress';
    data?: any;
}

interface PipelineOrchestratorProps {
    isActive: boolean;
    onClose?: () => void;
}

export function PipelineOrchestrator({ isActive, onClose }: PipelineOrchestratorProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [stages, setStages] = useState<Record<string, PipelineStageState>>({
        complexity_check: { status: 'pending' },
        intent_detection: { status: 'pending' },
        memory_retrieval: { status: 'pending' },
        plan_generation: { status: 'pending' },
        reasoning_optimization: { status: 'pending' },
        safety_check: { status: 'pending' },
        step_execution: { status: 'pending' },
    });
    const [executionSteps, setExecutionSteps] = useState<StepExecutionData[]>([]);

    // Listen for pipeline events
    useEffect(() => {
        if (!isActive) return;

        const handlePipelineEvent = (event: CustomEvent) => {
            const pipelineEvent = event.detail as PipelineEvent;
            const { stage, status, data } = pipelineEvent;

            // Update stage state
            setStages(prev => ({
                ...prev,
                [stage]: {
                    status: status === 'start' ? 'running' : status === 'complete' ? 'complete' : status,
                    data: status === 'complete' ? data : prev[stage]?.data,
                },
            }));

            // Handle step execution separately
            if (stage === 'step_execution' && status === 'progress') {
                const stepData = data as StepExecutionData;
                setExecutionSteps(prev => {
                    const existing = prev.findIndex(s => s.stepId === stepData.stepId);
                    if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = stepData;
                        return updated;
                    }
                    return [...prev, stepData];
                });
            }
        };

        window.addEventListener('pipeline:event' as any, handlePipelineEvent);
        return () => window.removeEventListener('pipeline:event' as any, handlePipelineEvent);
    }, [isActive]);

    if (!isActive) return null;

    return (
        <div className="fixed right-4 top-20 w-96 max-h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pipeline Progress
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-3 space-y-3">
                    <ComplexityIndicator
                        data={stages.complexity_check?.data as ComplexityCheckData}
                        status={stages.complexity_check?.status || 'pending'}
                    />

                    <IntentDisplay
                        data={stages.intent_detection?.data as IntentDetectionData}
                        status={stages.intent_detection?.status || 'pending'}
                    />

                    {stages.memory_retrieval?.status !== 'pending' && (
                        <MemoryContext
                            data={stages.memory_retrieval?.data as MemoryRetrievalData}
                            status={stages.memory_retrieval?.status || 'pending'}
                        />
                    )}

                    <PlanDAG
                        data={stages.plan_generation?.data as PlanGenerationData}
                        status={stages.plan_generation?.status || 'pending'}
                    />

                    {stages.reasoning_optimization?.status !== 'pending' && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                            <div className="font-medium mb-1">Reasoning Optimization</div>
                            {stages.reasoning_optimization?.data && (
                                <div>
                                    {stages.reasoning_optimization.data.originalSteps} →{' '}
                                    {stages.reasoning_optimization.data.optimizedSteps} steps
                                    {stages.reasoning_optimization.data.estimatedSpeedup > 0 && (
                                        <span className="text-green-600 dark:text-green-400 ml-2">
                                            ({stages.reasoning_optimization.data.estimatedSpeedup}% faster)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <SafetyCheck
                        data={stages.safety_check?.data as SafetyCheckData}
                        status={stages.safety_check?.status || 'pending'}
                    />

                    {executionSteps.length > 0 && (
                        <StepExecution
                            steps={executionSteps}
                            status={stages.step_execution?.status || 'pending'}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
