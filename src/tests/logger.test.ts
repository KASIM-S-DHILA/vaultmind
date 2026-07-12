import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../shared/logger';

describe('logger', () => {
  let spies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    spies = ['debug', 'info', 'warn', 'error'].map(level =>
      vi.spyOn(console, level as keyof Console).mockImplementation(() => {}),
    );
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
  });

  it('has all log level methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('logs without throwing', () => {
    expect(() => logger.info('Test', 'message')).not.toThrow();
  });

  it('prepends timestamp and [VaultMind] prefix', () => {
    logger.info('Engine', 'started');
    const call = spies[1].mock.calls[0][0];
    expect(call).toContain('[VaultMind]');
    expect(call).toContain('[Engine]');
    expect(call).toContain('started');
  });

  it('includes extra args as JSON', () => {
    logger.info('Test', 'count:', 42, { key: 'val' });
    const call = spies[1].mock.calls[0][0];
    expect(call).toContain('42');
    expect(call).toContain('{"key":"val"}');
  });

  it('debug calls console.debug', () => {
    logger.debug('Dbg', 'test');
    expect(spies[0]).toHaveBeenCalled();
  });

  it('warn calls console.warn', () => {
    logger.warn('Wrn', 'caution');
    expect(spies[2]).toHaveBeenCalled();
  });

  it('error calls console.error', () => {
    logger.error('Err', 'boom');
    expect(spies[3]).toHaveBeenCalled();
  });

  it('does not throw when console.write throws (EPIPE simulation)', () => {
    spies[1].mockImplementation(() => { throw new Error('EPIPE'); });
    expect(() => logger.info('Test', 'msg')).not.toThrow();
  });
});
