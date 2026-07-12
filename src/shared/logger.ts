type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[VaultMind]';

function formatMessage(level: LogLevel, namespace: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `${timestamp} ${PREFIX}[${namespace}] ${message}${args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''}`;
}

function safeConsole(method: typeof console.log, msg: string): void {
  try {
    method(msg);
  } catch (err: unknown) {
    // EPIPE when stdout/stderr pipe is closed (packaged app, no terminal)
    if (err && typeof err === 'object' && 'code' in err && (err as NodeJS.ErrnoException).code === 'EPIPE') {
      // silently ignore
    }
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
