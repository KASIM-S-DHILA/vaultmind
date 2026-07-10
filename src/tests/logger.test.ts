import { describe, it, expect, vi } from 'vitest';
import { logger } from '../shared/logger';

describe('logger', () => {
  it('has all log level methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('logs without throwing', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(() => logger.info('Test', 'message')).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
