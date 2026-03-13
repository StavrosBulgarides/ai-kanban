import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('connection', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-test-'));
    // Reset module between tests to clear singleton
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates database at specified path', async () => {
    const dbPath = path.join(tmpDir, 'test.db');
    process.env.DATABASE_PATH = dbPath;

    const { getDb, closeDb } = await import('./connection.js');
    const db = getDb();
    expect(db).toBeDefined();
    expect(fs.existsSync(dbPath)).toBe(true);
    closeDb();

    delete process.env.DATABASE_PATH;
  });

  it('creates parent directories if needed', async () => {
    const dbPath = path.join(tmpDir, 'sub', 'dir', 'test.db');
    process.env.DATABASE_PATH = dbPath;

    const { getDb, closeDb } = await import('./connection.js');
    const db = getDb();
    expect(db).toBeDefined();
    expect(fs.existsSync(dbPath)).toBe(true);
    closeDb();

    delete process.env.DATABASE_PATH;
  });

  it('returns same instance on repeated calls', async () => {
    const dbPath = path.join(tmpDir, 'singleton.db');
    process.env.DATABASE_PATH = dbPath;

    const { getDb, closeDb } = await import('./connection.js');
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
    closeDb();

    delete process.env.DATABASE_PATH;
  });

  it('closeDb allows re-opening', async () => {
    const dbPath = path.join(tmpDir, 'reopen.db');
    process.env.DATABASE_PATH = dbPath;

    const { getDb, closeDb } = await import('./connection.js');
    const db1 = getDb();
    closeDb();
    const db2 = getDb();
    expect(db2).toBeDefined();
    expect(db1).not.toBe(db2);
    closeDb();

    delete process.env.DATABASE_PATH;
  });
});
