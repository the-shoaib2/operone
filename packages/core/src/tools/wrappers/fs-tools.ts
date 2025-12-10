import { ToolDefinition, ToolExecutorFunction, ToolExecutionContext, ToolExecutionResult } from '../tool-schema';
import { FileSystem } from '@operone/fs';

const fs = new FileSystem();

/**
 * File system tool definitions and executors
 */

// Read File Tool
export const readFileTool: ToolDefinition = {
  name: 'fs_read_file',
  description: 'Read the contents of a file',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file to read',
      required: true,
    },
    {
      name: 'encoding',
      type: 'string',
      description: 'File encoding (default: utf8)',
      required: false,
      enum: ['utf8', 'ascii', 'base64', 'hex'],
    },
  ],
  requiredPermissions: ['file:read'],
  reversible: false,
  dangerous: false,
};

export const readFileExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    const content = await fs.readFile(params.path, params.encoding || 'utf8');
    return {
      success: true,
      data: { content, path: params.path },
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

// Write File Tool
export const writeFileTool: ToolDefinition = {
  name: 'fs_write_file',
  description: 'Write content to a file',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file to write',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write to the file',
      required: true,
    },
  ],
  requiredPermissions: ['file:write'],
  reversible: true,
  dangerous: false,
};

export const writeFileExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    // Capture state before for undo
    let stateBefore: any = undefined;
    const exists = await fs.exists(params.path);
    if (exists) {
      stateBefore = await fs.readFile(params.path);
    }

    await fs.writeFile(params.path, params.content);
    
    return {
      success: true,
      data: { path: params.path, bytesWritten: params.content.length },
      duration: Date.now() - startTime,
      metadata: {
        reversible: true,
        stateBefore,
        undoCommand: exists ? `fs_write_file(${params.path}, ${stateBefore})` : `fs_delete_file(${params.path})`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};

// List Directory Tool
export const listDirectoryTool: ToolDefinition = {
  name: 'fs_list_directory',
  description: 'List contents of a directory',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the directory to list',
      required: true,
    },
  ],
  requiredPermissions: ['file:read'],
  reversible: false,
  dangerous: false,
};

export const listDirectoryExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    const files = await fs.listDirectory(params.path);
    const filesWithStats = await Promise.all(
      files.map(async (file) => {
        const fullPath = `${params.path}/${file}`;
        const stats = await fs.getStats(fullPath);
        return {
          name: file,
          path: fullPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );

    return {
      success: true,
      data: { path: params.path, files: filesWithStats },
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

// Delete File Tool
export const deleteFileTool: ToolDefinition = {
  name: 'fs_delete_file',
  description: 'Delete a file or directory',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file or directory to delete',
      required: true,
    },
  ],
  requiredPermissions: ['file:delete'],
  reversible: true,
  dangerous: true,
};

export const deleteFileExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    // Capture state before for undo
    const stats = await fs.getStats(params.path);
    const isDirectory = stats.isDirectory();
    let stateBefore: any = undefined;

    if (!isDirectory) {
      stateBefore = await fs.readFile(params.path);
    }

    await fs.deleteFile(params.path);
    
    return {
      success: true,
      data: { path: params.path, deleted: true },
      duration: Date.now() - startTime,
      metadata: {
        reversible: !isDirectory,
        stateBefore: isDirectory ? undefined : stateBefore,
        undoCommand: isDirectory ? undefined : `fs_write_file(${params.path}, ${stateBefore})`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};

// Search Files Tool
export const searchFilesTool: ToolDefinition = {
  name: 'fs_search_files',
  description: 'Search for files matching a pattern',
  category: 'file',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'Glob pattern to match files',
      required: true,
    },
    {
      name: 'cwd',
      type: 'string',
      description: 'Working directory for search (default: current directory)',
      required: false,
    },
  ],
  requiredPermissions: ['file:read'],
  reversible: false,
  dangerous: false,
};

export const searchFilesExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    const files = await fs.findFiles(params.pattern, { cwd: params.cwd });
    return {
      success: true,
      data: { pattern: params.pattern, files, count: files.length },
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

// Copy File Tool
export const copyFileTool: ToolDefinition = {
  name: 'fs_copy_file',
  description: 'Copy a file or directory',
  category: 'file',
  parameters: [
    {
      name: 'source',
      type: 'string',
      description: 'Source path',
      required: true,
    },
    {
      name: 'destination',
      type: 'string',
      description: 'Destination path',
      required: true,
    },
  ],
  requiredPermissions: ['file:read', 'file:write'],
  reversible: true,
  dangerous: false,
};

export const copyFileExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    await fs.copy(params.source, params.destination);
    return {
      success: true,
      data: { source: params.source, destination: params.destination },
      duration: Date.now() - startTime,
      metadata: {
        reversible: true,
        undoCommand: `fs_delete_file(${params.destination})`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};

// Move File Tool
export const moveFileTool: ToolDefinition = {
  name: 'fs_move_file',
  description: 'Move or rename a file or directory',
  category: 'file',
  parameters: [
    {
      name: 'source',
      type: 'string',
      description: 'Source path',
      required: true,
    },
    {
      name: 'destination',
      type: 'string',
      description: 'Destination path',
      required: true,
    },
  ],
  requiredPermissions: ['file:read', 'file:write'],
  reversible: true,
  dangerous: false,
};

export const moveFileExecutor: ToolExecutorFunction = async (params, context) => {
  const startTime = Date.now();
  try {
    await fs.move(params.source, params.destination);
    return {
      success: true,
      data: { source: params.source, destination: params.destination },
      duration: Date.now() - startTime,
      metadata: {
        reversible: true,
        undoCommand: `fs_move_file(${params.destination}, ${params.source})`,
      },
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
 * Get all file system tools
 */
export function getFileSystemTools(): Array<{ definition: ToolDefinition; executor: ToolExecutorFunction }> {
  return [
    { definition: readFileTool, executor: readFileExecutor },
    { definition: writeFileTool, executor: writeFileExecutor },
    { definition: listDirectoryTool, executor: listDirectoryExecutor },
    { definition: deleteFileTool, executor: deleteFileExecutor },
    { definition: searchFilesTool, executor: searchFilesExecutor },
    { definition: copyFileTool, executor: copyFileExecutor },
    { definition: moveFileTool, executor: moveFileExecutor },
  ];
}
