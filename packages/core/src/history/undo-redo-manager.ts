import { ToolExecutor, ToolExecutionContext } from '../tools';
import { CommandHistoryRecorder, CommandHistoryEntry } from './history-recorder';
import { getToolRegistry } from '../tools/tool-registry';

/**
 * Undo/Redo manager
 */
export class UndoRedoManager {
  private undoStack: CommandHistoryEntry[] = [];
  private redoStack: CommandHistoryEntry[] = [];
  private maxStackSize: number;

  constructor(
    private executor: ToolExecutor,
    private historyRecorder: CommandHistoryRecorder,
    maxStackSize: number = 50
  ) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * Undo the last command
   */
  async undo(context: ToolExecutionContext): Promise<{
    success: boolean;
    message: string;
    command?: CommandHistoryEntry;
  }> {
    // Get reversible commands for this user
    const reversibleCommands = this.historyRecorder.getReversibleCommands(context.userId);
    
    if (reversibleCommands.length === 0) {
      return {
        success: false,
        message: 'No commands to undo',
      };
    }

    const commandToUndo = reversibleCommands[0];

    try {
      // Execute the reverse operation
      const undoResult = await this.executeUndo(commandToUndo, context);

      if (undoResult.success) {
        // Mark as undone in history
        this.historyRecorder.markAsUndone(commandToUndo.id);

        // Add to undo stack
        this.undoStack.push(commandToUndo);
        if (this.undoStack.length > this.maxStackSize) {
          this.undoStack.shift();
        }

        // Clear redo stack (new action invalidates redo)
        this.redoStack = [];

        return {
          success: true,
          message: `Undid: ${commandToUndo.toolName}`,
          command: commandToUndo,
        };
      } else {
        return {
          success: false,
          message: `Failed to undo: ${undoResult.error}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error during undo: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(context: ToolExecutionContext): Promise<{
    success: boolean;
    message: string;
    command?: CommandHistoryEntry;
  }> {
    if (this.undoStack.length === 0) {
      return {
        success: false,
        message: 'No commands to redo',
      };
    }

    const commandToRedo = this.undoStack.pop()!;

    try {
      // Re-execute the original command
      const redoResult = await this.executor.execute(
        commandToRedo.toolName,
        commandToRedo.params,
        context
      );

      if (redoResult.success) {
        // Add to redo stack
        this.redoStack.push(commandToRedo);
        if (this.redoStack.length > this.maxStackSize) {
          this.redoStack.shift();
        }

        return {
          success: true,
          message: `Redid: ${commandToRedo.toolName}`,
          command: commandToRedo,
        };
      } else {
        // Put back on undo stack if redo failed
        this.undoStack.push(commandToRedo);
        return {
          success: false,
          message: `Failed to redo: ${redoResult.error}`,
        };
      }
    } catch (error) {
      // Put back on undo stack if error occurred
      this.undoStack.push(commandToRedo);
      return {
        success: false,
        message: `Error during redo: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Execute undo operation based on tool type
   */
  private async executeUndo(
    command: CommandHistoryEntry,
    context: ToolExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    const registry = getToolRegistry();
    const tool = registry.get(command.toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${command.toolName}' not found`,
      };
    }

    // Generate undo command based on tool type
    const undoCommand = this.generateUndoCommand(command);

    if (!undoCommand) {
      return {
        success: false,
        error: 'Cannot generate undo command',
      };
    }

    // Execute the undo command
    const result = await this.executor.execute(
      undoCommand.toolName,
      undoCommand.params,
      context,
      {
        validatePermissions: false, // Skip permission check for undo
        recordHistory: false, // Don't record undo in history
      }
    );

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Generate undo command for a given command
   */
  private generateUndoCommand(command: CommandHistoryEntry): {
    toolName: string;
    params: Record<string, any>;
  } | null {
    // Map tool names to their undo operations
    const undoMap: Record<string, (cmd: CommandHistoryEntry) => any> = {
      fs_write_file: (cmd) => {
        // Restore previous content
        if (cmd.stateBefore?.content !== undefined) {
          return {
            toolName: 'fs_write_file',
            params: {
              path: cmd.params.path,
              content: cmd.stateBefore.content,
              encoding: cmd.params.encoding,
            },
          };
        }
        return null;
      },
      fs_delete_file: (cmd) => {
        // Restore deleted file
        if (cmd.stateBefore?.content !== undefined) {
          return {
            toolName: 'fs_write_file',
            params: {
              path: cmd.params.path,
              content: cmd.stateBefore.content,
            },
          };
        }
        return null;
      },
      fs_copy_file: (cmd) => {
        // Delete the copied file
        return {
          toolName: 'fs_delete_file',
          params: {
            path: cmd.params.destination,
          },
        };
      },
      fs_move_file: (cmd) => {
        // Move back to original location
        return {
          toolName: 'fs_move_file',
          params: {
            source: cmd.params.destination,
            destination: cmd.params.source,
          },
        };
      },
      network_transfer_file: (cmd) => {
        // Transfer file back
        return {
          toolName: 'network_transfer_file',
          params: {
            sourcePath: cmd.params.destinationPath,
            destinationPath: cmd.params.sourcePath,
            sourcePeerId: cmd.params.destinationPeerId,
            destinationPeerId: cmd.params.sourcePeerId,
          },
        };
      },
    };

    const undoGenerator = undoMap[command.toolName];
    return undoGenerator ? undoGenerator(command) : null;
  }

  /**
   * Get undo stack
   */
  getUndoStack(): CommandHistoryEntry[] {
    return [...this.undoStack];
  }

  /**
   * Get redo stack
   */
  getRedoStack(): CommandHistoryEntry[] {
    return [...this.redoStack];
  }

  /**
   * Clear both stacks
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/**
 * Create an undo/redo manager
 */
export function createUndoRedoManager(
  executor: ToolExecutor,
  historyRecorder: CommandHistoryRecorder,
  maxStackSize?: number
): UndoRedoManager {
  return new UndoRedoManager(executor, historyRecorder, maxStackSize);
}
