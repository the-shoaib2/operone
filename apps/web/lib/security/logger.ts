/**
 * Security Event Logger
 * Structured logging for security events and monitoring
 */

export enum SecurityEventType {
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  TOKEN_VALIDATION_SUCCESS = 'TOKEN_VALIDATION_SUCCESS',
  TOKEN_VALIDATION_FAILED = 'TOKEN_VALIDATION_FAILED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface SecurityEvent {
  type: SecurityEventType
  level: LogLevel
  message: string
  metadata?: Record<string, unknown>
  timestamp: Date
  ip?: string
  userAgent?: string
  userId?: string
  path?: string
}

class SecurityLogger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Log a security event
   */
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    }

    // In development, log to console with formatting
    if (this.isDevelopment) {
      this.logToConsole(fullEvent)
    } else {
      // In production, log as JSON for log aggregation services
      this.logAsJson(fullEvent)
    }

    // For critical events, you might want to send alerts
    if (event.level === LogLevel.CRITICAL) {
      this.handleCriticalEvent(fullEvent)
    }
  }

  /**
   * Log authentication success
   */
  logAuthSuccess(userId: string, ip?: string, userAgent?: string): void {
    this.log({
      type: SecurityEventType.AUTH_SUCCESS,
      level: LogLevel.INFO,
      message: `User ${userId} authenticated successfully`,
      userId,
      ip,
      userAgent,
    })
  }

  /**
   * Log authentication failure
   */
  logAuthFailure(reason: string, ip?: string, userAgent?: string): void {
    this.log({
      type: SecurityEventType.AUTH_FAILURE,
      level: LogLevel.WARN,
      message: `Authentication failed: ${reason}`,
      ip,
      userAgent,
      metadata: { reason },
    })
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(identifier: string, path: string, ip?: string): void {
    this.log({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      level: LogLevel.WARN,
      message: `Rate limit exceeded for ${identifier}`,
      path,
      ip,
      metadata: { identifier },
    })
  }

  /**
   * Log CSRF validation failure
   */
  logCsrfFailure(path: string, ip?: string, userAgent?: string): void {
    this.log({
      type: SecurityEventType.CSRF_VALIDATION_FAILED,
      level: LogLevel.ERROR,
      message: 'CSRF token validation failed',
      path,
      ip,
      userAgent,
    })
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(description: string, metadata?: Record<string, unknown>): void {
    this.log({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      level: LogLevel.CRITICAL,
      message: `Suspicious activity detected: ${description}`,
      metadata,
    })
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(path: string, ip?: string, userId?: string): void {
    this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      level: LogLevel.WARN,
      message: `Unauthorized access attempt to ${path}`,
      path,
      ip,
      userId,
    })
  }

  /**
   * Format and log to console (development)
   */
  private logToConsole(event: SecurityEvent): void {
    const emoji = this.getEmojiForLevel(event.level)
    const color = this.getColorForLevel(event.level)
    
    console.log(
      `${emoji} [${event.level}] ${event.type} - ${event.message}`,
      event.metadata ? `\n  Metadata: ${JSON.stringify(event.metadata, null, 2)}` : ''
    )
  }

  /**
   * Log as JSON (production)
   */
  private logAsJson(event: SecurityEvent): void {
    console.log(JSON.stringify(event))
  }

  /**
   * Handle critical security events
   */
  private handleCriticalEvent(event: SecurityEvent): void {
    // In production, you might want to:
    // 1. Send alerts to monitoring service (e.g., Sentry, DataDog)
    // 2. Send notifications to security team
    // 3. Trigger automated responses
    
    console.error('🚨 CRITICAL SECURITY EVENT:', JSON.stringify(event, null, 2))
    
    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(new Error(event.message), { extra: event })
  }

  /**
   * Get emoji for log level
   */
  private getEmojiForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return 'ℹ️'
      case LogLevel.WARN:
        return '⚠️'
      case LogLevel.ERROR:
        return '❌'
      case LogLevel.CRITICAL:
        return '🚨'
      default:
        return '📝'
    }
  }

  /**
   * Get color for log level (for future use with colored console output)
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return 'blue'
      case LogLevel.WARN:
        return 'yellow'
      case LogLevel.ERROR:
        return 'red'
      case LogLevel.CRITICAL:
        return 'magenta'
      default:
        return 'white'
    }
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger()
