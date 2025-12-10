import { z } from 'zod';

/**
 * Tool parameter schema definition
 */
export const ToolParameterSchema: z.ZodType<any> = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
  items: z.lazy((): z.ZodType<any> => ToolParameterSchema).optional(), // For array types
  properties: z.record(z.lazy((): z.ZodType<any> => ToolParameterSchema)).optional(), // For object types
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

/**
 * Tool definition schema
 */
export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(['file', 'shell', 'network', 'ai', 'system', 'data', 'task']),
  parameters: z.array(ToolParameterSchema),
  requiredPermissions: z.array(z.string()),
  reversible: z.boolean().default(false),
  dangerous: z.boolean().default(false),
  peerRequired: z.boolean().default(false).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  userId: string;
  peerId?: string;
  permissions: string[];
  sessionId: string;
  timestamp: Date;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  metadata?: {
    reversible?: boolean;
    undoCommand?: string;
    stateBefore?: any;
    stateAfter?: any;
  };
}

/**
 * Tool executor function type
 */
export type ToolExecutorFunction = (
  params: Record<string, any>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

/**
 * Registered tool with executor
 */
export interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutorFunction;
}

/**
 * Convert tool definition to OpenAI function format
 */
export function toOpenAIFunction(tool: ToolDefinition): any {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
        };
        return acc;
      }, {} as Record<string, any>),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  };
}

/**
 * Convert tool definition to Anthropic tool format
 */
export function toAnthropicTool(tool: ToolDefinition): any {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
        };
        return acc;
      }, {} as Record<string, any>),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  };
}

/**
 * Convert tool definition to generic JSON schema
 */
export function toJSONSchema(tool: ToolDefinition): any {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category,
    parameters: {
      type: 'object',
      properties: tool.parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
          ...(param.items && { items: param.items }),
          ...(param.properties && { properties: param.properties }),
        };
        return acc;
      }, {} as Record<string, any>),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
    permissions: tool.requiredPermissions,
    reversible: tool.reversible,
    dangerous: tool.dangerous,
  };
}
