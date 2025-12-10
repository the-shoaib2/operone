import { MCPTool } from '@repo/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { permissionManager } from './PermissionManager.js';

const execAsync = promisify(exec);

export interface ShellToolArgs {
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ShellTool implements MCPTool {
  public readonly name = 'shell';
  public readonly description = 'Execute safe shell commands with restrictions';

  constructor() {}

  public async execute(args: Record<string, any>): Promise<ShellResult> {
    const { command, cwd, timeout = 5000 } = args as ShellToolArgs;

    // Use centralized PermissionManager for safety checks
    const validation = permissionManager.validateCommand(command);
    if (!validation.allowed) {
      throw new Error(`Command not allowed: ${validation.reason}`);
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout,
        maxBuffer: 1024 * 1024 // 1MB max output
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }


}
