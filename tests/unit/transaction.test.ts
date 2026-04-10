import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';

describe('Database.transaction', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
  });

  afterAll(() => {
    db.close();
  });

  test('commits on success', () => {
    db.run("INSERT INTO environments (name) VALUES ('env1')");
    const env = db.queryOne<{ id: number }>("SELECT id FROM environments WHERE name = 'env1'");
    expect(env).toBeDefined();

    db.transaction(() => {
      db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'k1', 'v1')", [env!.id]);
      db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'k2', 'v2')", [env!.id]);
    });

    const vars = db.query<{ key: string }>('SELECT key FROM env_variables WHERE environment_id = ?', [env!.id]);
    expect(vars).toHaveLength(2);
    expect(vars.map(v => v.key)).toEqual(['k1', 'k2']);
  });

  test('rolls back on error', () => {
    db.run("INSERT INTO environments (name) VALUES ('env1')");
    const env = db.queryOne<{ id: number }>("SELECT id FROM environments WHERE name = 'env1'");
    expect(env).toBeDefined();

    expect(() => {
      db.transaction(() => {
        db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'k1', 'v1')", [env!.id]);
        // This should fail: NOT NULL constraint
        db.run('INSERT INTO env_variables (environment_id, key) VALUES (?, NULL)', [env!.id]);
      });
    }).toThrow(/NOT NULL constraint failed/);

    // k1 should not exist due to rollback
    const vars = db.query<{ key: string }>('SELECT key FROM env_variables WHERE environment_id = ?', [env!.id]);
    expect(vars).toHaveLength(0);
  });

  test('returns the callback result', () => {
    const result = db.transaction(() => {
      db.run("INSERT INTO environments (name) VALUES ('tx_test')");
      const row = db.queryOne<{ id: number }>("SELECT id FROM environments WHERE name = 'tx_test'");
      return row!.id;
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
  });

  test('nested transaction commits all operations', () => {
    db.run("INSERT INTO environments (name) VALUES ('env1')");
    const env = db.queryOne<{ id: number }>("SELECT id FROM environments WHERE name = 'env1'");
    expect(env).toBeDefined();

    db.transaction(() => {
      db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'outer', 'v1')", [env!.id]);
      db.transaction(() => {
        db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'inner', 'v2')", [env!.id]);
      });
    });

    const vars = db.query<{ key: string }>('SELECT key FROM env_variables WHERE environment_id = ?', [env!.id]);
    expect(vars).toHaveLength(2);
    expect(vars.map(v => v.key)).toEqual(['outer', 'inner']);
  });

  test('nested transaction rollback does not affect outer', () => {
    db.run("INSERT INTO environments (name) VALUES ('env1')");
    const env = db.queryOne<{ id: number }>("SELECT id FROM environments WHERE name = 'env1'");
    expect(env).toBeDefined();

    db.transaction(() => {
      db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'kept', 'v1')", [env!.id]);
      expect(() => {
        db.transaction(() => {
          db.run("INSERT INTO env_variables (environment_id, key, value) VALUES (?, 'lost', 'v2')", [env!.id]);
          db.run('INSERT INTO env_variables (environment_id, key) VALUES (?, NULL)', [env!.id]);
        });
      }).toThrow(/NOT NULL constraint failed/);
    });

    const vars = db.query<{ key: string }>('SELECT key FROM env_variables WHERE environment_id = ?', [env!.id]);
    expect(vars).toHaveLength(1);
    expect(vars[0].key).toBe('kept');
  });
});
