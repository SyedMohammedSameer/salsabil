// utils/logger.ts - Production-ready logging utility

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private enabledLevels: Set<LogLevel>;

  constructor() {
    // In production, only log warnings and errors
    // In development, log everything
    this.enabledLevels = this.isDevelopment
      ? new Set(['debug', 'info', 'warn', 'error'])
      : new Set(['warn', 'error']);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.enabledLevels.has(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };

    // Format log for console
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        if (error) {
          console.error(fullMessage, '\n', error, context || '');
        } else {
          console.error(fullMessage, context || '');
        }
        // In production, you'd send errors to a service like Sentry
        // this.sendToErrorTracker(entry);
        break;

      case 'warn':
        console.warn(fullMessage, context || '');
        break;

      case 'info':
        console.info(fullMessage, context || '');
        break;

      case 'debug':
        console.log(fullMessage, context || '');
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>) {
    if (errorOrContext instanceof Error) {
      this.log('error', message, context, errorOrContext);
    } else {
      this.log('error', message, errorOrContext);
    }
  }

  // Specialized methods for common scenarios
  apiError(endpoint: string, error: Error, context?: Record<string, unknown>) {
    this.error(`API call failed: ${endpoint}`, error, {
      ...context,
      endpoint,
    });
  }

  firestoreError(operation: string, error: Error, context?: Record<string, unknown>) {
    this.error(`Firestore ${operation} failed`, error, {
      ...context,
      operation,
    });
  }

  userAction(action: string, context?: Record<string, unknown>) {
    this.info(`User action: ${action}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogEntry };
