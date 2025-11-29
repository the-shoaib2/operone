import { FormattedOutput, OutputFormat } from '../types';

/**
 * Output Engine
 * 
 * Formats responses for user display:
 * - Markdown formatting
 * - Code highlighting
 * - Error handling
 * - Streaming support
 */

interface OutputContext {
  content: any;
  format?: OutputFormat;
  error?: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class OutputEngine {
  /**
   * Formats output for user display
   */
  async format(context: OutputContext): Promise<FormattedOutput> {
    const format = context.format || this.detectFormat(context.content);
    
    let formattedContent: string;

    if (context.error) {
      formattedContent = this.formatError(context.errorMessage || 'Unknown error');
    } else {
      switch (format) {
        case 'markdown':
          formattedContent = this.formatMarkdown(context.content);
          break;
        
        case 'json':
          formattedContent = this.formatJson(context.content);
          break;
        
        case 'code':
          formattedContent = this.formatCode(context.content, context.metadata?.language);
          break;
        
        case 'stream':
          formattedContent = this.formatStream(context.content);
          break;
        
        case 'plain':
        default:
          formattedContent = this.formatPlain(context.content);
          break;
      }
    }

    return {
      format,
      content: formattedContent,
      metadata: context.metadata,
      error: context.error || false,
      errorMessage: context.errorMessage,
    };
  }

  /**
   * Detects the appropriate output format
   */
  private detectFormat(content: any): OutputFormat {
    if (typeof content === 'string') {
      // Check if it looks like code
      if (content.includes('function ') || content.includes('class ') || 
          content.includes('const ') || content.includes('import ')) {
        return 'code';
      }
      
      // Check if it looks like markdown
      if (content.includes('# ') || content.includes('## ') || 
          content.includes('```') || content.includes('- ')) {
        return 'markdown';
      }
      
      // Default to markdown for text content
      return 'markdown';
    }

    if (typeof content === 'object') {
      return 'json';
    }

    return 'markdown';
  }

  /**
   * Formats content as Markdown
   */
  private formatMarkdown(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item, index) => `${index + 1}. ${this.formatMarkdown(item)}`).join('\n');
    }

    if (typeof content === 'object') {
      let md = '';
      for (const [key, value] of Object.entries(content)) {
        md += `**${key}**: ${this.formatMarkdown(value)}\n\n`;
      }
      return md;
    }

    return String(content);
  }

  /**
   * Formats content as JSON
   */
  private formatJson(content: any): string {
    try {
      return JSON.stringify(content, null, 2);
    } catch (error) {
      return String(content);
    }
  }

  /**
   * Formats content as code
   */
  private formatCode(content: any, language?: string): string {
    const code = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const lang = language || this.detectLanguage(code);
    
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  }

  /**
   * Formats content for streaming
   */
  private formatStream(content: any): string {
    // For streaming, just return plain text
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  /**
   * Formats content as plain text
   */
  private formatPlain(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.join('\n');
    }

    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }

    return String(content);
  }

  /**
   * Formats error messages
   */
  private formatError(message: string): string {
    return `❌ **Error**\n\n${message}`;
  }

  /**
   * Detects programming language from code
   */
  private detectLanguage(code: string): string {
    if (code.includes('function ') || code.includes('const ') || code.includes('let ')) {
      if (code.includes('interface ') || code.includes(': ')) {
        return 'typescript';
      }
      return 'javascript';
    }

    if (code.includes('def ') || code.includes('import ') && code.includes('from ')) {
      return 'python';
    }

    if (code.includes('package ') || code.includes('func ')) {
      return 'go';
    }

    if (code.includes('fn ') || code.includes('let mut ')) {
      return 'rust';
    }

    if (code.includes('public class ') || code.includes('private ')) {
      return 'java';
    }

    return 'text';
  }

  /**
   * Formats a list of items
   */
  formatList(items: string[], ordered: boolean = false): string {
    if (ordered) {
      return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
    return items.map(item => `- ${item}`).join('\n');
  }

  /**
   * Formats a table
   */
  formatTable(headers: string[], rows: string[][]): string {
    let table = `| ${headers.join(' | ')} |\n`;
    table += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    for (const row of rows) {
      table += `| ${row.join(' | ')} |\n`;
    }
    
    return table;
  }

  /**
   * Formats a code block with syntax highlighting
   */
  formatCodeBlock(code: string, language: string): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * Formats a heading
   */
  formatHeading(text: string, level: number = 1): string {
    const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
    return `${hashes} ${text}`;
  }

  /**
   * Formats a blockquote
   */
  formatBlockquote(text: string): string {
    return text.split('\n').map(line => `> ${line}`).join('\n');
  }

  /**
   * Formats inline code
   */
  formatInlineCode(text: string): string {
    return `\`${text}\``;
  }

  /**
   * Formats bold text
   */
  formatBold(text: string): string {
    return `**${text}**`;
  }

  /**
   * Formats italic text
   */
  formatItalic(text: string): string {
    return `*${text}*`;
  }

  /**
   * Formats a link
   */
  formatLink(text: string, url: string): string {
    return `[${text}](${url})`;
  }
}

// Export singleton instance
export const outputEngine = new OutputEngine();

// Export factory
export function createOutputEngine(): OutputEngine {
  return new OutputEngine();
}
