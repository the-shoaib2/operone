import { ModelProvider } from '../model-provider';
import { generateText } from 'ai';
import { EventBus } from '../core/EventBus';
import { OS_AGENT_SYSTEM_PROMPT } from '../prompts/os-agent';

export interface OSAgentOptions {
  provider: ModelProvider;
  eventBus?: EventBus;
}

/**
 * OSAgent - Operating System interaction agent
 * Handles OS-level operations and system commands
 */
export class OSAgent {
  private provider: ModelProvider;
  private eventBus: EventBus;

  constructor(options: OSAgentOptions | ModelProvider) {
    // Support both old and new constructor signatures
    if (options instanceof ModelProvider) {
      this.provider = options;
      this.eventBus = EventBus.getInstance();
    } else {
      this.provider = options.provider;
      this.eventBus = options.eventBus || EventBus.getInstance();
    }
  }

  /**
   * Execute an OS command (simulated for now)
   * In a real implementation, this would use @operone/shell or similar
   */
  async execute(command: string): Promise<string> {
    try {
      this.eventBus.publish('agent', 'os-command', { command });
      
      // Simulated execution - in production this would use @operone/shell
      // or be executed via IPC in the Electron main process
      return `Simulated execution of command: ${command}`;
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  /**
   * Analyze a user request and determine what OS operations are needed
   */
  async analyzeRequest(request: string): Promise<{
    intent: string;
    commands: string[];
    explanation: string;
  }> {
    try {
      const model = this.provider.getModel();
      
      const { text } = await generateText({
        model,
        messages: [
          { role: 'system', content: OS_AGENT_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Analyze this request and determine what OS operations are needed:\n\n${request}\n\nRespond in JSON format with: { "intent": "...", "commands": ["..."], "explanation": "..." }`
          }
        ],
      });

      // Parse the JSON response
      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch {
        // If parsing fails, return a default structure
        return {
          intent: 'unknown',
          commands: [],
          explanation: text
        };
      }
    } catch (error) {
      console.error('Error analyzing request:', error);
      throw error;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<{
    platform: string;
    arch: string;
    version: string;
  }> {
    // This would be implemented with actual system calls
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version
    };
  }
}
