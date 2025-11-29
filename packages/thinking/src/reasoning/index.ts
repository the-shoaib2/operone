import { ExecutionPlan, OptimizationResult, TaskStep } from '../types';

/**
 * Reasoning Engine
 * 
 * Optimizes execution plans using logical reasoning:
 * - Removes redundant steps
 * - Parallelizes independent tasks
 * - Applies domain-specific optimizations
 * - Uses memory to recall similar past tasks
 */

interface ReasoningContext {
  plan: ExecutionPlan;
  memoryContext?: any[];
  userPreferences?: Record<string, any>;
}

export class ReasoningEngine {
  /**
   * Optimizes an execution plan
   */
  async optimize(context: ReasoningContext): Promise<OptimizationResult> {
    const originalPlan = context.plan;
    let optimizedSteps = [...originalPlan.steps];
    const optimizations: string[] = [];

    // 1. Remove duplicate steps
    const { steps: deduped, removed: dedupedCount } = this.removeDuplicates(optimizedSteps);
    if (dedupedCount > 0) {
      optimizedSteps = deduped;
      optimizations.push(`Removed ${dedupedCount} duplicate step(s)`);
    }

    // 2. Merge similar consecutive steps
    const { steps: merged, merged: mergeCount } = this.mergeSimilarSteps(optimizedSteps);
    if (mergeCount > 0) {
      optimizedSteps = merged;
      optimizations.push(`Merged ${mergeCount} similar step(s)`);
    }

    // 3. Reorder for better efficiency
    const { steps: reordered, swaps } = this.reorderSteps(optimizedSteps);
    if (swaps > 0) {
      optimizedSteps = reordered;
      optimizations.push(`Reordered ${swaps} step(s) for efficiency`);
    }

    // 4. Identify additional parallelization opportunities
    const parallelGroups = this.findParallelizationOpportunities(optimizedSteps);
    if (parallelGroups.length > (originalPlan.parallelGroups?.length || 0)) {
      optimizations.push(`Identified ${parallelGroups.length - (originalPlan.parallelGroups?.length || 0)} additional parallel execution group(s)`);
    }

    // 5. Apply memory-based optimizations
    if (context.memoryContext && context.memoryContext.length > 0) {
      const memoryOpts = this.applyMemoryOptimizations(optimizedSteps, context.memoryContext);
      optimizedSteps = memoryOpts.steps;
      optimizations.push(...memoryOpts.optimizations);
    }

    // 6. Calculate estimated improvement
    const originalDuration = this.calculateTotalDuration(originalPlan.steps, originalPlan.parallelGroups || []);
    const optimizedDuration = this.calculateTotalDuration(optimizedSteps, parallelGroups);
    const improvement = ((originalDuration - optimizedDuration) / originalDuration) * 100;

    const optimizedPlan: ExecutionPlan = {
      ...originalPlan,
      steps: optimizedSteps,
      parallelGroups,
      totalEstimatedDuration: optimizedDuration,
      metadata: {
        ...originalPlan.metadata,
        optimized: true,
        optimizationCount: optimizations.length,
      },
    };

    return {
      originalPlan,
      optimizedPlan,
      optimizations,
      estimatedImprovement: improvement > 0 ? improvement : undefined,
    };
  }

  /**
   * Removes duplicate steps
   */
  private removeDuplicates(steps: TaskStep[]): { steps: TaskStep[]; removed: number } {
    const seen = new Map<string, TaskStep>();
    const unique: TaskStep[] = [];

    for (const step of steps) {
      const key = `${step.tool}:${step.description}:${JSON.stringify(step.parameters)}`;
      
      if (!seen.has(key)) {
        seen.set(key, step);
        unique.push(step);
      } else {
        // Update dependencies to point to the first occurrence
        const existing = seen.get(key)!;
        for (const otherStep of steps) {
          if (otherStep.dependencies.includes(step.id)) {
            otherStep.dependencies = otherStep.dependencies.map(dep =>
              dep === step.id ? existing.id : dep
            );
          }
        }
      }
    }

    return { steps: unique, removed: steps.length - unique.length };
  }

