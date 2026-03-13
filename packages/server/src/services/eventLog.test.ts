import { describe, it, expect, beforeEach, vi } from 'vitest';
import { log, logAudit, getLog, clearLog } from './eventLog.js';

describe('eventLog', () => {
  beforeEach(() => {
    clearLog();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stores log entries', () => {
    log('info', 'test', 'hello');
    const entries = getLog();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
    expect(entries[0].source).toBe('test');
    expect(entries[0].message).toBe('hello');
  });

  it('assigns incrementing ids', () => {
    log('info', 'a', 'msg1');
    log('info', 'b', 'msg2');
    const entries = getLog();
    expect(entries[1].id).toBeGreaterThan(entries[0].id);
  });

  it('caps detail length at 2000 characters', () => {
    const longDetail = 'x'.repeat(3000);
    log('info', 'test', 'msg', longDetail);
    const entries = getLog();
    expect(entries[0].detail!.length).toBe(2000);
  });

  it('evicts oldest entries when exceeding MAX_ENTRIES', () => {
    for (let i = 0; i < 110; i++) {
      log('info', 'test', `msg-${i}`);
    }
    const entries = getLog();
    expect(entries.length).toBe(100);
    expect(entries[0].message).toBe('msg-10');
  });

  it('clearLog empties all entries', () => {
    log('info', 'test', 'hello');
    clearLog();
    expect(getLog()).toHaveLength(0);
  });

  it('getLog returns a copy, not the internal array', () => {
    log('info', 'test', 'msg');
    const entries = getLog();
    entries.push({} as any);
    expect(getLog()).toHaveLength(1);
  });

  it('logAudit creates info-level audit entries', () => {
    logAudit('user-login', 'user=admin');
    const entries = getLog();
    expect(entries[0].level).toBe('info');
    expect(entries[0].source).toBe('audit');
    expect(entries[0].message).toBe('user-login');
    expect(entries[0].detail).toBe('user=admin');
  });

  it('logs warn level to console.warn', () => {
    log('warn', 'test', 'warning');
    expect(console.warn).toHaveBeenCalled();
  });

  it('logs error level to console.error', () => {
    log('error', 'test', 'error msg');
    expect(console.error).toHaveBeenCalled();
  });

  it('includes timestamp as ISO string', () => {
    log('info', 'test', 'msg');
    const entry = getLog()[0];
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });
});
