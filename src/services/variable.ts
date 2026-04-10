import { Database } from '../db/index';
import { EnvService } from './environment';

export interface VariableResolveContext {
  runtimeVars?: Record<string, string>;
  collectionId?: number;
  environmentId?: number;
}

export class VariableService {
  private db: Database;
  private envService: EnvService;

  constructor(db: Database, envService: EnvService) {
    this.db = db;
    this.envService = envService;
  }

  // --- 全局变量 CRUD ---

  getAllGlobal(): { id: number; key: string; value: string | null; enabled: number }[] {
    return this.db.query<{ id: number; key: string; value: string | null; enabled: number }>(
      'SELECT * FROM global_variables ORDER BY id'
    );
  }

  replaceGlobal(variables: { key: string; value?: string; enabled?: boolean }[]): { id: number; key: string; value: string | null; enabled: number }[] {
    return this.db.transaction(() => {
      this.db.run('DELETE FROM global_variables');
      // Deduplicate: last occurrence wins for duplicate keys
      const seen = new Map<string, { key: string; value?: string; enabled?: boolean }>();
      for (const v of variables) {
        seen.set(v.key, v);
      }
      for (const v of seen.values()) {
        this.db.run(
          'INSERT INTO global_variables (key, value, enabled) VALUES (?, ?, ?)',
          [v.key, v.value || null, v.enabled !== false ? 1 : 0]
        );
      }
      return this.getAllGlobal();
    });
  }

  // --- 集合变量 CRUD ---

  getByCollection(collectionId: number): { id: number; key: string; value: string | null; enabled: number }[] {
    return this.db.query<{ id: number; key: string; value: string | null; enabled: number }>(
      'SELECT * FROM collection_variables WHERE collection_id = ? ORDER BY id',
      [collectionId]
    );
  }

  replaceForCollection(collectionId: number, variables: { key: string; value?: string; enabled?: boolean }[]): { id: number; key: string; value: string | null; enabled: number }[] {
    return this.db.transaction(() => {
      this.db.run('DELETE FROM collection_variables WHERE collection_id = ?', [collectionId]);
      for (const v of variables) {
        this.db.run(
          'INSERT INTO collection_variables (collection_id, key, value, enabled) VALUES (?, ?, ?, ?)',
          [collectionId, v.key, v.value || null, v.enabled !== false ? 1 : 0]
        );
      }
      return this.getByCollection(collectionId);
    });
  }

  // --- 集合树追溯 ---

  getRootCollectionId(collectionId: number): number {
    let current = collectionId;
    while (true) {
      const row = this.db.queryOne<{ parent_id: number | null }>(
        'SELECT parent_id FROM collections WHERE id = ?',
        [current]
      );
      if (!row || row.parent_id == null) return current;
      current = row.parent_id;
    }
  }

  // --- 变量解析 ---

  resolveVariables(text: string, context: VariableResolveContext): string {
    return text.replace(/\{\{([\w-]+)\}\}/g, (match, key: string) => {
      const value = this.lookupVariable(key, context);
      return value !== undefined ? value : match;
    });
  }

  resolveAllVars(context: VariableResolveContext): Map<string, string> {
    // 按 Global → Environment → Collection → Runtime 顺序覆盖
    const merged = new Map<string, string>();

    // Global（最低优先级）
    const globals = this.db.query<{ key: string; value: string | null; enabled: number }>(
      'SELECT key, value, enabled FROM global_variables'
    );
    for (const v of globals) {
      if (v.enabled) merged.set(v.key, v.value || '');
    }

    // Environment
    if (context.environmentId) {
      const envVars = this.envService.getVariables(context.environmentId);
      for (const v of envVars) {
        if (v.enabled !== false && v.enabled !== 0) {
          merged.set(v.key, v.value || '');
        }
      }
    }

    // Collection
    if (context.collectionId) {
      const rootId = this.getRootCollectionId(context.collectionId);
      const collVars = this.db.query<{ key: string; value: string | null; enabled: number }>(
        'SELECT key, value, enabled FROM collection_variables WHERE collection_id = ?',
        [rootId]
      );
      for (const v of collVars) {
        if (v.enabled) merged.set(v.key, v.value || '');
      }
    }

    // Runtime（最高优先级）
    if (context.runtimeVars) {
      for (const [key, value] of Object.entries(context.runtimeVars)) {
        merged.set(key, value);
      }
    }

    return merged;
  }

  private lookupVariable(key: string, context: VariableResolveContext): string | undefined {
    // Runtime（最高优先级）
    if (context.runtimeVars && key in context.runtimeVars) {
      return context.runtimeVars[key];
    }

    // Collection
    if (context.collectionId) {
      const rootId = this.getRootCollectionId(context.collectionId);
      const row = this.db.queryOne<{ value: string | null }>(
        'SELECT value FROM collection_variables WHERE collection_id = ? AND key = ? AND enabled = 1',
        [rootId, key]
      );
      if (row) return row.value || '';
    }

    // Environment
    if (context.environmentId) {
      const envVars = this.envService.getVariables(context.environmentId);
      const found = envVars.find(v => v.key === key && v.enabled !== false && v.enabled !== 0);
      if (found) return found.value || '';
    }

    // Global（最低优先级）
    const globalRow = this.db.queryOne<{ value: string | null }>(
      'SELECT value FROM global_variables WHERE key = ? AND enabled = 1',
      [key]
    );
    if (globalRow) return globalRow.value || '';

    return undefined;
  }
}
