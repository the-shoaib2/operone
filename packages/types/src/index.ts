export interface Agent {
  id: string;
  name: string;
  role: 'os' | 'assistant';
  think(input: string): Promise<string>;
  act(action: string): Promise<void>;
  observe(): Promise<string>;
}

export interface Memory {
  shortTerm: string[];
  longTerm: {
    query(text: string): Promise<string[]>;
    store(text: string): Promise<void>;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  execute(args: Record<string, any>): Promise<any>;
}
