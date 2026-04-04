import { Database } from '../db/index';

export interface Environment {
  id?: number;
  name: string;
  created_at?: string;
  variables?: EnvVariable[];
}

export interface EnvVariable {
  id?: number;
  environment_id?: number;
  key: string;
  value?: string;
  enabled?: boolean;
}

export class EnvService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  createEnvironment(name: string): Environment {
    const result = this.db.run('INSERT INTO environments (name) VALUES (?)', [name]);
    return { id: result.lastInsertRowid, name, variables: [] };
  }

  updateEnvironment(id: number, name: string): boolean {
    const result = this.db.run('UPDATE environments SET name = ? WHERE id = ?', [name, id]);
    return result.changes > 0;
  }

  deleteEnvironment(id: number): boolean {
    const result = this.db.run('DELETE FROM environments WHERE id = ?', [id]);
    return result.changes > 0;
  }

  getAllEnvironments(): Environment[] {
    const envs = this.db.query<{ id: number; name: string; created_at: string }>(
      'SELECT * FROM environments ORDER BY id'
    );
    return envs.map(env => {
      const vars = this.db.query<EnvVariable>(
        'SELECT * FROM env_variables WHERE environment_id = ?',
        [env.id]
      );
      return { ...env, variables: vars };
    });
  }

  getVariables(environmentId: number): EnvVariable[] {
    return this.db.query<EnvVariable>(
      'SELECT * FROM env_variables WHERE environment_id = ?',
      [environmentId]
    );
  }

  replaceVariables(environmentId: number, variables: Omit<EnvVariable, 'id' | 'environment_id'>[]): EnvVariable[] {
    // Delete existing variables
    this.db.run('DELETE FROM env_variables WHERE environment_id = ?', [environmentId]);

    // Insert new variables
    for (const v of variables) {
      this.db.run(
        'INSERT INTO env_variables (environment_id, key, value, enabled) VALUES (?, ?, ?, ?)',
        [environmentId, v.key, v.value || null, v.enabled !== false ? 1 : 0]
      );
    }

    return this.getVariables(environmentId);
  }

  replaceTemplateValues(text: string, environmentId: number): string {
    const vars = this.getVariables(environmentId);
    const enabledVars = vars.filter(v => v.enabled !== false && v.enabled !== 0);

    return text.replace(/\{\{([\w-]+)\}\}/g, (match, key) => {
      const found = enabledVars.find(v => v.key === key);
      return found ? (found.value || match) : match;
    });
  }
}
