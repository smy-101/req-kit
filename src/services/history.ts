import { Database } from '../db/index';

export interface HistoryRecord {
  id?: number;
  method: string;
  url: string;
  request_headers?: string;
  request_params?: string;
  request_body?: string;
  body_type?: string;
  pre_request_script?: string;
  post_response_script?: string;
  auth_type?: string;
  auth_config?: string;
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
  static readonly MAX_HISTORY_COUNT = 500;

  constructor(db: Database) {
    this.db = db;
  }

  cleanup(maxCount?: number): number {
    const limit = maxCount ?? HistoryService.MAX_HISTORY_COUNT;
    const countResult = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM history');
    const total = countResult?.count ?? 0;
    if (total <= limit) return 0;
    const excess = total - limit;
    this.db.run(
      'DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY created_at ASC LIMIT ?)',
      [excess]
    );
    return excess;
  }

  create(record: Omit<HistoryRecord, 'id' | 'created_at'>): { id: number; cleaned: number } {
    const result = this.db.run(
      `INSERT INTO history (method, url, request_headers, request_params, request_body, body_type, pre_request_script, post_response_script, auth_type, auth_config, status, response_headers, response_body, response_time, response_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.method,
        record.url,
        record.request_headers || null,
        record.request_params || null,
        record.request_body || null,
        record.body_type || 'json',
        record.pre_request_script || null,
        record.post_response_script || null,
        record.auth_type || 'none',
        record.auth_config || null,
        record.status || null,
        record.response_headers || null,
        record.response_body || null,
        record.response_time || null,
        record.response_size || null,
      ]
    );
    const cleaned = this.cleanup();
    return { id: result.lastInsertRowid, cleaned };
  }

  list(page: number = 1, limit: number = 50, search?: string, method?: string): HistoryListResult {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('url LIKE ?');
      params.push(`%${search}%`);
    }
    if (method) {
      conditions.push('method = ?');
      params.push(method);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = this.db.query<HistoryRecord>(
      `SELECT id, method, url, status, response_time, response_size, created_at FROM history ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalResult = this.db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM history ${where}`, params);
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
