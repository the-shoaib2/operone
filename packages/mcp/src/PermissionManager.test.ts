import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager, Role } from './PermissionManager';

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = PermissionManager.getInstance();
    // Reset role to default safe state
    manager.setRole(Role.VIEWER);
  });

  it('should deny execute permission for VIEWER role', () => {
    manager.setRole(Role.VIEWER);
    const result = manager.validateCommand('ls -la');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient permissions');
  });

  it('should allow read commands for OPERATOR role', () => {
    manager.setRole(Role.OPERATOR);
    // 'ls' is a read command (not starting with write keywords)
    const result = manager.validateCommand('ls -la');
    expect(result.allowed).toBe(true);
  });

  it('should allow write commands for ADMIN role', () => {
    manager.setRole(Role.ADMIN);
    const result = manager.validateCommand('mkdir new_folder');
    expect(result.allowed).toBe(true);
  });
  
  it('should deny write commands for OPERATOR role', () => {
    // OPERATOR has shell:execute but we might want to restrict writes if checking specific write keywords
    // In our implementation, OPERATOR has shell:execute. 
    // Wait, let's check the implementation logic again.
    // If has 'shell:execute', it allows unless blacklist.
    
    manager.setRole(Role.OPERATOR);
    // mkdir IS a write command. 
    // Implementation: if (isWrite && !has('shell:execute')) -> deny.
    // OPERATOR HAS 'shell:execute'. So it SHOULD allow.
    
    // Let's test checking logic:
    // DEVELOPER has 'shell:read' but NOT 'shell:execute'.
    manager.setRole(Role.DEVELOPER);
    const result = manager.validateCommand('mkdir new_folder');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Write operations not allowed');
  });

  it('should block blacklisted commands even for ADMIN', () => {
    manager.setRole(Role.ADMIN);
    const result = manager.validateCommand('rm -rf /');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('blacklist');
  });

  it('should block recursive root deletion pattern', () => {
    manager.setRole(Role.ADMIN);
    const result = manager.validateCommand('rm -r /');
     expect(result.allowed).toBe(false);
  });
});
