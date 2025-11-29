import { nanoid } from 'nanoid';
import {
  PipelineContext,
  PipelineResult,
  ComplexityResult,
  Intent,
  ExecutionPlan,
  SafetyCheck,
  RoutingDecision,
  FormattedOutput,
} from './types';
import {
  createPipelineEvent,
  IntentDetectionData,
  ComplexityCheckData,
  MemoryRetrievalData,
  PlanGenerationData,
  ReasoningOptimizationData,
  SafetyCheckData,
  ToolRoutingData,
  StepExecutionData,
  OutputAggregationData,
  MemoryUpdateData,
} from './events';
import { complexityDetector } from './complexity';
import { intentEngine } from './intent';
import { planningEngine } from './planning';
import { reasoningEngine } from './reasoning';
import { safetyEngine } from './safety';
import { toolRouter } from './routing';
import { outputEngine } from './output';

/**
 * Main Thinking Pipeline
 * 
 * Orchestrates the complete 8-stage Cascade-like pipeline:
 * 1. Complexity Detection
 * 2. Intent Analysis
 * 3. Memory Retrieval (optional)
 * 4. Planning
 * 5. Reasoning/Optimization
 * 6. Safety Validation
 * 7. Tool Routing
 * 8. Output Formatting
 */

export interface PipelineConfig {
  userId?: string;
  sessionId?: string;
  enableMemory?: boolean;
  safetyConfig?: any;
  streamingCallback?: (chunk: string) => void;
}

export class ThinkingPipeline {
  private config: PipelineConfig;
  private eventBus?: any; // Using any to avoid circular dependency issues for now, ideally should be EventBus type

  constructor(config: PipelineConfig = {}, eventBus?: any) {
    this.config = config;
    this.eventBus = eventBus;
  }

  private emit(event: string, data: any) {
    if (this.eventBus) {
      this.eventBus.publish('pipeline', event, data);
    }
  }

  /**
   * Processes user input through the complete pipeline
   */
  async process(input: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const stepsExecuted: string[] = [];

    // Initialize context
    const context: PipelineContext = {
      input,
      userId: this.config.userId,
      sessionId: this.config.sessionId || nanoid(),
      startTime,
      metadata: {},
    };

    try {
      this.emit('start', { input, sessionId: context.sessionId });

      // ========================================================================
      // STAGE 1: Complexity Detection
      // ========================================================================
      stepsExecuted.push('complexity_detection');
      const complexityStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'complexity_check',
        'start',
        { input }
      ));
      
      const complexity = await complexityDetector.detect(input);
      context.complexity = complexity;
      
