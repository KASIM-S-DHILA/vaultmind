type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[VaultMind]';

function formatMessage(level: LogLevel, namespace: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `${timestamp} ${PREFIX}[${namespace}] ${message}${args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : ''}`;
}

export const logger = {
  debug: (namespace: string, message: string, ...args: unknown[]) =>
    console.debug(formatMessage('debug', namespace, message, ...args)),
  info: (namespace: string, message: string, ...args: unknown[]) =>
    console.info(formatMessage('info', namespace, message, ...args)),
  warn: (namespace: string, message: string, ...args: unknown[]) =>
    console.warn(formatMessage('warn', namespace, message, ...args)),
  error: (namespace: string, message: string, ...args: unknown[]) =>
    console.error(formatMessage('error', namespace, message, ...args)),
};
