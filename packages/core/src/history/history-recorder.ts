import { ToolExecutionResult, ToolExecutionContext } from '../tools/tool-schema';

/**
 * Command history entry
 */
export interface CommandHistoryEntry {
  id: string;
  timestamp: Date;
  toolName: string;
  params: Record<string, any>;
  context: ToolExecutionContext;
  result: ToolExecutionResult;
  stateBefore?: any;
  stateAfter?: any;
  reversible: boolean;
  undone: boolean;
}

/**
 * Command history recorder implementation
 */
export class CommandHistoryRecorder {
  private history: CommandHistoryEntry[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Record a command execution
   */
  async record(entry: {
    toolName: string;
    params: Record<string, any>;
    context: ToolExecutionContext;
    result: ToolExecutionResult;
    stateBefore?: any;
    stateAfter?: any;
    reversible: boolean;
  }): Promise<void> {
    const historyEntry: CommandHistoryEntry = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      toolName: entry.toolName,
      params: entry.params,
      context: entry.context,
      result: entry.result,
      stateBefore: entry.stateBefore,
      stateAfter: entry.stateAfter,
      reversible: entry.reversible,
      undone: false,
    };

    this.history.push(historyEntry);

    // Prune history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get command history
   */
  getHistory(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    reversibleOnly?: boolean;
  }): CommandHistoryEntry[] {
    let filtered = [...this.history];

    if (filters?.userId) {
      filtered = filtered.filter(e => e.context.userId === filters.userId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters?.reversibleOnly) {
      filtered = filtered.filter(e => e.reversible && !e.undone);
    }

    return filtered;
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): CommandHistoryEntry | undefined {
    return this.history.find(e => e.id === id);
  }

  /**
   * Mark entry as undone
   */
  markAsUndone(id: string): void {
    const entry = this.history.find(e => e.id === id);
    if (entry) {
      entry.undone = true;
    }
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get reversible commands (for undo)
   */
  getReversibleCommands(userId?: string): CommandHistoryEntry[] {
    return this.getHistory({
      userId,
      reversibleOnly: true,
    }).reverse(); // Most recent first
  }
}

/**
 * Create a command history recorder instance
 */
export function createCommandHistoryRecorder(maxHistorySize?: number): CommandHistoryRecorder {
  return new CommandHistoryRecorder(maxHistorySize);
}
