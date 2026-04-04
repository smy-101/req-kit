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

    // Incremental migrations — add columns that may be missing from older databases
    const migrations: [string, string][] = [
      ['body_type', 'ALTER TABLE history ADD COLUMN body_type TEXT DEFAULT \'json\''],
      ['pre_request_script', 'ALTER TABLE history ADD COLUMN pre_request_script TEXT'],
      ['auth_type', 'ALTER TABLE history ADD COLUMN auth_type TEXT DEFAULT \'none\''],
      ['auth_config', 'ALTER TABLE history ADD COLUMN auth_config TEXT'],
      ['post_response_script', 'ALTER TABLE history ADD COLUMN post_response_script TEXT'],
    ];
    const existing = this.db.prepare("PRAGMA table_info(history)").all() as { name: string }[];
    const columns = new Set(existing.map(c => c.name));
    for (const [col, sql] of migrations) {
      if (!columns.has(col)) {
        this.db.run(sql);
      }
    }

    // saved_requests migrations
    const reqMigrations: [string, string][] = [
      ['post_response_script', 'ALTER TABLE saved_requests ADD COLUMN post_response_script TEXT'],
    ];
    const reqExisting = this.db.prepare("PRAGMA table_info(saved_requests)").all() as { name: string }[];
    const reqColumns = new Set(reqExisting.map(c => c.name));
    for (const [col, sql] of reqMigrations) {
      if (!reqColumns.has(col)) {
        this.db.run(sql);
      }
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
