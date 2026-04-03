import { Database } from '../db/index';

export interface Collection {
  id?: number;
  name: string;
  parent_id?: number | null;
  sort_order?: number;
  created_at?: string;
  children?: Collection[];
  requests?: SavedRequest[];
}

export interface SavedRequest {
  id?: number;
  collection_id?: number;
  name: string;
  method?: string;
  url?: string;
  headers?: string;
  params?: string;
  body?: string;
  body_type?: string;
  auth_type?: string;
  auth_config?: string;
  pre_request_script?: string;
  sort_order?: number;
  updated_at?: string;
}

export class CollectionService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  createCollection(name: string, parentId?: number | null): Collection {
    const result = this.db.run(
      'INSERT INTO collections (name, parent_id) VALUES (?, ?)',
      [name, parentId ?? null]
    );
    return { id: result.lastInsertRowid, name, parent_id: parentId ?? null };
  }

  updateCollection(id: number, name: string): boolean {
    const result = this.db.run('UPDATE collections SET name = ? WHERE id = ?', [name, id]);
    return result.changes > 0;
  }

  deleteCollection(id: number): boolean {
    // First, recursively find all descendant collection IDs
    const ids = this.getDescendantIds(id);
    ids.push(id);

    // Delete requests in all descendant collections
    for (const cid of ids) {
      this.db.run('DELETE FROM saved_requests WHERE collection_id = ?', [cid]);
    }

    // Delete all collections
    const result = this.db.run(
      `DELETE FROM collections WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    return result.changes > 0;
  }

  moveCollection(id: number, parentId: number | null, sortOrder?: number): boolean {
    const result = this.db.run(
      'UPDATE collections SET parent_id = ?, sort_order = ? WHERE id = ?',
      [parentId, sortOrder ?? 0, id]
    );
    return result.changes > 0;
  }

  getTree(): Collection[] {
    const collections = this.db.query<Collection>('SELECT * FROM collections ORDER BY sort_order, id');
    const requests = this.db.query<SavedRequest>('SELECT * FROM saved_requests ORDER BY sort_order, id');

    const requestMap = new Map<number, SavedRequest[]>();
    for (const req of requests) {
      const cid = req.collection_id!;
      if (!requestMap.has(cid)) requestMap.set(cid, []);
      requestMap.get(cid)!.push(req);
    }

    return this.buildTree(collections, requestMap);
  }

  addRequest(collectionId: number, request: Omit<SavedRequest, 'id' | 'collection_id' | 'updated_at'>): SavedRequest {
    const result = this.db.run(
      `INSERT INTO saved_requests (collection_id, name, method, url, headers, params, body, body_type, auth_type, auth_config, pre_request_script)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        collectionId,
        request.name,
        request.method || 'GET',
        request.url || null,
        request.headers || null,
        request.params || null,
        request.body || null,
        request.body_type || 'json',
        request.auth_type || 'none',
        request.auth_config || null,
        request.pre_request_script || null,
      ]
    );
    return { ...request, id: result.lastInsertRowid, collection_id: collectionId };
  }

  updateRequest(collectionId: number, requestId: number, updates: Partial<SavedRequest>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedFields = ['name', 'method', 'url', 'headers', 'params', 'body', 'body_type', 'auth_type', 'auth_config', 'pre_request_script', 'sort_order'];
    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push((updates as any)[field]);
      }
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = datetime('now')");
    values.push(requestId);

    const result = this.db.run(
      `UPDATE saved_requests SET ${fields.join(', ')} WHERE id = ? AND collection_id = ?`,
      [...values, collectionId]
    );
    return result.changes > 0;
  }

  deleteRequest(collectionId: number, requestId: number): boolean {
    const result = this.db.run(
      'DELETE FROM saved_requests WHERE id = ? AND collection_id = ?',
      [requestId, collectionId]
    );
    return result.changes > 0;
  }

  private getDescendantIds(parentId: number): number[] {
    const children = this.db.query<{ id: number }>(
      'SELECT id FROM collections WHERE parent_id = ?',
      [parentId]
    );
    const ids: number[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...this.getDescendantIds(child.id));
    }
    return ids;
  }

  private buildTree(collections: Collection[], requestMap: Map<number, SavedRequest[]>): Collection[] {
    const map = new Map<number, Collection>();
    const roots: Collection[] = [];

    for (const col of collections) {
      col.children = [];
      col.requests = requestMap.get(col.id!) || [];
      map.set(col.id!, col);
    }

    for (const col of collections) {
      if (col.parent_id == null) {
        roots.push(col);
      } else {
        const parent = map.get(col.parent_id);
        if (parent) {
          parent.children!.push(col);
        }
      }
    }

    return roots;
  }
}
