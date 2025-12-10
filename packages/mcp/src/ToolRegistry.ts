import { Tool } from './Broker';

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: ToolParameter; // For arrays
  properties?: Record<string, ToolParameter>; // For objects
  required?: string[];
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private schemas: Map<string, ToolSchema> = new Map();

  private constructor() {
    this.registerDefaultSchemas();
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  registerSchema(schema: ToolSchema) {
    this.schemas.set(schema.name, schema);
  }

  getSchema(name: string): ToolSchema | undefined {
    return this.schemas.get(name);
  }

  getAllSchemas(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }

  // Generate OpenAI-compatible tool definitions
  getOpenAITools(): any[] {
    return Array.from(this.schemas.values()).map(schema => ({
      type: 'function',
      function: {
        name: schema.name,
        description: schema.description,
        parameters: schema.parameters
      }
    }));
  }

  private registerDefaultSchemas() {
    // File Operations
    this.registerSchema({
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' }
        },
        required: ['path']
      }
    });

    this.registerSchema({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Content to write' }
        },
        required: ['path', 'content']
      }
    });

    this.registerSchema({
      name: 'list_files',
      description: 'List files in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          recursive: { type: 'boolean', description: 'List recursively' }
        },
        required: ['path']
      }
    });

    // Shell Operations
    this.registerSchema({
      name: 'execute_command',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          timeout: { type: 'number', description: 'Timeout in milliseconds' }
        },
        required: ['command']
      }
    });

    // Network Operations
    this.registerSchema({
      name: 'list_peers',
      description: 'List all available network peers',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    });
  }
}

export const toolRegistry = ToolRegistry.getInstance();
