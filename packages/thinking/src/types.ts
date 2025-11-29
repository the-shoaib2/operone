import { z } from 'zod';

// ============================================================================
// Complexity Detection
// ============================================================================

export const ComplexityLevel = z.enum(['simple', 'moderate', 'complex']);
export type ComplexityLevel = z.infer<typeof ComplexityLevel>;

export const ComplexityResult = z.object({
  level: ComplexityLevel,
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  shouldUsePipeline: z.boolean(),
  estimatedSteps: z.number().optional(),
});
export type ComplexityResult = z.infer<typeof ComplexityResult>;

// ============================================================================
// Intent Detection
// ============================================================================

export const IntentCategory = z.enum([
  'file_read',
  'file_write',
  'file_search',
  'shell_command',
  'network_request',
  'github_query',
  'automation',
  'query_knowledge',
  'multi_pc',
  'memory_recall',
  'code_analysis',
  'planning',
  'unknown',
]);
export type IntentCategory = z.infer<typeof IntentCategory>;

export const Intent = z.object({
  category: IntentCategory,
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), z.any()).optional(),
  multiIntent: z.boolean().default(false),
  subIntents: z.array(z.object({
    category: IntentCategory,
    confidence: z.number().min(0).max(1),
    multiIntent: z.boolean().default(false),
  })).optional(),
});
export type Intent = z.infer<typeof Intent>;

// ============================================================================
// Planning
// ============================================================================

export const ToolType = z.enum([
  'fs',
  'shell',
  'networking',
  'github',
  'mcp',
  'ai',
  'memory',
  'sdb',
  'automation',
  'peer',
]);
export type ToolType = z.infer<typeof ToolType>;

export const TaskStep = z.object({
  id: z.string(),
  description: z.string(),
  tool: ToolType,
  parameters: z.record(z.string(), z.any()),
  dependencies: z.array(z.string()).default([]),
  estimatedDuration: z.number().optional(),
  canParallelize: z.boolean().default(false),
  priority: z.number().min(1).max(10).default(5),
});
export type TaskStep = z.infer<typeof TaskStep>;

export const ExecutionPlan = z.object({
  id: z.string(),
  steps: z.array(TaskStep),
  totalEstimatedDuration: z.number().optional(),
  parallelGroups: z.array(z.array(z.string())).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlan>;

// ============================================================================
// Reasoning
// ============================================================================

export const OptimizationResult = z.object({
  originalPlan: ExecutionPlan,
  optimizedPlan: ExecutionPlan,
  optimizations: z.array(z.string()),
  estimatedImprovement: z.number().optional(),
});
export type OptimizationResult = z.infer<typeof OptimizationResult>;

// ============================================================================
// Safety
// ============================================================================

export const RiskLevel = z.enum(['safe', 'low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const SafetyCheck = z.object({
  allowed: z.boolean(),
  riskLevel: RiskLevel,
  risks: z.array(z.string()),
  requiresConfirmation: z.boolean(),
  confirmationMessage: z.string().optional(),
  blockedReasons: z.array(z.string()).optional(),
});
export type SafetyCheck = z.infer<typeof SafetyCheck>;

// ============================================================================
// Tool Routing
// ============================================================================

export const ToolRoute = z.object({
  tool: ToolType,
  method: z.string(),
  parameters: z.record(z.string(), z.any()),
  fallback: z.object({
    tool: ToolType,
    method: z.string(),
    parameters: z.record(z.string(), z.any()),
    timeout: z.number().optional(),
    retries: z.number().default(0),
  }).optional(),
  timeout: z.number().optional(),
  retries: z.number().default(0),
});
export type ToolRoute = z.infer<typeof ToolRoute>;

export const RoutingDecision = z.object({
  routes: z.array(ToolRoute),
  executionMode: z.enum(['sequential', 'parallel', 'conditional']),
  streamingEnabled: z.boolean().default(false),
});
export type RoutingDecision = z.infer<typeof RoutingDecision>;

// ============================================================================
// Output Formatting
// ============================================================================

export const OutputFormat = z.enum(['markdown', 'json', 'plain', 'code', 'stream']);
export type OutputFormat = z.infer<typeof OutputFormat>;

export const FormattedOutput = z.object({
  format: OutputFormat,
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  error: z.boolean().default(false),
  errorMessage: z.string().optional(),
});
export type FormattedOutput = z.infer<typeof FormattedOutput>;

// ============================================================================
// Pipeline Context
// ============================================================================

export const PipelineContext = z.object({
  input: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  complexity: ComplexityResult.optional(),
  intent: Intent.optional(),
  plan: ExecutionPlan.optional(),
  optimization: OptimizationResult.optional(),
  safety: SafetyCheck.optional(),
  safetyCheck: SafetyCheck.optional(),
  routing: RoutingDecision.optional(),
  memoryContext: z.array(z.any()).optional(),
  startTime: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type PipelineContext = z.infer<typeof PipelineContext>;

// ============================================================================
// Pipeline Result
// ============================================================================

export const PipelineResult = z.object({
  success: z.boolean(),
  output: FormattedOutput,
  context: PipelineContext,
  executionTime: z.number(),
  stepsExecuted: z.array(z.string()),
  error: z.string().optional(),
});
export type PipelineResult = z.infer<typeof PipelineResult>;
