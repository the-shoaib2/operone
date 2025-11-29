import { nanoid } from 'nanoid';
import { ExecutionPlan, TaskStep, Intent, ToolType, IntentCategory } from '../types';
import { DependencyGraph } from '../DependencyGraph';

/**
 * Planning Engine
 * 
 * Creates step-by-step execution plans based on detected intent.
 * Uses dependency graphs to order tasks correctly.
 */

interface PlanningContext {
  intent: Intent;
  userInput: string;
  memoryContext?: any[];
}

export class PlanningEngine {
  /**
   * Creates an execution plan from detected intent
   */
  async createPlan(context: PlanningContext): Promise<ExecutionPlan> {
    const steps: TaskStep[] = [];
    const planId = nanoid();

    // Generate steps based on primary intent
    const primarySteps = this.generateStepsForIntent(
      context.intent.category,
      context.intent.entities || {},
      context.userInput
    );
    steps.push(...primarySteps);

    // Add steps for sub-intents if multi-intent
    if (context.intent.multiIntent && context.intent.subIntents) {
      for (const subIntent of context.intent.subIntents) {
        const subSteps = this.generateStepsForIntent(
          subIntent.category,
          {}, // subIntents don't have entities in the simplified schema
          context.userInput
        );
        steps.push(...subSteps);
      }
    }

    // Build dependency graph
    const graph = this.buildDependencyGraph(steps);

    // Identify parallel execution groups
    const parallelGroups = this.identifyParallelGroups(steps, graph);

    // Calculate total estimated duration
    const totalEstimatedDuration = this.calculateDuration(steps, parallelGroups);

    return {
      id: planId,
      steps,
      totalEstimatedDuration,
      parallelGroups,
      metadata: {
        intentCategory: context.intent.category,
        multiIntent: context.intent.multiIntent,
        createdAt: Date.now(),
      },
    };
  }

  /**
   * Generates task steps for a specific intent category
   */
  private generateStepsForIntent(
    category: IntentCategory,
    entities: Record<string, any>,
    userInput: string
  ): TaskStep[] {
    switch (category) {
      case 'file_read':
        return this.generateFileReadSteps(entities, userInput);
      
      case 'file_write':
        return this.generateFileWriteSteps(entities, userInput);
      
      case 'file_search':
        return this.generateFileSearchSteps(entities, userInput);
      
      case 'shell_command':
        return this.generateShellCommandSteps(entities, userInput);
      
      case 'network_request':
        return this.generateNetworkRequestSteps(entities, userInput);
      
      case 'github_query':
        return this.generateGithubQuerySteps(entities, userInput);
      
      case 'automation':
        return this.generateAutomationSteps(entities, userInput);
      
      case 'query_knowledge':
        return this.generateKnowledgeQuerySteps(entities, userInput);
      
      case 'multi_pc':
        return this.generateMultiPcSteps(entities, userInput);
      
      case 'memory_recall':
        return this.generateMemoryRecallSteps(entities, userInput);
      
      case 'code_analysis':
        return this.generateCodeAnalysisSteps(entities, userInput);
      
      case 'planning':
        return this.generatePlanningSteps(entities, userInput);
      
      default:
        return this.generateDefaultSteps(entities, userInput);
    }
  }

  private generateFileReadSteps(entities: Record<string, any>, input: string): TaskStep[] {
    const filePaths = entities.filePaths || [];
    return filePaths.map((path: string, index: number) => ({
      id: nanoid(),
      description: `Read file: ${path}`,
      tool: 'fs' as ToolType,
      parameters: { operation: 'read', path },
      dependencies: [],
      estimatedDuration: 100,
      canParallelize: true,
      priority: 5,
    }));
  }

