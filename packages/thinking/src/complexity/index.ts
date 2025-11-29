import { ComplexityResult, ComplexityLevel } from '../types';

/**
 * Complexity Detector
 * 
 * Analyzes user input to determine if it requires the full thinking pipeline
 * or can be handled with a simple, direct response.
 * 
 * Simple queries: "What is TypeScript?", "Hello", "Who is Linus Torvalds?"
 * Complex queries: "Analyze all files and summarize patterns", "Deploy to production"
 */

interface ComplexityConfig {
  simpleThreshold: number;
  complexThreshold: number;
  maxSimpleLength: number;
  complexKeywords: string[];
  multiStepIndicators: string[];
}

const DEFAULT_CONFIG: ComplexityConfig = {
  simpleThreshold: 0.3,
  complexThreshold: 0.7,
  maxSimpleLength: 100,
  complexKeywords: [
    'analyze', 'search', 'automate', 'deploy', 'refactor', 'optimize',
    'implement', 'create', 'build', 'setup', 'configure', 'integrate',
    'migrate', 'transform', 'process', 'generate', 'compile', 'test',
    'debug', 'profile', 'benchmark', 'monitor', 'track', 'sync',
  ],
  multiStepIndicators: [
    'and then', 'after that', 'next', 'finally', 'first', 'second',
    'then', 'also', 'additionally', 'furthermore', 'moreover',
    'all', 'every', 'each', 'multiple', 'several',
  ],
};

export class ComplexityDetector {
  private config: ComplexityConfig;

  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detects the complexity of user input
   */
  async detect(input: string): Promise<ComplexityResult> {
    const normalized = input.toLowerCase().trim();
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Input length
    if (normalized.length > this.config.maxSimpleLength) {
      score += 0.2;
      reasons.push('Input length exceeds simple threshold');
    }

    // Factor 2: Complex keywords
    const hasComplexKeywords = this.config.complexKeywords.some(keyword =>
      normalized.includes(keyword)
    );
    if (hasComplexKeywords) {
      score += 0.3;
      reasons.push('Contains complex action keywords');
    }

    // Factor 3: Multi-step indicators
    const hasMultiStepIndicators = this.config.multiStepIndicators.some(indicator =>
      normalized.includes(indicator)
    );
    if (hasMultiStepIndicators) {
      score += 0.25;
      reasons.push('Contains multi-step indicators');
    }

    // Factor 4: Question marks (simple queries often ask questions)
    const questionCount = (normalized.match(/\?/g) || []).length;
    if (questionCount === 1 && normalized.length < 50) {
      score -= 0.15;
      reasons.push('Simple question format');
    }

    // Factor 5: Code blocks or technical patterns
    if (normalized.includes('```') || normalized.includes('function') || 
        normalized.includes('class') || normalized.includes('import')) {
      score += 0.2;
      reasons.push('Contains code or technical patterns');
    }

    // Factor 6: File paths or system references
    if (normalized.match(/\/[\w-]+\/|\\[\w-]+\\|@[\w-]+\//) || 
        normalized.includes('package') || normalized.includes('directory')) {
      score += 0.15;
      reasons.push('References files or system components');
    }

    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score));

    // Determine complexity level
    let level: ComplexityLevel;
    let shouldUsePipeline: boolean;
    let estimatedSteps: number | undefined;

    if (score < this.config.simpleThreshold) {
      level = 'simple';
      shouldUsePipeline = false;
      estimatedSteps = 1;
    } else if (score < this.config.complexThreshold) {
      level = 'moderate';
      shouldUsePipeline = true;
      estimatedSteps = 3;
    } else {
      level = 'complex';
      shouldUsePipeline = true;
      estimatedSteps = 5;
    }

    return {
      level,
      score,
      reasoning: reasons.join('; ') || 'Simple query with no complex indicators',
      shouldUsePipeline,
      estimatedSteps,
    };
  }

  /**
   * Quick check if input is simple (for fast-path optimization)
   */
  isSimple(input: string): boolean {
    const normalized = input.toLowerCase().trim();
    
    // Very short inputs are usually simple
    if (normalized.length < 20) {
      return true;
    }

    // Single question without complex keywords
    if (normalized.length < this.config.maxSimpleLength &&
        normalized.includes('?') &&
        !this.config.complexKeywords.some(k => normalized.includes(k))) {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const complexityDetector = new ComplexityDetector();

// Export factory for custom configurations
export function createComplexityDetector(config?: Partial<ComplexityConfig>): ComplexityDetector {
  return new ComplexityDetector(config);
}
