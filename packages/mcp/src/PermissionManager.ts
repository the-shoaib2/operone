export type PermissionType = 
  | 'shell:execute' 
  | 'shell:read' 
  | 'file:read' 
  | 'file:write' 
  | 'file:delete' 
  | 'network:connect' 
  | 'system:manage';

export enum Role {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

const ROLE_PERMISSIONS: Record<Role, PermissionType[]> = {
  [Role.ADMIN]: [
    'shell:execute', 'shell:read', 
    'file:read', 'file:write', 'file:delete', 
    'network:connect', 'system:manage'
  ],
  [Role.DEVELOPER]: [
    'shell:read', 
    'file:read', 'file:write', 
    'network:connect'
  ],
  [Role.OPERATOR]: [
    'shell:execute', 'shell:read', 
    'file:read', 
    'network:connect'
  ],
  [Role.VIEWER]: [
    'file:read'
  ],
};

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  ':(){ :|:& };:',
  'mkfs',
  'dd if=/dev/zero',
  '> /dev/sda',
  'mv / /dev/null',
  'shutdown',
  'reboot',
  'init 0',
  'chmod -R 777 /'
];

export class PermissionManager {
  private static instance: PermissionManager;
  private currentRole: Role = Role.VIEWER; // Default to safe role

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  setRole(role: Role) {
    this.currentRole = role;
  }

  getRole(): Role {
    return this.currentRole;
  }

  hasPermission(permission: PermissionType): boolean {
    const permissions = ROLE_PERMISSIONS[this.currentRole];
    return permissions.includes(permission);
  }

  /**
   * Check if a shell command is safe to execute
   */
  validateCommand(command: string): { allowed: boolean; reason?: string } {
    if (!this.hasPermission('shell:execute') && !this.hasPermission('shell:read')) {
      return { allowed: false, reason: 'Insufficient permissions to execute shell commands' };
    }

    // Check against blacklist
    for (const dangerous of DANGEROUS_COMMANDS) {
      if (command.includes(dangerous)) {
        return { allowed: false, reason: `Command blocked by blacklist: ${dangerous}` };
      }
    }

    // Pattern matching for specific dangerous patterns
    if (/\brm\s+-[rRf]+.*\/$/.test(command)) { // rm -rf ending in slash
       return { allowed: false, reason: 'Recursive root deletion blocked' };
    }
    
    // Categorize command -> requires WRITE vs READ
    const isWrite = this.isWriteCommand(command);
    if (isWrite && !this.hasPermission('shell:execute')) { // Assuming shell:execute implies write permission
        return { allowed: false, reason: 'Write operations not allowed for this role' };
    }

    return { allowed: true };
  }

  private isWriteCommand(command: string): boolean {
    const writeCmds = ['rm', 'mv', 'cp', 'mkdir', 'touch', 'echo >', 'nano', 'vi', 'vim', 'chmod', 'chown'];
    return writeCmds.some(cmd => command.trim().startsWith(cmd) || command.includes(` ${cmd} `));
  }
}

export const permissionManager = PermissionManager.getInstance();