      const complexityData: ComplexityCheckData = {
        complexity,
        factors: complexity.reasoning.split('. ').filter(f => f.length > 0),
        reasoning: complexity.reasoning,
        shouldUsePipeline: complexity.shouldUsePipeline,
        bypassReason: !complexity.shouldUsePipeline ? 'Query is simple enough for direct response' : undefined,
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'complexity_check',
        'complete',
        complexityData,
        { processingTime: Date.now() - complexityStart }
      ));

      // Fast path for simple queries
      if (!complexity.shouldUsePipeline) {
        return await this.handleSimpleQuery(input, context, stepsExecuted);
      }

      // ========================================================================
      // STAGE 2: Intent Analysis
      // ========================================================================
      stepsExecuted.push('intent_analysis');
      const intentStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'intent_detection',
        'start',
        { input }
      ));
      
      const intent = await intentEngine.detect(input);
      context.intent = intent;
      const intentProcessingTime = Date.now() - intentStart;
      
      const intentData: IntentDetectionData = {
        intent,
        processingTime: intentProcessingTime,
        confidence: intent.confidence,
        details: {
          action: intent.category,
          target: intent.entities?.target,
          parameters: intent.entities,
        },
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'intent_detection',
        'complete',
        intentData
      ));

      // ========================================================================
      // STAGE 3: Memory Retrieval (optional)
      // ========================================================================
      if (this.config.enableMemory) {
        stepsExecuted.push('memory_retrieval');
        const memoryStart = Date.now();
        this.emit('stage:start', createPipelineEvent(
          'memory_retrieval',
          'start',
          { input, intent: intent.category }
        ));
        
        context.memoryContext = await this.retrieveMemoryContext(input, intent);
        const memoryRetrievalTime = Date.now() - memoryStart;
        
        const memoryData: MemoryRetrievalData = {
          shortTerm: [],
          longTerm: context.memoryContext.map((item: any) => ({
            content: item.content || String(item),
            relevance: item.relevance || 0.5,
            source: item.source,
          })),
          contextSize: context.memoryContext.length,
          retrievalTime: memoryRetrievalTime,
          totalEntries: context.memoryContext.length,
        };
        
        this.emit('stage:complete', createPipelineEvent(
          'memory_retrieval',
          'complete',
          memoryData
        ));
      }

      // ========================================================================
      // STAGE 4: Planning
      // ========================================================================
      stepsExecuted.push('planning');
      const planningStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'plan_generation',
        'start',
        { intent: intent.category, complexity: complexity.level }
      ));
      
      const plan = await planningEngine.createPlan({
        intent,
        userInput: input,
        memoryContext: context.memoryContext,
      });
      context.plan = plan;
      
      const planData: PlanGenerationData = {
        plan,
        steps: plan.steps.map(step => ({
          id: step.id,
          action: step.description,
          tool: step.tool,
          dependencies: step.dependencies,
          estimatedTime: step.estimatedDuration,
        })),
        dag: {
          nodes: plan.steps.map(step => ({
            id: step.id,
            label: step.description,
            type: step.tool,
          })),
          edges: plan.steps.flatMap(step =>
            step.dependencies.map(dep => ({
              from: dep,
              to: step.id,
              type: 'dependency',
            }))
          ),
        },
        totalSteps: plan.steps.length,
        estimatedDuration: plan.totalEstimatedDuration,
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'plan_generation',
        'complete',
        planData,
        { processingTime: Date.now() - planningStart }
      ));

      // ========================================================================
      // STAGE 5: Reasoning/Optimization
      // ========================================================================
      stepsExecuted.push('reasoning');
      const reasoningStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'reasoning_optimization',
        'start',
        { planSteps: plan.steps.length }
      ));
      
      const optimizationResult = await reasoningEngine.optimize({
        plan,
        memoryContext: context.memoryContext,
      });
      context.optimization = optimizationResult;
      context.plan = optimizationResult.optimizedPlan;
      
      const reasoningData: ReasoningOptimizationData = {
        optimization: optimizationResult,
        originalSteps: optimizationResult.originalPlan.steps.length,
        optimizedSteps: optimizationResult.optimizedPlan.steps.length,
        parallelizable: optimizationResult.optimizedPlan.parallelGroups || [],
        estimatedSpeedup: optimizationResult.estimatedImprovement || 0,
        optimizations: optimizationResult.optimizations,
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'reasoning_optimization',
        'complete',
        reasoningData,
        { processingTime: Date.now() - reasoningStart }
      ));

      // ========================================================================
      // STAGE 6: Safety Validation
      // ========================================================================
      stepsExecuted.push('safety_validation');
      const safetyStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'safety_check',
        'start',
        { steps: context.plan.steps.length }
      ));
      
      const safetyCheck = await safetyEngine.validate(context.plan);
      context.safety = safetyCheck;
      context.safetyCheck = safetyCheck;
      
      const safetyData: SafetyCheckData = {
        safety: safetyCheck,
        allowed: context.plan.steps.filter((_, i) => !safetyCheck.blockedReasons?.[i]).map(s => s.id),
        blocked: context.plan.steps.filter((_, i) => safetyCheck.blockedReasons?.[i]).map(s => s.id),
        warnings: safetyCheck.risks,
        overallSafe: safetyCheck.allowed,
        riskLevel: safetyCheck.riskLevel,
        requiresConfirmation: safetyCheck.requiresConfirmation,
        blockedReasons: safetyCheck.blockedReasons,
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'safety_check',
        'complete',
        safetyData,
        { processingTime: Date.now() - safetyStart }
      ));

      // Check if blocked
      if (!safetyCheck.allowed) {
        return this.createErrorResult(
          context,
          stepsExecuted,
          `Operation blocked: ${safetyCheck.blockedReasons?.join(', ')}`
        );
      }

      // Check if requires confirmation
      if (safetyCheck.requiresConfirmation) {
        return this.createConfirmationResult(context, stepsExecuted, safetyCheck);
      }

      // ========================================================================
      // STAGE 7: Tool Routing
      // ========================================================================
      stepsExecuted.push('tool_routing');
      const routingStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'tool_routing',
        'start',
        { steps: context.plan.steps.length }
      ));
      
      const routing = await toolRouter.route(context.plan);
      context.routing = routing;
      
      // Emit routing event for each step
      for (const [index, route] of routing.routes.entries()) {
        const routingData: ToolRoutingData = {
          stepId: context.plan.steps[index]?.id || `step-${index}`,
          selectedTool: route.tool,
          route,
          alternatives: [], // TODO: Add alternatives from router
          confidence: 0.9, // TODO: Get from router
          reasoning: `Selected ${route.tool} for ${route.method}`,
        };
        
        this.emit('stage:progress', createPipelineEvent(
          'tool_routing',
          'progress',
          routingData
        ));
      }
      
      this.emit('stage:complete', createPipelineEvent(
        'tool_routing',
        'complete',
        { totalRoutes: routing.routes.length, executionMode: routing.executionMode },
        { processingTime: Date.now() - routingStart }
      ));

      // ========================================================================
      // STAGE 8: Execution & Output Formatting
      // ========================================================================
      stepsExecuted.push('execution');
      const executionStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'step_execution',
        'start',
        { totalSteps: context.plan.steps.length }
      ));
      
      const executionResult = await this.executeRoutes(routing, context);
      
      this.emit('stage:complete', createPipelineEvent(
        'step_execution',
        'complete',
        { totalSteps: context.plan.steps.length, duration: Date.now() - executionStart },
        { processingTime: Date.now() - executionStart }
      ));

      stepsExecuted.push('output_formatting');
      const outputStart = Date.now();
      this.emit('stage:start', createPipelineEvent(
        'output_aggregation',
        'start',
        { executionMode: routing.executionMode }
      ));
      
      const output = await outputEngine.format({
        content: executionResult,
        metadata: {
          executionMode: routing.executionMode,
          stepsCount: context.plan.steps.length,
          optimizations: optimizationResult.optimizations,
        },
      });
      
      const outputData: OutputAggregationData = {
        output,
        format: output.format,
        content: output.content,
        stepOutputs: context.plan.steps.map(step => ({ stepId: step.id, output: {} })),
        aggregationMethod: routing.executionMode,
        metadata: output.metadata || {},
      };
      
      this.emit('stage:complete', createPipelineEvent(
        'output_aggregation',
        'complete',
        outputData,
        { processingTime: Date.now() - outputStart }
      ));

      // Store in memory if enabled
      if (this.config.enableMemory) {
        const memoryUpdateStart = Date.now();
        this.emit('stage:start', createPipelineEvent(
          'memory_update',
          'start',
          { hasOutput: true }
        ));
        
        await this.storeInMemory(context, output, true);
        
        const memoryUpdateData: MemoryUpdateData = {
          saved: true,
          entries: 1,
          storageType: 'both',
          timestamp: Date.now(),
          duration: Date.now() - memoryUpdateStart,
          success: true,
        };
        
        this.emit('stage:complete', createPipelineEvent(
          'memory_update',
          'complete',
          memoryUpdateData
        ));
      }

      this.emit('complete', { success: true });

      return {
        success: true,
        output,
        context,
        executionTime: Date.now() - startTime,
        stepsExecuted,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Store failure in memory
      if (this.config.enableMemory) {
        await this.storeInMemory(context, undefined, false, errorMessage);
      }

      this.emit('error', { error: errorMessage });

      return this.createErrorResult(context, stepsExecuted, errorMessage);
    }
  }

  /**
   * Handles simple queries that bypass the full pipeline
   */
  private async handleSimpleQuery(
    input: string,
    context: PipelineContext,
    stepsExecuted: string[]
  ): Promise<PipelineResult> {
    stepsExecuted.push('simple_response');

    // For simple queries, just format the input as a query
    const output = await outputEngine.format({
      content: `Processing simple query: ${input}`,
      format: 'plain',
      metadata: {
        simple: true,
      },
    });

    return {
      success: true,
      output,
      context,
      executionTime: Date.now() - context.startTime,
      stepsExecuted,
    };
  }

  /**
   * Retrieves relevant context from memory
   */
  private async retrieveMemoryContext(input: string, intent: Intent): Promise<any[]> {
    // TODO: Implement actual memory retrieval
    // This will be implemented in Phase 2
    return [];
  }

  /**
   * Executes tool routes
   */
  private async executeRoutes(routing: RoutingDecision, context: PipelineContext): Promise<any> {
    const totalSteps = context.plan?.steps.length || 0;
    
    // Emit execution events for each step
    for (let i = 0; i < totalSteps; i++) {
      const step = context.plan!.steps[i];
      const stepStart = Date.now();
      
      // Emit step start
      const startData: StepExecutionData = {
        stepId: step.id,
        stepIndex: i,
        totalSteps,
        status: 'running',
        progress: (i / totalSteps) * 100,
        description: step.description,
        tool: step.tool,
        startTime: stepStart,
      };
      
      this.emit('step:executing', createPipelineEvent(
        'step_execution',
        'progress',
        startData
      ));
      
      // Simulate step execution (TODO: Implement actual tool execution)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Emit step complete
      const completeData: StepExecutionData = {
        stepId: step.id,
        stepIndex: i,
        totalSteps,
        status: 'complete',
        progress: ((i + 1) / totalSteps) * 100,
        description: step.description,
        tool: step.tool,
        startTime: stepStart,
        endTime: Date.now(),
        duration: Date.now() - stepStart,
        output: { status: 'success', message: `Executed ${step.description}` },
      };
      
      this.emit('step:complete', createPipelineEvent(
        'step_execution',
        'progress',
        completeData
      ));
    }
    
    // Return mock result
    return {
      message: 'Tool execution not yet implemented',
      routes: routing.routes.map(r => ({
        tool: r.tool,
        method: r.method,
        status: 'complete',
      })),
      plan: context.plan,
    };
  }

  /**
   * Stores result in memory
   */
  private async storeInMemory(
    context: PipelineContext,
    output: FormattedOutput | undefined,
    success: boolean,
    error?: string
  ): Promise<void> {
    // TODO: Implement actual memory storage
    // This will be implemented in Phase 2
  }

  /**
   * Creates an error result
   */
  private createErrorResult(
    context: PipelineContext,
    stepsExecuted: string[],
    errorMessage: string
  ): PipelineResult {
    return {
      success: false,
      output: {
        format: 'markdown',
        content: `❌ **Error**\n\n${errorMessage}`,
        error: true,
        errorMessage,
      },
      context,
      executionTime: Date.now() - context.startTime,
      stepsExecuted,
      error: errorMessage,
    };
  }

  private createConfirmationResult(
    context: PipelineContext,
    stepsExecuted: string[],
    safetyCheck: SafetyCheck
  ): PipelineResult {
    return {
      success: false,
      output: {
        format: 'markdown',
        content: safetyCheck.confirmationMessage || 'Confirmation required',
        error: false,
        metadata: {
          requiresConfirmation: true,
          riskLevel: safetyCheck.riskLevel,
          risks: safetyCheck.risks,
        },
      },
      context,
      executionTime: Date.now() - context.startTime,
      stepsExecuted,
    };
  }

  /**
   * Gets the current pipeline context (for debugging)
   */
  getContext(): PipelineConfig {
    return this.config;
  }
}

/**
 * Creates a new thinking pipeline instance
 */
export function createThinkingPipeline(config?: PipelineConfig, eventBus?: any): ThinkingPipeline {
  return new ThinkingPipeline(config, eventBus);
}

/**
 * Singleton instance for convenience
 */
export const thinkingPipeline = new ThinkingPipeline();
