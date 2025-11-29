import { LongTermMemory, MemoryEntry } from './LongTermMemory';
import { ShortTermMemory } from './ShortTermMemory';

/**
 * Memory Storage System
 * 
 * Stores task results, learnings, and patterns for future recall.
 */

export interface TaskResult {
  id: string;
  description: string;
  input: string;
  output: any;
  success: boolean;
  steps: string[];
  executionTime: number;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface Learning {
  pattern: string;
  context: string;
  outcome: 'success' | 'failure';
  frequency: number;
  lastSeen: number;
}

export class MemoryStore {
  private shortTermMemory: ShortTermMemory<any>;
  private longTermMemory: LongTermMemory;
  private learnings: Map<string, Learning>;

  constructor(
    shortTermMemory?: ShortTermMemory<any>,
    longTermMemory?: LongTermMemory
  ) {
    this.shortTermMemory = shortTermMemory || new ShortTermMemory<any>();
    this.longTermMemory = longTermMemory || new LongTermMemory(':memory:');
    this.learnings = new Map();
  }

  /**
   * Stores a task result
   */
  async saveTask(result: TaskResult): Promise<void> {
    try {
      // Store in short-term memory for quick access
      this.shortTermMemory.set(`task:${result.id}`, result);

      // Store in long-term memory for persistence
      const entry: MemoryEntry = {
        id: `task:${result.id}`,
        content: JSON.stringify(result),
        type: 'task',
        timestamp: result.timestamp,
        metadata: JSON.stringify({
          success: result.success,
          steps: result.steps,
        }),
      };
      
      await this.longTermMemory.store(entry);

      // Extract and store learnings
      await this.extractLearnings(result);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }

  /**
   * Stores conversation context
   */
  async saveConversation(
    sessionId: string,
    message: string,
    role: 'user' | 'assistant',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const conversationEntry = {
        sessionId,
        message,
        role,
        timestamp: Date.now(),
        metadata,
      };

      // Store in short-term memory
      this.shortTermMemory.set(
        `conversation:${sessionId}:${Date.now()}`,
        conversationEntry
      );

      // Store in long-term memory
      const entry: MemoryEntry = {
        id: `conversation:${sessionId}:${Date.now()}`,
        content: JSON.stringify(conversationEntry),
        type: 'conversation',
        timestamp: Date.now(),
        metadata: JSON.stringify({ role, sessionId }),
      };
      
      await this.longTermMemory.store(entry);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  /**
   * Stores knowledge
   */
  async saveKnowledge(
    topic: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const knowledgeEntry = {
        topic,
        content,
        timestamp: Date.now(),
        metadata,
      };

      // Store in long-term memory
      const entry: MemoryEntry = {
        id: `knowledge:${topic}`,
        content: JSON.stringify(knowledgeEntry),
        type: 'knowledge',
        timestamp: Date.now(),
        metadata: JSON.stringify({ topic }),
      };
      
      await this.longTermMemory.store(entry);
    } catch (error) {
      console.error('Error saving knowledge:', error);
    }
  }

  /**
   * Extracts learnings from task results
   */
  private async extractLearnings(result: TaskResult): Promise<void> {
    try {
      // Extract patterns from successful tasks
      if (result.success) {
        const pattern = this.identifyPattern(result);
        
        if (pattern) {
          const existing = this.learnings.get(pattern);
          
          if (existing) {
            existing.frequency++;
            existing.lastSeen = Date.now();
          } else {
            this.learnings.set(pattern, {
              pattern,
              context: result.description,
              outcome: 'success',
              frequency: 1,
              lastSeen: Date.now(),
            });
          }

          // Store learning in long-term memory
          const learning = this.learnings.get(pattern)!;
          const entry: MemoryEntry = {
            id: `learning:${pattern}`,
            content: JSON.stringify(learning),
            type: 'learning',
            timestamp: Date.now(),
            metadata: JSON.stringify({ pattern, frequency: learning.frequency }),
          };
          
          await this.longTermMemory.store(entry);
        }
      }
    } catch (error) {
      console.error('Error extracting learnings:', error);
    }
  }

  /**
   * Identifies patterns from task results
   */
  private identifyPattern(result: TaskResult): string | null {
    // Simple pattern identification based on steps
    if (result.steps.length === 0) return null;

    // Create a pattern signature from the steps
    const signature = result.steps
      .map(step => step.split(':')[0]) // Get step type
      .join('->');

    return signature;
  }

  /**
   * Gets learnings for a specific pattern
   */
  getLearning(pattern: string): Learning | undefined {
    return this.learnings.get(pattern);
  }

  /**
   * Gets all learnings
   */
  getAllLearnings(): Learning[] {
    return Array.from(this.learnings.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Clears short-term memory
   */
  clearShortTerm(): void {
    this.shortTermMemory.clear();
  }

  /**
   * Gets memory statistics
   */
  getStats(): {
    shortTermSize: number;
    learningsCount: number;
  } {
    return {
      shortTermSize: Object.keys(this.shortTermMemory.getAll()).length,
      learningsCount: this.learnings.size,
    };
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore();

// Export factory
export function createMemoryStore(
  shortTermMemory?: ShortTermMemory<any>,
  longTermMemory?: LongTermMemory
): MemoryStore {
  return new MemoryStore(shortTermMemory, longTermMemory);
}
