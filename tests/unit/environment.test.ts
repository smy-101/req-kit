import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { EnvService } from '../../src/services/environment';

describe('EnvService', () => {
  let db: Database;
  let service: EnvService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    service = new EnvService(db);
  });

  afterAll(() => {
    db.close();
  });

  describe('environment CRUD', () => {
    test('creates environment', () => {
      const env = service.createEnvironment('dev');
      expect(env.id).toBeDefined();
      expect(env.name).toBe('dev');
      expect(env.variables).toEqual([]);
    });

    test('gets all environments with variables', () => {
      const env1 = service.createEnvironment('dev');
      const env2 = service.createEnvironment('staging');
      service.replaceVariables(env1.id!, [
        { key: 'base_url', value: 'http://localhost:3000' },
        { key: 'token', value: 'abc123' },
      ]);
      service.replaceVariables(env2.id!, [
        { key: 'base_url', value: 'https://staging.example.com' },
      ]);

      const envs = service.getAllEnvironments();
      expect(envs.length).toBe(2);
      expect(envs[0].name).toBe('dev');
      expect(envs[0].variables!.length).toBe(2);
      expect(envs[1].name).toBe('staging');
      expect(envs[1].variables!.length).toBe(1);
      expect(envs[1].variables![0].key).toBe('base_url');
    });

    test('getAllEnvironments returns empty variables for env without vars', () => {
      service.createEnvironment('dev');
      service.createEnvironment('staging');

      const envs = service.getAllEnvironments();
      expect(envs.length).toBe(2);
      expect(envs[0].variables).toEqual([]);
      expect(envs[1].variables).toEqual([]);
    });

    test('updates environment name', () => {
      const env = service.createEnvironment('dev');
      const updated = service.updateEnvironment(env.id!, 'staging');
      expect(updated).toBe(true);

      const envs = service.getAllEnvironments();
      expect(envs[0].name).toBe('staging');
    });

    test('deletes environment with cascade', () => {
      const env = service.createEnvironment('dev');
      service.replaceVariables(env.id!, [{ key: 'url', value: 'http://localhost:3000' }]);

      const deleted = service.deleteEnvironment(env.id!);
      expect(deleted).toBe(true);
      expect(service.getAllEnvironments().length).toBe(0);
    });
  });

  describe('variable management', () => {
    test('replaces variables', () => {
      const env = service.createEnvironment('dev');
      service.replaceVariables(env.id!, [
        { key: 'base_url', value: 'http://localhost:3000' },
      ]);

      service.replaceVariables(env.id!, [
        { key: 'api_url', value: 'https://api.prod.com' },
        { key: 'token', value: 'abc123' },
      ]);

      const vars = service.getVariables(env.id!);
      expect(vars.length).toBe(2);
      expect(vars.find(v => v.key === 'api_url')?.value).toBe('https://api.prod.com');
    });
  });
});
