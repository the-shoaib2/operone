import { CommandClassifier, CommandClassification } from './command-classifier';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  command: string;
  classification: CommandClassification;
  allowed: boolean;
  executed: boolean;
  result?: {
    success: boolean;
    exitCode?: number;
    error?: string;
  };
}

/**
 * Command validator with pre-execution checks
 */
export class CommandValidator {
  private classifier: CommandClassifier;
  private auditLog: AuditLogEntry[] = [];

  constructor(
    private whitelist?: string[],
    private blacklist?: string[]
  ) {
    this.classifier = new CommandClassifier();
  }

  /**
   * Validate command before execution
   */
  async validate(
    command: string,
    userId: string,
    userPermissions: string[]
  ): Promise<{
    allowed: boolean;
    classification: CommandClassification;
    reason?: string;
  }> {
    // Classify the command
    const classification = this.classifier.classify(command);

    // Check if command is in blacklist or not in whitelist
    const isAllowed = this.classifier.isAllowed(command, this.whitelist, this.blacklist);

    if (!isAllowed) {
      await this.logAudit(userId, command, classification, false, false);
      return {
        allowed: false,
        classification,
        reason: 'Command is blacklisted or not in whitelist',
      };
    }

    // Check if command is dangerous
    if (classification.dangerous) {
      await this.logAudit(userId, command, classification, false, false);
      return {
        allowed: false,
        classification,
        reason: classification.reason || 'Command is classified as dangerous',
      };
    }

    // Check permissions based on command type
    const requiredPermission = this.getRequiredPermission(classification.type);
    if (!userPermissions.includes(requiredPermission)) {
      await this.logAudit(userId, command, classification, false, false);
      return {
        allowed: false,
        classification,
        reason: `User does not have required permission: ${requiredPermission}`,
      };
    }

    // Log successful validation
    await this.logAudit(userId, command, classification, true, false);

    return {
      allowed: true,
      classification,
    };
  }

  /**
   * Get required permission for command type
   */
  private getRequiredPermission(commandType: string): string {
    const permissionMap: Record<string, string> = {
      READ: 'shell:read',
      WRITE: 'shell:execute',
      EXECUTE: 'shell:execute',
      SYSTEM: 'system:admin',
      NETWORK: 'network:execute',
    };

    return permissionMap[commandType] || 'shell:execute';
  }

  /**
   * Log audit entry
   */
  private async logAudit(
    userId: string,
    command: string,
    classification: CommandClassification,
    allowed: boolean,
    executed: boolean
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      command,
      classification,
      allowed,
      executed,
    };

    this.auditLog.push(entry);

    // TODO: Persist to database
    // In production, this should write to a database or log file
  }

  /**
   * Record execution result
   */
  async recordExecution(
    auditId: string,
    result: {
      success: boolean;
      exitCode?: number;
      error?: string;
    }
  ): Promise<void> {
    const entry = this.auditLog.find(e => e.id === auditId);
    if (entry) {
      entry.executed = true;
      entry.result = result;
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    allowed?: boolean;
  }): AuditLogEntry[] {
    let filtered = [...this.auditLog];

    if (filters?.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters?.allowed !== undefined) {
      filtered = filtered.filter(e => e.allowed === filters.allowed);
    }

    return filtered;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

/**
 * Create a command validator instance
 */
export function createCommandValidator(
  whitelist?: string[],
  blacklist?: string[]
): CommandValidator {
  return new CommandValidator(whitelist, blacklist);
}
