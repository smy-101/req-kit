import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
  });

  afterAll(() => {
    db.close();
  });

  test('migrates all tables', () => {
    const tables = db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const names = tables.map(t => t.name);
    expect(names).toContain('environments');
    expect(names).toContain('env_variables');
    expect(names).toContain('collections');
    expect(names).toContain('saved_requests');
    expect(names).toContain('history');
  });

  test('inserts and queries an environment', () => {
    const result = db.run('INSERT INTO environments (name) VALUES (?)', ['dev']);
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBeGreaterThan(0);

    const env = db.queryOne<{ id: number; name: string }>(
      'SELECT * FROM environments WHERE id = ?',
      [result.lastInsertRowid]
    );
    expect(env).toBeDefined();
    expect(env!.name).toBe('dev');
  });

  test('cascades delete from environments to env_variables', () => {
    const { lastInsertRowid: envId } = db.run(
      'INSERT INTO environments (name) VALUES (?)',
      ['dev']
    );
    db.run('INSERT INTO env_variables (environment_id, key, value) VALUES (?, ?, ?)', [
      envId,
      'base_url',
      'http://localhost:3000',
    ]);
    db.run('INSERT INTO env_variables (environment_id, key, value) VALUES (?, ?, ?)', [
      envId,
      'token',
      'abc123',
    ]);

    const varsBefore = db.query('SELECT * FROM env_variables WHERE environment_id = ?', [envId]);
    expect(varsBefore.length).toBe(2);

    db.run('DELETE FROM environments WHERE id = ?', [envId]);

    const varsAfter = db.query('SELECT * FROM env_variables WHERE environment_id = ?', [envId]);
    expect(varsAfter.length).toBe(0);
  });

  test('cascades delete from collections to saved_requests', () => {
    const { lastInsertRowid: collId } = db.run(
      'INSERT INTO collections (name) VALUES (?)',
      ['Users']
    );
    db.run(
      'INSERT INTO saved_requests (collection_id, name, method, url) VALUES (?, ?, ?, ?)',
      [collId, 'Get Users', 'GET', 'https://api.example.com/users']
    );

    db.run('DELETE FROM collections WHERE id = ?', [collId]);

    const reqs = db.query('SELECT * FROM saved_requests WHERE collection_id = ?', [collId]);
    expect(reqs.length).toBe(0);
  });

  test('inserts and queries history', () => {
    db.run(
      'INSERT INTO history (method, url, status, response_time, response_size) VALUES (?, ?, ?, ?, ?)',
      ['GET', 'https://api.example.com/users', 200, 150, 1234]
    );

    const history = db.queryOne<{
      method: string;
      url: string;
      status: number;
      response_time: number;
      response_size: number;
    }>('SELECT * FROM history WHERE id = 1');

    expect(history).toBeDefined();
    expect(history!.method).toBe('GET');
    expect(history!.status).toBe(200);
  });
});
