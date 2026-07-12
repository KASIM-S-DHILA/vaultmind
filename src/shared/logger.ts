/**
 * Simple structured logger used across main and preload processes.
 *
 * Each call is wrapped in `safeConsole` which silently catches EPIPE errors
 * that occur when the packaged app no longer has a connected terminal.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[VaultMind]';

function formatMessage(level: LogLevel, namespace: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `${timestamp} ${PREFIX}[${namespace}] ${message}${args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''}`;
}

function safeConsole(method: typeof console.log, msg: string): void {
  try {
    method(msg);
  } catch {
    // EPIPE when stdout/stderr pipe is closed (packaged app, no terminal)
  }
}

export const logger = {
  debug: (namespace: string, message: string, ...args: unknown[]) =>
    safeConsole(console.debug, formatMessage('debug', namespace, message, ...args)),
  info: (namespace: string, message: string, ...args: unknown[]) =>
    safeConsole(console.info, formatMessage('info', namespace, message, ...args)),
  warn: (namespace: string, message: string, ...args: unknown[]) =>
    safeConsole(console.warn, formatMessage('warn', namespace, message, ...args)),
  error: (namespace: string, message: string, ...args: unknown[]) =>
    safeConsole(console.error, formatMessage('error', namespace, message, ...args)),
};
