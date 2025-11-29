import { LongTermMemory, MemoryEntry } from './LongTermMemory';
import { ShortTermMemory } from './ShortTermMemory';

/**
 * Memory Recall System
 * 
 * Retrieves relevant context from both short-term and long-term memory
 * to enhance the thinking pipeline with historical context.
 */

export interface MemoryQuery {
  query: string;
  userId?: string;
  sessionId?: string;
  limit?: number;
  minRelevance?: number;
}

export interface MemoryContext {
  type: 'task_result' | 'conversation' | 'knowledge';
  content: any;
  relevance: number;
  timestamp: number;
  source: 'short_term' | 'long_term';
  metadata?: Record<string, any>;
}

export class MemoryRecall {
  private shortTermMemory: ShortTermMemory<any>;
  private longTermMemory: LongTermMemory;

  constructor(
    shortTermMemory?: ShortTermMemory<any>,
    longTermMemory?: LongTermMemory
  ) {
    this.shortTermMemory = shortTermMemory || new ShortTermMemory<any>();
    this.longTermMemory = longTermMemory || new LongTermMemory(':memory:');
  }

  /**
   * Retrieves relevant context for a query
   */
  async getRelevantContext(query: MemoryQuery): Promise<MemoryContext[]> {
    const contexts: MemoryContext[] = [];
    const limit = query.limit || 10;
    const minRelevance = query.minRelevance || 0.5;

    // 1. Check short-term memory first (recent context)
    const shortTermResults = await this.searchShortTerm(query);
    contexts.push(...shortTermResults);

    // 2. Check long-term memory (historical patterns)
    const longTermResults = await this.searchLongTerm(query);
    contexts.push(...longTermResults);

    // 3. Sort by relevance and timestamp
    contexts.sort((a, b) => {
      // Higher relevance first
      if (Math.abs(a.relevance - b.relevance) > 0.1) {
        return b.relevance - a.relevance;
      }
      // More recent first if relevance is similar
      return b.timestamp - a.timestamp;
    });

    // 4. Filter by minimum relevance and limit
    return contexts
      .filter(ctx => ctx.relevance >= minRelevance)
      .slice(0, limit);
  }

  /**
   * Searches short-term memory
   */
  private async searchShortTerm(query: MemoryQuery): Promise<MemoryContext[]> {
    const contexts: MemoryContext[] = [];

    try {
      // Get all items from short-term memory
      const allItems = this.shortTermMemory.getAll();

      for (const [key, data] of Object.entries(allItems)) {
        // Calculate relevance based on keyword matching
        const relevance = this.calculateRelevance(query.query, data);

        if (relevance > 0) {
          contexts.push({
            type: this.inferType(data),
            content: data,
            relevance,
            timestamp: Date.now(), // Short-term doesn't track timestamp
            source: 'short_term',
            metadata: { key },
          });
        }
      }
    } catch (error) {
      console.error('Error searching short-term memory:', error);
    }

    return contexts;
  }

  /**
   * Searches long-term memory
   */
  private async searchLongTerm(query: MemoryQuery): Promise<MemoryContext[]> {
    const contexts: MemoryContext[] = [];

    try {
      // Search long-term memory
      const results = await this.longTermMemory.search(query.query);

      for (const result of results) {
        const content = JSON.parse(result.content);
        
        contexts.push({
          type: result.type as any,
          content,
          relevance: 0.7, // Default relevance for text search
          timestamp: result.timestamp,
          source: 'long_term',
          metadata: {
            id: result.id,
          },
        });
      }
    } catch (error) {
      console.error('Error searching long-term memory:', error);
    }

    return contexts;
  }

  /**
   * Calculates relevance score between query and content
   */
  private calculateRelevance(query: string, content: any): number {
    const queryLower = query.toLowerCase();
    const contentStr = JSON.stringify(content).toLowerCase();

    // Simple keyword matching
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    let matches = 0;

    for (const word of queryWords) {
      if (contentStr.includes(word)) {
        matches++;
      }
    }

    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  /**
   * Infers the type of memory content
   */
  private inferType(content: any): 'task_result' | 'conversation' | 'knowledge' {
    if (typeof content === 'object' && content !== null) {
      if (content.success !== undefined || content.steps !== undefined) {
        return 'task_result';
      }
      if (content.message || content.role) {
        return 'conversation';
      }
    }
    return 'knowledge';
  }

  /**
   * Gets recent conversation context
   */
  async getConversationContext(sessionId: string, limit: number = 5): Promise<MemoryContext[]> {
    const contexts: MemoryContext[] = [];

    try {
      const allItems = this.shortTermMemory.getAll();
      
      for (const [key, data] of Object.entries(allItems)) {
        if (data && typeof data === 'object' && 
            (data as any).sessionId === sessionId) {
          contexts.push({
            type: 'conversation',
            content: data,
            relevance: 1.0,
            timestamp: Date.now(),
            source: 'short_term',
          });
        }
      }
    } catch (error) {
      console.error('Error getting conversation context:', error);
    }

    return contexts.slice(0, limit);
  }

  /**
   * Gets similar past tasks
   */
  async getSimilarTasks(description: string, limit: number = 3): Promise<MemoryContext[]> {
    return this.getRelevantContext({
      query: description,
      limit,
      minRelevance: 0.6,
    }).then(contexts => 
      contexts.filter(ctx => ctx.type === 'task_result')
    );
  }
}

// Export singleton instance
export const memoryRecall = new MemoryRecall();

// Export factory
export function createMemoryRecall(
  shortTermMemory?: ShortTermMemory<any>,
  longTermMemory?: LongTermMemory
): MemoryRecall {
  return new MemoryRecall(shortTermMemory, longTermMemory);
}
