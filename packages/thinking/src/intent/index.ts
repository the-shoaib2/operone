import { Intent, IntentCategory } from '../types';

/**
 * Intent Engine
 * 
 * Classifies user input into specific intent categories to determine
 * which tools and capabilities should be used.
 */

interface IntentPattern {
  category: IntentCategory;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // File Operations
  {
    category: 'file_read',
    keywords: ['read', 'show', 'display', 'view', 'open', 'cat', 'see', 'check'],
    patterns: [/read\s+file/, /show\s+(?:me\s+)?(?:the\s+)?file/, /view\s+.*\.[\w]+/],
    weight: 1.0,
  },
  {
    category: 'file_write',
    keywords: ['write', 'create', 'save', 'update', 'modify', 'edit', 'change'],
    patterns: [/create\s+(?:a\s+)?file/, /write\s+to/, /save\s+(?:to\s+)?file/],
    weight: 1.0,
  },
  {
    category: 'file_search',
    keywords: ['find', 'search', 'locate', 'grep', 'look for'],
    patterns: [/find\s+files?/, /search\s+for/, /grep\s+/],
    weight: 1.0,
  },

  // Shell Commands
  {
    category: 'shell_command',
    keywords: ['run', 'execute', 'command', 'terminal', 'bash', 'shell', 'npm', 'git'],
    patterns: [/run\s+(?:the\s+)?command/, /execute\s+/, /npm\s+/, /git\s+/],
    weight: 1.0,
  },

  // Network Operations
  {
    category: 'network_request',
    keywords: ['fetch', 'download', 'get', 'post', 'api', 'http', 'request'],
    patterns: [/fetch\s+from/, /download\s+/, /api\s+call/, /http[s]?:\/\//],
    weight: 1.0,
  },
  {
    category: 'github_query',
    keywords: ['github', 'repository', 'repo', 'commit', 'pull request', 'issue'],
    patterns: [/github\s+/, /repository\s+/, /the-shoaib2/],
    weight: 1.0,
  },

  // Automation
  {
    category: 'automation',
    keywords: ['automate', 'schedule', 'workflow', 'pipeline', 'ci/cd'],
    patterns: [/automate\s+/, /set\s+up\s+workflow/, /create\s+pipeline/],
    weight: 1.0,
  },

  // Knowledge Queries
  {
    category: 'query_knowledge',
    keywords: ['what', 'who', 'when', 'where', 'why', 'how', 'explain', 'tell me'],
    patterns: [/what\s+is/, /who\s+is/, /how\s+(?:do|does)/, /explain\s+/],
    weight: 0.8,
  },

  // Multi-PC Operations
  {
    category: 'multi_pc',
    keywords: ['remote', 'peer', 'another machine', 'other computer', 'sync'],
    patterns: [/on\s+(?:the\s+)?(?:remote|other)\s+/, /sync\s+(?:with|to)/],
    weight: 1.0,
  },

  // Memory Operations
  {
    category: 'memory_recall',
    keywords: ['remember', 'recall', 'previous', 'last time', 'before'],
    patterns: [/what\s+did\s+(?:i|we)/, /last\s+time/, /previously/],
    weight: 1.0,
  },

  // Code Analysis
  {
    category: 'code_analysis',
    keywords: ['analyze', 'review', 'audit', 'inspect', 'examine', 'summarize'],
    patterns: [/analyze\s+(?:the\s+)?code/, /review\s+/, /summarize\s+.*files?/],
    weight: 1.0,
  },

  // Planning
  {
    category: 'planning',
    keywords: ['plan', 'design', 'architecture', 'strategy', 'approach'],
    patterns: [/how\s+(?:should|can)\s+(?:i|we)/, /plan\s+(?:to|for)/, /design\s+/],
    weight: 0.9,
  },
];

export class IntentEngine {
  /**
   * Detects the primary intent and any sub-intents from user input
   */
  async detect(input: string): Promise<Intent> {
    const normalized = input.toLowerCase().trim();
    const scores = new Map<IntentCategory, number>();

    // Calculate scores for each intent category
    for (const pattern of INTENT_PATTERNS) {
      let score = 0;

      // Check keywords
      for (const keyword of pattern.keywords) {
        if (normalized.includes(keyword)) {
          score += 0.3 * pattern.weight;
        }
      }

      // Check regex patterns
      for (const regex of pattern.patterns) {
        if (regex.test(normalized)) {
          score += 0.7 * pattern.weight;
        }
      }

      if (score > 0) {
        scores.set(pattern.category, (scores.get(pattern.category) || 0) + score);
      }
    }

    // No clear intent detected
    if (scores.size === 0) {
      return {
        category: 'unknown',
        confidence: 0.5,
        multiIntent: false,
      };
    }

    // Sort by score
    const sortedIntents = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);

    const primaryIntent = sortedIntents[0];
    const primaryConfidence = Math.min(1.0, primaryIntent[1]);

    // Check for multi-intent
    const multiIntent = sortedIntents.length > 1 && sortedIntents[1][1] > 0.5;

    // Extract entities (simple extraction)
    const entities = this.extractEntities(input);

    const result: Intent = {
      category: primaryIntent[0],
      confidence: primaryConfidence,
      entities,
      multiIntent,
    };

    // Add sub-intents if multi-intent detected
    if (multiIntent) {
      result.subIntents = sortedIntents.slice(1, 3).map(([category, score]) => ({
        category,
        confidence: Math.min(1.0, score),
        multiIntent: false,
      }));
    }

    return result;
  }

  /**
   * Extracts entities from input (file paths, URLs, usernames, etc.)
   */
  private extractEntities(input: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // File paths
    const filePaths = input.match(/(?:\/[\w.-]+)+|(?:\\[\w.-]+)+|[\w.-]+\.[\w]+/g);
    if (filePaths) {
      entities.paths = filePaths; // Use 'paths' to match test expectations
    }

    // URLs
    const urls = input.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      entities.urls = urls;
    }

    // GitHub usernames
    const githubUsers = input.match(/@[\w-]+/g);
    if (githubUsers) {
      entities.githubUsers = githubUsers.map(u => u.slice(1));
    }

    // File extensions
    const extensions = input.match(/\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h|json|yaml|yml|md|txt)/g);
    if (extensions) {
      entities.fileExtensions = [...new Set(extensions.map(e => e.slice(1)))];
    }

    // Package names
    const packages = input.match(/@[\w-]+\/[\w-]+/g);
    if (packages) {
      entities.packages = packages;
    }

    return entities;
  }

  /**
   * Quick check for specific intent categories
   */
  hasIntent(input: string, category: IntentCategory): boolean {
    const pattern = INTENT_PATTERNS.find(p => p.category === category);
    if (!pattern) return false;

    const normalized = input.toLowerCase();
    return pattern.keywords.some(k => normalized.includes(k)) ||
           pattern.patterns.some(p => p.test(normalized));
  }
}

// Export singleton instance
export const intentEngine = new IntentEngine();

// Export factory
export function createIntentEngine(): IntentEngine {
  return new IntentEngine();
}
