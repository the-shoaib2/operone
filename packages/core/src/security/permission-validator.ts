import { User, hasAllPermissions } from './roles';

/**
 * User permission validator implementation
 */
export class UserPermissionValidator {
  /**
   * Validate if user has required permissions
   */
  async validate(userId: string, requiredPermissions: string[]): Promise<boolean> {
    // Get user from storage/database
    const user = await this.getUser(userId);
    
    if (!user) {
      return false;
    }

    // Check if user has all required permissions
    return hasAllPermissions(user, requiredPermissions);
  }

  /**
   * Get user by ID (placeholder - implement with actual user storage)
   */
  private async getUser(userId: string): Promise<User | null> {
    // TODO: Implement actual user retrieval from database
    // For now, return a mock user for testing
    return {
      id: userId,
      username: 'test-user',
      role: 'DEVELOPER' as any,
    };
  }

  /**
   * Validate and throw error if permissions are insufficient
   */
  async validateOrThrow(userId: string, requiredPermissions: string[]): Promise<void> {
    const hasPermission = await this.validate(userId, requiredPermissions);
    
    if (!hasPermission) {
      throw new Error(
        `User ${userId} does not have required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }
}

/**
 * Create a user permission validator instance
 */
export function createUserPermissionValidator(): UserPermissionValidator {
  return new UserPermissionValidator();
}
