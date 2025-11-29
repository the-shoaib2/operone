import { z } from 'zod';
import type {
  ComplexityResult,
  Intent,
  ExecutionPlan,
  OptimizationResult,
  SafetyCheck,
  ToolRoute,
  FormattedOutput,
} from './types';

// ============================================================================
// Pipeline Event Types
// ============================================================================

export const PipelineEventStatus = z.enum(['start', 'progress', 'complete', 'error']);
export type PipelineEventStatus = z.infer<typeof PipelineEventStatus>;

export const PipelineStageName = z.enum([
  'intent_detection',
  'complexity_check',
  'memory_retrieval',
  'plan_generation',
  'reasoning_optimization',
  'safety_check',
  'tool_routing',
  'step_execution',
  'output_aggregation',
  'memory_update',
  'multi_pc_sync',
]);
export type PipelineStageName = z.infer<typeof PipelineStageName>;

// Base event structure
export interface PipelineEvent<T = any> {
  stage: PipelineStageName;
  status: PipelineEventStatus;
  data: T;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Stage-Specific Event Data
// ============================================================================

// Intent Detection Events
export interface IntentDetectionData {
  intent: Intent;
  processingTime: number;
  confidence: number;
  details: {
    action: string;
    target?: string;
    parameters?: Record<string, any>;
  };
}

// Complexity Check Events
export interface ComplexityCheckData {
  complexity: ComplexityResult;
  factors: string[];
  reasoning: string;
  shouldUsePipeline: boolean;
  bypassReason?: string;
}

// Memory Retrieval Events
export interface MemoryRetrievalData {
  shortTerm: Array<{ content: string; timestamp: number; relevance?: number }>;
  longTerm: Array<{ content: string; relevance: number; source?: string }>;
  contextSize: number;
  retrievalTime: number;
  totalEntries: number;
}

// Plan Generation Events
export interface PlanGenerationData {
  plan: ExecutionPlan;
  steps: Array<{
    id: string;
    action: string;
    tool: string;
    dependencies: string[];
    estimatedTime?: number;
  }>;
  dag: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; type?: string }>;
  };
  totalSteps: number;
  estimatedDuration?: number;
}

// Reasoning Optimization Events
export interface ReasoningOptimizationData {
  optimization: OptimizationResult;
  originalSteps: number;
  optimizedSteps: number;
  parallelizable: string[][];
  estimatedSpeedup: number;
  optimizations: string[];
  removedSteps?: string[];
  mergedSteps?: Array<{ from: string[]; to: string }>;
}

// Safety Check Events
export interface SafetyCheckData {
  safety: SafetyCheck;
  allowed: string[];
  blocked: string[];
  warnings: string[];
  overallSafe: boolean;
  riskLevel: string;
  requiresConfirmation: boolean;
  blockedReasons?: string[];
}

// Tool Routing Events
export interface ToolRoutingData {
  stepId: string;
  selectedTool: string;
  route: ToolRoute;
  alternatives: Array<{ tool: string; confidence: number }>;
  confidence: number;
  reasoning: string;
}

// Step Execution Events
export interface StepExecutionData {
  stepId: string;
  stepIndex: number;
  totalSteps: number;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  progress: number;
  description: string;
  tool: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  output?: any;
  error?: string;
}

// Output Aggregation Events
export interface OutputAggregationData {
  output: FormattedOutput;
  format: string;
  content: string;
  stepOutputs: Array<{ stepId: string; output: any }>;
  aggregationMethod: string;
  metadata: Record<string, any>;
}

// Memory Update Events
export interface MemoryUpdateData {
  saved: boolean;
  entries: number;
  storageType: 'shortTerm' | 'longTerm' | 'both';
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
}

// Multi-PC Sync Events
export interface MultiPCSyncData {
  connected: boolean;
  peers: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'syncing';
    lastSeen?: number;
  }>;
  lastSync: number;
  syncStatus: 'idle' | 'syncing' | 'complete' | 'error';
  syncedItems?: number;
  error?: string;
}

// ============================================================================
// Event Type Guards
// ============================================================================

export function isIntentDetectionEvent(
  event: PipelineEvent
): event is PipelineEvent<IntentDetectionData> {
  return event.stage === 'intent_detection';
}

export function isComplexityCheckEvent(
  event: PipelineEvent
): event is PipelineEvent<ComplexityCheckData> {
  return event.stage === 'complexity_check';
}

export function isMemoryRetrievalEvent(
  event: PipelineEvent
): event is PipelineEvent<MemoryRetrievalData> {
  return event.stage === 'memory_retrieval';
}

export function isPlanGenerationEvent(
  event: PipelineEvent
): event is PipelineEvent<PlanGenerationData> {
  return event.stage === 'plan_generation';
}

export function isReasoningOptimizationEvent(
  event: PipelineEvent
): event is PipelineEvent<ReasoningOptimizationData> {
  return event.stage === 'reasoning_optimization';
}

export function isSafetyCheckEvent(
  event: PipelineEvent
): event is PipelineEvent<SafetyCheckData> {
  return event.stage === 'safety_check';
}

export function isToolRoutingEvent(
  event: PipelineEvent
): event is PipelineEvent<ToolRoutingData> {
  return event.stage === 'tool_routing';
}

export function isStepExecutionEvent(
  event: PipelineEvent
): event is PipelineEvent<StepExecutionData> {
  return event.stage === 'step_execution';
}

export function isOutputAggregationEvent(
  event: PipelineEvent
): event is PipelineEvent<OutputAggregationData> {
  return event.stage === 'output_aggregation';
}

export function isMemoryUpdateEvent(
  event: PipelineEvent
): event is PipelineEvent<MemoryUpdateData> {
  return event.stage === 'memory_update';
}

export function isMultiPCSyncEvent(
  event: PipelineEvent
): event is PipelineEvent<MultiPCSyncData> {
  return event.stage === 'multi_pc_sync';
}

// ============================================================================
// Event Helpers
// ============================================================================

export function createPipelineEvent<T>(
  stage: PipelineStageName,
  status: PipelineEventStatus,
  data: T,
  metadata?: Record<string, any>
): PipelineEvent<T> {
  return {
    stage,
    status,
    data,
    timestamp: Date.now(),
    metadata,
  };
}

export function formatStageName(stage: PipelineStageName): string {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
