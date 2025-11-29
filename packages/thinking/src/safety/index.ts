import { SafetyCheck, RiskLevel, ExecutionPlan, TaskStep, ToolType } from '../types';

/**
 * Safety Engine
 * 
 * Validates execution plans for safety:
 * - Checks for destructive operations
 * - Validates file paths and permissions
 * - Detects potential security risks
 * - Requires user confirmation for high-risk operations
 */

interface SafetyConfig {
  allowDestructiveOps: boolean;
  requireConfirmationThreshold: RiskLevel;
  blockedTools: ToolType[];
  allowedPaths?: string[];
  blockedPaths?: string[];
}

const DEFAULT_CONFIG: SafetyConfig = {
  allowDestructiveOps: false,
  requireConfirmationThreshold: 'medium',
  blockedTools: [],
  blockedPaths: [
    '/System',
    '/usr/bin',
    '/bin',
    '/sbin',
    'C:\\Windows\\System32',
    'C:\\Windows\\SysWOW64',
  ],
};

export class SafetyEngine {
  private config: SafetyConfig;

  constructor(config: Partial<SafetyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validates an execution plan for safety
   */
  async validate(plan: ExecutionPlan): Promise<SafetyCheck> {
    const risks: string[] = [];
    let maxRiskLevel: RiskLevel = 'safe';
    let requiresConfirmation = false;
    const blockedReasons: string[] = [];

    for (const step of plan.steps) {
      const stepCheck = this.validateStep(step);
      
      // Accumulate risks
      risks.push(...stepCheck.risks);
      
      // Update max risk level
      if (this.getRiskValue(stepCheck.riskLevel) > this.getRiskValue(maxRiskLevel)) {
        maxRiskLevel = stepCheck.riskLevel;
      }
      
      // Check if blocked
      if (!stepCheck.allowed) {
        blockedReasons.push(...(stepCheck.blockedReasons || []));
      }
      
      // Check if requires confirmation
      if (stepCheck.requiresConfirmation) {
        requiresConfirmation = true;
      }
    }

    // Determine if plan is allowed
    const allowed = blockedReasons.length === 0;

    // Check if confirmation is required based on risk level
    if (this.getRiskValue(maxRiskLevel) >= this.getRiskValue(this.config.requireConfirmationThreshold)) {
      requiresConfirmation = true;
    }

    return {
      allowed,
      riskLevel: maxRiskLevel,
      risks: [...new Set(risks)], // Remove duplicates
      requiresConfirmation,
      confirmationMessage: requiresConfirmation
        ? this.generateConfirmationMessage(plan, risks, maxRiskLevel)
        : undefined,
      blockedReasons: blockedReasons.length > 0 ? blockedReasons : undefined,
    };
  }

  /**
   * Validates a single task step
   */
  private validateStep(step: TaskStep): SafetyCheck {
    const risks: string[] = [];
    let riskLevel: RiskLevel = 'safe';
    const blockedReasons: string[] = [];

    // Check if tool is blocked
    if (this.config.blockedTools.includes(step.tool)) {
      blockedReasons.push(`Tool '${step.tool}' is blocked by safety policy`);
      return {
        allowed: false,
        riskLevel: 'critical',
        risks: [`Blocked tool: ${step.tool}`],
        requiresConfirmation: false,
        blockedReasons,
      };
    }

    // Tool-specific safety checks
    switch (step.tool) {
      case 'fs':
        return this.validateFileSystemStep(step);
      
      case 'shell':
        return this.validateShellStep(step);
      
      case 'networking':
        return this.validateNetworkingStep(step);
      
      case 'peer':
        return this.validatePeerStep(step);
      
      case 'automation':
        return this.validateAutomationStep(step);
      
      default:
        return {
          allowed: true,
          riskLevel: 'low',
          risks: [],
          requiresConfirmation: false,
        };
    }
  }

  /**
   * Validates file system operations
   */
  private validateFileSystemStep(step: TaskStep): SafetyCheck {
    const risks: string[] = [];
    let riskLevel: RiskLevel = 'safe';
    const blockedReasons: string[] = [];
    const path = step.parameters.path as string;

    // Check for blocked paths
    if (path && this.isBlockedPath(path)) {
      blockedReasons.push(`Path '${path}' is in a protected system directory`);
      return {
        allowed: false,
        riskLevel: 'critical',
        risks: [`Blocked path: ${path}`],
        requiresConfirmation: false,
        blockedReasons,
      };
    }

    // Check operation type
    const operation = step.parameters.operation as string;
    
    if (operation === 'write' || operation === 'delete') {
      riskLevel = 'medium';
      risks.push(`File ${operation} operation`);
      
      if (!this.config.allowDestructiveOps && operation === 'delete') {
        blockedReasons.push('Destructive operations are not allowed');
        return {
          allowed: false,
          riskLevel: 'high',
          risks,
          requiresConfirmation: false,
          blockedReasons,
        };
      }
    }

    // Check for wildcard operations
    if (path && (path.includes('*') || path.includes('?'))) {
      riskLevel = 'high';
      risks.push('Wildcard file operation');
    }

    return {
      allowed: true,
      riskLevel,
      risks,
      requiresConfirmation: this.getRiskValue(riskLevel) >= this.getRiskValue('high'),
    };
  }

  /**
   * Validates shell command execution
   */
  private validateShellStep(step: TaskStep): SafetyCheck {
    const risks: string[] = [];
    let riskLevel: RiskLevel = 'medium'; // Shell commands are inherently risky
    const blockedReasons: string[] = [];
    const command = (step.parameters.command as string || '').toLowerCase();

    // Check for dangerous commands
    const dangerousCommands = ['rm -rf', 'dd', 'mkfs', 'format', ':(){:|:&};:', 'chmod 777'];
    for (const dangerous of dangerousCommands) {
      if (command.includes(dangerous)) {
        blockedReasons.push(`Dangerous command detected: ${dangerous}`);
        return {
          allowed: false,
          riskLevel: 'critical',
          risks: [`Blocked dangerous command: ${dangerous}`],
          requiresConfirmation: false,
          blockedReasons,
        };
      }
    }

    // Check for sudo/elevated privileges
    if (command.includes('sudo') || command.includes('su ')) {
      riskLevel = 'high';
      risks.push('Command requires elevated privileges');
    }

    // Check for system modification
    if (command.match(/apt|yum|brew|npm install -g|pip install/)) {
      riskLevel = 'high';
      risks.push('System package installation');
    }

    return {
      allowed: true,
      riskLevel,
      risks,
      requiresConfirmation: true, // Always require confirmation for shell commands
    };
  }

  /**
   * Validates networking operations
   */
  private validateNetworkingStep(step: TaskStep): SafetyCheck {
    const risks: string[] = [];
    let riskLevel: RiskLevel = 'low';
    const url = step.parameters.url as string;

    // Check for localhost/internal IPs
    if (url && (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.'))) {
      riskLevel = 'medium';
      risks.push('Request to internal/local network');
    }

    // Check for non-HTTPS
    if (url && url.startsWith('http://') && !url.includes('localhost')) {
      riskLevel = 'medium';
      risks.push('Unencrypted HTTP request');
    }

    return {
      allowed: true,
      riskLevel,
      risks,
      requiresConfirmation: this.getRiskValue(riskLevel) >= this.getRiskValue('high'),
    };
  }

  /**
   * Validates peer-to-peer operations
   */
  private validatePeerStep(step: TaskStep): SafetyCheck {
    return {
      allowed: true,
      riskLevel: 'high', // Multi-PC operations are high risk
      risks: ['Remote command execution on peer machine'],
      requiresConfirmation: true, // Always require confirmation
    };
  }

  /**
   * Validates automation operations
   */
  private validateAutomationStep(step: TaskStep): SafetyCheck {
    return {
      allowed: true,
      riskLevel: 'medium',
      risks: ['Automated task execution'],
      requiresConfirmation: true,
    };
  }

  /**
   * Checks if a path is in the blocked list
   */
  private isBlockedPath(path: string): boolean {
    if (!this.config.blockedPaths) return false;
    
    return this.config.blockedPaths.some(blocked =>
      path.startsWith(blocked) || path.includes(blocked)
    );
  }

  /**
   * Converts risk level to numeric value for comparison
   */
  private getRiskValue(level: RiskLevel): number {
    const values: Record<RiskLevel, number> = {
      safe: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return values[level];
  }

  /**
   * Generates a confirmation message for the user
   */
  private generateConfirmationMessage(
    plan: ExecutionPlan,
    risks: string[],
    riskLevel: RiskLevel
  ): string {
    const riskList = risks.map(r => `  - ${r}`).join('\n');
    
    return `⚠️ This operation has been flagged as ${riskLevel.toUpperCase()} risk.\n\n` +
           `Risks identified:\n${riskList}\n\n` +
           `Plan includes ${plan.steps.length} step(s):\n` +
           plan.steps.map((s, i) => `  ${i + 1}. ${s.description} (${s.tool})`).join('\n') +
           `\n\nDo you want to proceed?`;
  }
}

// Export singleton instance
export const safetyEngine = new SafetyEngine();

// Export factory
export function createSafetyEngine(config?: Partial<SafetyConfig>): SafetyEngine {
  return new SafetyEngine(config);
}
