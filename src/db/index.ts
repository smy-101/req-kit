import { Database as BunDatabase, Statement } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Database {
  private db: BunDatabase;

  constructor(dbPath: string = ':memory:') {
    this.db = new BunDatabase(dbPath);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
  }

  migrate() {
    const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf-8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      this.db.run(stmt);
    }
  }

  query<T>(sql: string, params?: unknown[]): T[] {
    const stmt: Statement = this.db.prepare(sql);
    return stmt.all(...(params ?? [])) as T[];
  }

  queryOne<T>(sql: string, params?: unknown[]): T | undefined {
    const stmt: Statement = this.db.prepare(sql);
    const result = stmt.get(...(params ?? []));
    return result ?? undefined;
  }

  run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
    const stmt: Statement = this.db.prepare(sql);
    const result = stmt.run(...(params ?? []));
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  close() {
    this.db.close();
  }
}
