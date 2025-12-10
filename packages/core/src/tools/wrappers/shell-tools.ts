import { ToolDefinition, ToolExecutorFunction, ToolExecutionContext, ToolExecutionResult } from '../tool-schema';
import { ShellExecutor } from '@operone/shell';

const shell = new ShellExecutor();

/**
 * Shell tool definitions and executors
 */

// Execute Command Tool
export const executeCommandTool: ToolDefinition = {
  name: 'shell_execute',
  description: 'Execute a shell command',
  category: 'shell',
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'Command to execute',
      required: true,
    },
    {
      name: 'args',
      type: 'array',
      description: 'Command arguments',
      required: false,
      items: {
        name: 'arg',
        type: 'string',
        description: 'Command argument',
        required: false,
      },
    },
    {
      name: 'cwd',
      type: 'string',
      description: 'Working directory',
      required: false,
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Execution timeout in milliseconds',
      required: false,
    },
  ],
  requiredPermissions: ['shell:execute'],
  reversible: false,
  dangerous: true,
};

export const executeCommandExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    const result = await shell.execute(
      params.command,
      params.args || [],
      {
        cwd: params.cwd,
        timeout: params.timeout,
      }
    );

    return {
      success: result.exitCode === 0,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command: result.command,
      },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};

// Execute with Streaming Tool
export const executeStreamTool: ToolDefinition = {
  name: 'shell_execute_stream',
  description: 'Execute a shell command with streaming output',
  category: 'shell',
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'Command to execute',
      required: true,
    },
    {
      name: 'args',
      type: 'array',
      description: 'Command arguments',
      required: false,
      items: {
        name: 'arg',
        type: 'string',
        description: 'Command argument',
        required: false,
      },
    },
    {
      name: 'cwd',
      type: 'string',
      description: 'Working directory',
      required: false,
    },
  ],
  requiredPermissions: ['shell:execute'],
  reversible: false,
  dangerous: true,
};

export const executeStreamExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  const output: string[] = [];

  try {
    const result = await shell.executeStream(
      params.command,
      params.args || [],
      (data) => {
        output.push(data);
        // In a real implementation, this would stream to the client
      },
      {
        cwd: params.cwd,
      }
    );

    return {
      success: result.exitCode === 0,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command: result.command,
        streamedOutput: output,
      },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};

/**
 * Get all shell tools
 */
export function getShellTools(): Array<{ definition: ToolDefinition; executor: ToolExecutorFunction }> {
  return [
    { definition: executeCommandTool, executor: executeCommandExecutor },
    { definition: executeStreamTool, executor: executeStreamExecutor },
  ];
}
