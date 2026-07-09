export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  actorId?: string;
  correlationId?: string;
  eventName?: string;
  requestId?: string;
  tenantId?: string;
  workflowName?: string;
};

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext & { error?: unknown }) => void;
};

export function createConsoleLogger(): Logger {
  const write = (level: LogLevel, message: string, context: LogContext = {}) => {
    const entry = {
      level,
      message,
      ...context,
      timestamp: new Date().toISOString(),
    };

    console[level](JSON.stringify(entry));
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