  /**
   * Merges similar consecutive steps
   */
  private mergeSimilarSteps(steps: TaskStep[]): { steps: TaskStep[]; merged: number } {
    const merged: TaskStep[] = [];
    let mergeCount = 0;
    let i = 0;

    while (i < steps.length) {
      const current = steps[i];
      
      // Check if next step can be merged
      if (i < steps.length - 1) {
        const next = steps[i + 1];
        
        // Can merge if same tool, no dependencies, and both can parallelize
        if (current.tool === next.tool &&
            current.canParallelize &&
            next.canParallelize &&
            next.dependencies.length === 0) {
          
          // Merge parameters
          const mergedStep: TaskStep = {
            ...current,
            description: `${current.description} + ${next.description}`,
            parameters: {
              ...current.parameters,
              batch: [current.parameters, next.parameters],
            },
            estimatedDuration: Math.max(current.estimatedDuration || 0, next.estimatedDuration || 0),
          };
          
          merged.push(mergedStep);
          mergeCount++;
          i += 2;
          continue;
        }
      }
      
      merged.push(current);
      i++;
    }

    return { steps: merged, merged: mergeCount };
  }

  /**
   * Reorders steps for better efficiency
   */
  private reorderSteps(steps: TaskStep[]): { steps: TaskStep[]; swaps: number } {
    const reordered = [...steps];
    let swaps = 0;

    // Sort by priority (higher priority first) while respecting dependencies
    for (let i = 0; i < reordered.length - 1; i++) {
      for (let j = i + 1; j < reordered.length; j++) {
        const stepI = reordered[i];
        const stepJ = reordered[j];

        // Can swap if J has higher priority and doesn't depend on I
        if (stepJ.priority > stepI.priority &&
            !stepJ.dependencies.includes(stepI.id) &&
            !this.hasDependencyPath(stepJ, stepI, reordered)) {
          
          [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
          swaps++;
        }
      }
    }

    return { steps: reordered, swaps };
  }

  /**
   * Checks if there's a dependency path from step A to step B
   */
  private hasDependencyPath(stepA: TaskStep, stepB: TaskStep, allSteps: TaskStep[]): boolean {
    const visited = new Set<string>();
    const queue = [...stepA.dependencies];

    while (queue.length > 0) {
      const depId = queue.shift()!;
      
      if (depId === stepB.id) return true;
      if (visited.has(depId)) continue;
      
      visited.add(depId);
      const depStep = allSteps.find(s => s.id === depId);
      if (depStep) {
        queue.push(...depStep.dependencies);
      }
    }

    return false;
  }

  /**
   * Finds additional parallelization opportunities
   */
  private findParallelizationOpportunities(steps: TaskStep[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Group steps by dependency level
    const levels = new Map<number, TaskStep[]>();
    
    for (const step of steps) {
      const level = this.getStepLevel(step, steps);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(step);
    }

    // Find parallelizable steps at each level
    for (const [_, levelSteps] of levels) {
      const parallelizable = levelSteps.filter(s => s.canParallelize && !processed.has(s.id));
      
      if (parallelizable.length > 1) {
        groups.push(parallelizable.map(s => s.id));
        parallelizable.forEach(s => processed.add(s.id));
      }
    }

    return groups;
  }

  /**
   * Gets the dependency level of a step
   */
  private getStepLevel(step: TaskStep, allSteps: TaskStep[]): number {
    if (step.dependencies.length === 0) return 0;

    let maxLevel = 0;
    for (const depId of step.dependencies) {
      const depStep = allSteps.find(s => s.id === depId);
      if (depStep) {
        maxLevel = Math.max(maxLevel, this.getStepLevel(depStep, allSteps) + 1);
      }
    }

    return maxLevel;
  }

  /**
   * Applies optimizations based on memory context
   */
  private applyMemoryOptimizations(
    steps: TaskStep[],
    memoryContext: any[]
  ): { steps: TaskStep[]; optimizations: string[] } {
    const optimizations: string[] = [];
    const optimizedSteps = [...steps];

    // Check if we've done similar tasks before
    for (const memory of memoryContext) {
      if (memory.type === 'task_result' && memory.success) {
        // If we have cached results, we can skip some steps
        const cachedStepIds = memory.stepIds || [];
        const canSkip = optimizedSteps.filter(s => 
          cachedStepIds.includes(s.description) && s.tool === 'fs'
        );

        if (canSkip.length > 0) {
          optimizations.push(`Using cached results for ${canSkip.length} step(s)`);
          // Mark steps as using cache
          canSkip.forEach(step => {
            step.parameters.useCache = true;
            step.estimatedDuration = (step.estimatedDuration || 0) * 0.1; // 10x faster with cache
          });
        }
      }
    }

    return { steps: optimizedSteps, optimizations };
  }

  /**
   * Calculates total duration considering parallelization
   */
  private calculateTotalDuration(steps: TaskStep[], parallelGroups: string[][]): number {
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
export const reasoningEngine = new ReasoningEngine();

// Export factory
export function createReasoningEngine(): ReasoningEngine {
  return new ReasoningEngine();
}
