/**
 * Command classification types
 */
export enum CommandType {
  READ = 'READ',
  WRITE = 'WRITE',
  EXECUTE = 'EXECUTE',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
}

/**
 * Command risk level
 */
export enum RiskLevel {
  SAFE = 'SAFE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Command classification result
 */
export interface CommandClassification {
  type: CommandType;
  riskLevel: RiskLevel;
  dangerous: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/**
 * Dangerous command patterns (blacklist)
 */
const DANGEROUS_PATTERNS = [
  // Destructive file operations
  /rm\s+-rf\s+\//,
  /rm\s+-fr\s+\//,
  /dd\s+if=\/dev\/zero/,
  /dd\s+if=\/dev\/random/,
  /mkfs\./,
  /format\s+[a-zA-Z]:/,
  
  // Fork bombs
  /:\(\)\s*{\s*:\|:&\s*};:/,
  /\$\(:\)\s*{\s*:\|:&\s*};:/,
  
  // System modification
  /chmod\s+-R\s+777/,
  /chown\s+-R\s+root/,
  
  // Network attacks
  /nc\s+.*-e/,
  /ncat\s+.*-e/,
  /wget\s+.*\|\s*sh/,
  /curl\s+.*\|\s*sh/,
  /curl\s+.*\|\s*bash/,
  
  // Privilege escalation
  /sudo\s+su/,
  /sudo\s+.*passwd/,
];

/**
 * Read-only command patterns (whitelist)
 */
const READ_PATTERNS = [
  /^ls\s/,
  /^cat\s/,
  /^head\s/,
  /^tail\s/,
  /^grep\s/,
  /^find\s/,
  /^locate\s/,
  /^which\s/,
  /^whereis\s/,
  /^pwd$/,
  /^echo\s/,
  /^date$/,
  /^whoami$/,
  /^hostname$/,
  /^uname\s/,
  /^df\s/,
  /^du\s/,
  /^ps\s/,
  /^top$/,
  /^htop$/,
];

/**
 * Write command patterns
 */
const WRITE_PATTERNS = [
  /^touch\s/,
  /^mkdir\s/,
  /^cp\s/,
  /^mv\s/,
  /^rm\s/,
  /^rmdir\s/,
  /^nano\s/,
  /^vim\s/,
  /^vi\s/,
  /^emacs\s/,
  /^>\s/,
  /^>>\s/,
];

/**
 * System command patterns
 */
const SYSTEM_PATTERNS = [
  /^sudo\s/,
  /^su\s/,
  /^systemctl\s/,
  /^service\s/,
  /^apt\s/,
  /^apt-get\s/,
  /^yum\s/,
  /^dnf\s/,
  /^brew\s/,
  /^npm\s+install/,
  /^yarn\s+add/,
  /^pnpm\s+add/,
  /^pip\s+install/,
];

/**
 * Network command patterns
 */
const NETWORK_PATTERNS = [
  /^ping\s/,
  /^curl\s/,
  /^wget\s/,
  /^ssh\s/,
  /^scp\s/,
  /^rsync\s/,
  /^nc\s/,
  /^ncat\s/,
  /^telnet\s/,
  /^ftp\s/,
  /^sftp\s/,
];

/**
 * Command classifier
 */
export class CommandClassifier {
  /**
   * Classify a shell command
   */
  classify(command: string): CommandClassification {
    const trimmedCommand = command.trim();

    // Check for dangerous patterns first
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedCommand)) {
        return {
          type: CommandType.SYSTEM,
          riskLevel: RiskLevel.CRITICAL,
          dangerous: true,
          requiresConfirmation: true,
          reason: 'Command matches dangerous pattern and could cause system damage',
        };
      }
    }

    // Classify by type
    let type = CommandType.EXECUTE;
    let riskLevel = RiskLevel.MEDIUM;

    if (READ_PATTERNS.some(p => p.test(trimmedCommand))) {
      type = CommandType.READ;
      riskLevel = RiskLevel.SAFE;
    } else if (WRITE_PATTERNS.some(p => p.test(trimmedCommand))) {
      type = CommandType.WRITE;
      riskLevel = RiskLevel.LOW;
    } else if (SYSTEM_PATTERNS.some(p => p.test(trimmedCommand))) {
      type = CommandType.SYSTEM;
      riskLevel = RiskLevel.HIGH;
    } else if (NETWORK_PATTERNS.some(p => p.test(trimmedCommand))) {
      type = CommandType.NETWORK;
      riskLevel = RiskLevel.MEDIUM;
    }

    // Determine if confirmation is required and if dangerous
    const requiresConfirmation = riskLevel === RiskLevel.HIGH;
    const dangerous = false; // Already checked for critical patterns above

    return {
      type,
      riskLevel,
      dangerous,
      requiresConfirmation,
    };
  }

  /**
   * Check if command is allowed based on whitelist/blacklist
   */
  isAllowed(command: string, whitelist?: string[], blacklist?: string[]): boolean {
    const trimmedCommand = command.trim();

    // Check blacklist first
    if (blacklist && blacklist.length > 0) {
      for (const pattern of blacklist) {
        if (new RegExp(pattern).test(trimmedCommand)) {
          return false;
        }
      }
    }

    // If whitelist is provided, command must match
    if (whitelist && whitelist.length > 0) {
      return whitelist.some(pattern => new RegExp(pattern).test(trimmedCommand));
    }

    // If no whitelist, check if it's not dangerous
    const classification = this.classify(trimmedCommand);
    return !classification.dangerous;
  }

  /**
   * Get risk score (0-100)
   */
  getRiskScore(command: string): number {
    const classification = this.classify(command);
    
    const riskScores: Record<RiskLevel, number> = {
      [RiskLevel.SAFE]: 0,
      [RiskLevel.LOW]: 25,
      [RiskLevel.MEDIUM]: 50,
      [RiskLevel.HIGH]: 75,
      [RiskLevel.CRITICAL]: 100,
    };

    return riskScores[classification.riskLevel];
  }
}

/**
 * Create a command classifier instance
 */
export function createCommandClassifier(): CommandClassifier {
  return new CommandClassifier();
}
