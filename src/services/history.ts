import { Database } from '../db/index';

export interface HistoryRecord {
  id?: number;
  method: string;
  url: string;
  request_headers?: string;
  request_params?: string;
  request_body?: string;
  status?: number;
  response_headers?: string;
  response_body?: string;
  response_time?: number;
  response_size?: number;
  created_at?: string;
}

export interface HistoryListResult {
  items: HistoryRecord[];
  total: number;
  page: number;
  limit: number;
}

export class HistoryService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  create(record: Omit<HistoryRecord, 'id' | 'created_at'>): number {
    const result = this.db.run(
      `INSERT INTO history (method, url, request_headers, request_params, request_body, status, response_headers, response_body, response_time, response_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.method,
        record.url,
        record.request_headers || null,
        record.request_params || null,
        record.request_body || null,
        record.status || null,
        record.response_headers || null,
        record.response_body || null,
        record.response_time || null,
        record.response_size || null,
      ]
    );
    return result.lastInsertRowid;
  }

  list(page: number = 1, limit: number = 50): HistoryListResult {
    const offset = (page - 1) * limit;
    const items = this.db.query<HistoryRecord>(
      'SELECT id, method, url, status, response_time, response_size, created_at FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const totalResult = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM history');
    const total = totalResult?.count ?? 0;
    return { items, total, page, limit };
  }

  getById(id: number): HistoryRecord | undefined {
    return this.db.queryOne<HistoryRecord>('SELECT * FROM history WHERE id = ?', [id]);
  }

  deleteById(id: number): boolean {
    const result = this.db.run('DELETE FROM history WHERE id = ?', [id]);
    return result.changes > 0;
  }

  deleteAll(): number {
    const result = this.db.run('DELETE FROM history');
    return result.changes;
  }
}