  private generateFileWriteSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Write file',
      tool: 'fs' as ToolType,
      parameters: { operation: 'write', path: entities.filePaths?.[0] || 'output.txt' },
      dependencies: [],
      estimatedDuration: 200,
      canParallelize: false,
      priority: 7,
    }];
  }

  private generateFileSearchSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Search files',
      tool: 'fs' as ToolType,
      parameters: { 
        operation: 'search',
        extensions: entities.fileExtensions || [],
        query: input,
      },
      dependencies: [],
      estimatedDuration: 500,
      canParallelize: false,
      priority: 6,
    }];
  }

  private generateShellCommandSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Execute shell command',
      tool: 'shell' as ToolType,
      parameters: { command: input },
      dependencies: [],
      estimatedDuration: 1000,
      canParallelize: false,
      priority: 8,
    }];
  }

  private generateNetworkRequestSteps(entities: Record<string, any>, input: string): TaskStep[] {
    const urls = entities.urls || [];
    return urls.map((url: string) => ({
      id: nanoid(),
      description: `Fetch from ${url}`,
      tool: 'networking' as ToolType,
      parameters: { url, method: 'GET' },
      dependencies: [],
      estimatedDuration: 2000,
      canParallelize: true,
      priority: 6,
    }));
  }

  private generateGithubQuerySteps(entities: Record<string, any>, input: string): TaskStep[] {
    const users = entities.githubUsers || [];
    return users.map((username: string) => ({
      id: nanoid(),
      description: `Query GitHub user: ${username}`,
      tool: 'networking' as ToolType,
      parameters: { service: 'github', username },
      dependencies: [],
      estimatedDuration: 1500,
      canParallelize: true,
      priority: 6,
    }));
  }

  private generateAutomationSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Setup automation',
      tool: 'automation' as ToolType,
      parameters: { task: input },
      dependencies: [],
      estimatedDuration: 3000,
      canParallelize: false,
      priority: 7,
    }];
  }

  private generateKnowledgeQuerySteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Query AI for knowledge',
      tool: 'ai' as ToolType,
      parameters: { query: input, mode: 'knowledge' },
      dependencies: [],
      estimatedDuration: 2000,
      canParallelize: false,
      priority: 5,
    }];
  }

  private generateMultiPcSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Execute on remote peer',
      tool: 'peer' as ToolType,
      parameters: { command: input },
      dependencies: [],
      estimatedDuration: 3000,
      canParallelize: false,
      priority: 8,
    }];
  }

  private generateMemoryRecallSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Recall from memory',
      tool: 'memory' as ToolType,
      parameters: { query: input },
      dependencies: [],
      estimatedDuration: 300,
      canParallelize: false,
      priority: 4,
    }];
  }

  private generateCodeAnalysisSteps(entities: Record<string, any>, input: string): TaskStep[] {
    const searchStep = nanoid();
    const analyzeStep = nanoid();

    return [
      {
        id: searchStep,
        description: 'Find code files',
        tool: 'fs' as ToolType,
        parameters: { 
          operation: 'search',
          extensions: entities.fileExtensions || ['ts', 'js', 'tsx', 'jsx'],
        },
        dependencies: [],
        estimatedDuration: 500,
        canParallelize: false,
        priority: 6,
      },
      {
        id: analyzeStep,
        description: 'Analyze code',
        tool: 'ai' as ToolType,
        parameters: { mode: 'code_analysis' },
        dependencies: [searchStep],
        estimatedDuration: 5000,
        canParallelize: false,
        priority: 7,
      },
    ];
  }

  private generatePlanningSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Generate plan with AI',
      tool: 'ai' as ToolType,
      parameters: { query: input, mode: 'planning' },
      dependencies: [],
      estimatedDuration: 3000,
      canParallelize: false,
      priority: 6,
    }];
  }

  private generateDefaultSteps(entities: Record<string, any>, input: string): TaskStep[] {
    return [{
      id: nanoid(),
      description: 'Process query',
      tool: 'ai' as ToolType,
      parameters: { query: input },
      dependencies: [],
      estimatedDuration: 2000,
      canParallelize: false,
      priority: 5,
    }];
  }

  /**
   * Builds a dependency graph from task steps
   */
  private buildDependencyGraph(steps: TaskStep[]): DependencyGraph {
    const graph = new DependencyGraph();
    
    for (const step of steps) {
      graph.addTask({
        id: step.id,
        description: step.description,
        status: 'pending',
      });
    }

    for (const step of steps) {
      for (const depId of step.dependencies) {
        graph.addDependency(depId, step.id);
      }
    }

    return graph;
  }

  /**
   * Identifies groups of steps that can run in parallel
   */
  private identifyParallelGroups(steps: TaskStep[], graph: DependencyGraph): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Group steps by their dependency level
    const levels = new Map<number, string[]>();
    
    for (const step of steps) {
      if (processed.has(step.id)) continue;

      const level = this.getStepLevel(step, steps);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(step.id);
      processed.add(step.id);
    }

    // Convert levels to groups, filtering for parallelizable steps
    for (const [_, stepIds] of Array.from(levels.entries()).sort((a, b) => a[0] - b[0])) {
      const parallelizable = stepIds.filter(id => {
        const step = steps.find(s => s.id === id);
        return step?.canParallelize;
      });

      if (parallelizable.length > 1) {
        groups.push(parallelizable);
      }
    }

    return groups;
  }

  /**
   * Gets the dependency level of a step (0 = no dependencies)
   */
  private getStepLevel(step: TaskStep, allSteps: TaskStep[]): number {
    if (step.dependencies.length === 0) return 0;

    let maxLevel = 0;
    for (const depId of step.dependencies) {
      const depStep = allSteps.find(s => s.id === depId);
      if (depStep) {
        const depLevel = this.getStepLevel(depStep, allSteps);
        maxLevel = Math.max(maxLevel, depLevel + 1);
      }
    }

    return maxLevel;
  }

  /**
   * Calculates total estimated duration considering parallelization
   */
  private calculateDuration(steps: TaskStep[], parallelGroups: string[][]): number {
    let total = 0;
    const parallelStepIds = new Set(parallelGroups.flat());

    // Add sequential steps
    for (const step of steps) {
      if (!parallelStepIds.has(step.id)) {
        total += step.estimatedDuration || 0;
      }
    }

    // Add parallel groups (max duration in each group)
    for (const group of parallelGroups) {
      const groupSteps = steps.filter(s => group.includes(s.id));
      const maxDuration = Math.max(...groupSteps.map(s => s.estimatedDuration || 0));
      total += maxDuration;
    }

    return total;
  }
}

// Export singleton instance
export const planningEngine = new PlanningEngine();

// Export factory
export function createPlanningEngine(): PlanningEngine {
  return new PlanningEngine();
}
