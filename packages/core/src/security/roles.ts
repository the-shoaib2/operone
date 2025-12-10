/**
 * Role definitions for permission system
 */
export enum Role {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

/**
 * Permission categories
 */
export enum PermissionCategory {
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  FILE_DELETE = 'file:delete',
  SHELL_EXECUTE = 'shell:execute',
  SHELL_READ = 'shell:read',
  NETWORK_DISCOVER = 'network:discover',
  NETWORK_READ = 'network:read',
  NETWORK_TRANSFER = 'network:transfer',
  NETWORK_EXECUTE = 'network:execute',
  NETWORK_MANAGE = 'network:manage',
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  SYSTEM_ADMIN = 'system:admin',
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<Role, PermissionCategory[]> = {
  [Role.ADMIN]: [
    // All permissions
    PermissionCategory.FILE_READ,
    PermissionCategory.FILE_WRITE,
    PermissionCategory.FILE_DELETE,
    PermissionCategory.SHELL_EXECUTE,
    PermissionCategory.SHELL_READ,
    PermissionCategory.NETWORK_DISCOVER,
    PermissionCategory.NETWORK_READ,
    PermissionCategory.NETWORK_TRANSFER,
    PermissionCategory.NETWORK_EXECUTE,
    PermissionCategory.NETWORK_MANAGE,
    PermissionCategory.SYSTEM_READ,
    PermissionCategory.SYSTEM_WRITE,
    PermissionCategory.SYSTEM_ADMIN,
  ],
  [Role.DEVELOPER]: [
    PermissionCategory.FILE_READ,
    PermissionCategory.FILE_WRITE,
    PermissionCategory.SHELL_READ,
    PermissionCategory.SHELL_EXECUTE,
    PermissionCategory.NETWORK_DISCOVER,
    PermissionCategory.NETWORK_READ,
    PermissionCategory.SYSTEM_READ,
  ],
  [Role.OPERATOR]: [
    PermissionCategory.FILE_READ,
    PermissionCategory.SHELL_EXECUTE,
    PermissionCategory.NETWORK_DISCOVER,
    PermissionCategory.NETWORK_READ,
    PermissionCategory.NETWORK_TRANSFER,
    PermissionCategory.NETWORK_MANAGE,
    PermissionCategory.SYSTEM_READ,
  ],
  [Role.VIEWER]: [
    PermissionCategory.FILE_READ,
    PermissionCategory.SHELL_READ,
    PermissionCategory.NETWORK_DISCOVER,
    PermissionCategory.NETWORK_READ,
    PermissionCategory.SYSTEM_READ,
  ],
};

/**
 * User with role and permissions
 */
export interface User {
  id: string;
  username: string;
  role: Role;
  customPermissions?: PermissionCategory[];
}

/**
 * Get permissions for a user
 */
export function getUserPermissions(user: User): string[] {
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  const customPermissions = user.customPermissions || [];
  
  // Combine role permissions with custom permissions
  const allPermissions = new Set([...rolePermissions, ...customPermissions]);
  
  return Array.from(allPermissions);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User, permission: string): boolean {
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(user: User, requiredPermissions: string[]): boolean {
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: User, requiredPermissions: string[]): boolean {
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}
