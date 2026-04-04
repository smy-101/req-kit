import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from '../../src/db/index';
import { EnvService } from '../../src/services/environment';
import { VariableService } from '../../src/services/variable';
import { CollectionService } from '../../src/services/collection';

describe('VariableService', () => {
  let db: Database;
  let envService: EnvService;
  let variableService: VariableService;
  let collectionService: CollectionService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    collectionService = new CollectionService(db);
    envService = new EnvService(db);
    variableService = new VariableService(db, envService);
  });

  describe('Global Variables CRUD', () => {
    test('getAllGlobal returns empty initially', () => {
      expect(variableService.getAllGlobal()).toEqual([]);
    });

    test('replaceGlobal inserts variables', () => {
      const result = variableService.replaceGlobal([
        { key: 'baseUrl', value: 'https://api.example.com' },
        { key: 'timeout', value: '5000', enabled: false },
      ]);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('baseUrl');
      expect(result[0].enabled).toBe(1);
      expect(result[1].key).toBe('timeout');
      expect(result[1].enabled).toBe(0);
    });

    test('replaceGlobal replaces all existing variables', () => {
      variableService.replaceGlobal([{ key: 'old', value: 'val' }]);
      variableService.replaceGlobal([{ key: 'new', value: 'val2' }]);
      const all = variableService.getAllGlobal();
      expect(all.length).toBe(1);
      expect(all[0].key).toBe('new');
    });

    test('duplicate keys in input: last wins', () => {
      const result = variableService.replaceGlobal([
        { key: 'dup', value: 'first' },
        { key: 'dup', value: 'second' },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe('second');
    });
  });

  describe('Collection Variables CRUD', () => {
    let collectionId: number;

    beforeEach(() => {
      const col = collectionService.createCollection('Test Collection');
      collectionId = col.id!;
    });

    test('getByCollection returns empty initially', () => {
      expect(variableService.getByCollection(collectionId)).toEqual([]);
    });

    test('replaceForCollection inserts variables', () => {
      const result = variableService.replaceForCollection(collectionId, [
        { key: 'apiVersion', value: 'v2' },
        { key: 'userId', value: '42', enabled: false },
      ]);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('apiVersion');
      expect(result[1].enabled).toBe(0);
    });

    test('replaceForCollection replaces existing variables', () => {
      variableService.replaceForCollection(collectionId, [{ key: 'old', value: '1' }]);
      variableService.replaceForCollection(collectionId, [{ key: 'new', value: '2' }]);
      expect(variableService.getByCollection(collectionId).length).toBe(1);
    });
  });

  describe('getRootCollectionId', () => {
    test('returns self for root collection', () => {
      const col = collectionService.createCollection('Root');
      expect(variableService.getRootCollectionId(col.id!)).toBe(col.id);
    });

    test('traverses up to root from nested collection', () => {
      const root = collectionService.createCollection('Root');
      const child = collectionService.createCollection('Child', root.id);
      const grandchild = collectionService.createCollection('GrandChild', child.id);
      expect(variableService.getRootCollectionId(grandchild.id!)).toBe(root.id);
    });

    test('returns self for single-level child', () => {
      const root = collectionService.createCollection('Root');
      const child = collectionService.createCollection('Child', root.id);
      expect(variableService.getRootCollectionId(child.id!)).toBe(root.id);
    });
  });

  describe('resolveVariables - four-level priority', () => {
    let envId: number;
    let collectionId: number;

    beforeEach(() => {
      // Set up environment
      const env = envService.createEnvironment('Dev');
      envId = env.id!;
      envService.replaceVariables(envId, [
        { key: 'host', value: 'https://dev.example.com', enabled: true },
        { key: 'token', value: 'env-token', enabled: true },
        { key: 'shared', value: 'env-val', enabled: true },
      ]);

      // Set up collection
      const col = collectionService.createCollection('API');
      collectionId = col.id!;
      variableService.replaceForCollection(collectionId, [
        { key: 'host', value: 'https://col.example.com', enabled: true },
        { key: 'colKey', value: 'col-val', enabled: true },
        { key: 'shared', value: 'col-val', enabled: true },
      ]);

      // Set up global
      variableService.replaceGlobal([
        { key: 'timeout', value: '5000', enabled: true },
        { key: 'shared', value: 'global-val', enabled: true },
      ]);
    });

    test('Runtime overrides all', () => {
      const result = variableService.resolveVariables('{{host}}', {
        runtimeVars: { host: 'https://runtime.example.com' },
        collectionId,
        environmentId: envId,
      });
      expect(result).toBe('https://runtime.example.com');
    });

    test('Collection overrides Environment and Global', () => {
      const result = variableService.resolveVariables('{{host}}', {
        collectionId,
        environmentId: envId,
      });
      expect(result).toBe('https://col.example.com');
    });

    test('Environment overrides Global', () => {
      const result = variableService.resolveVariables('{{shared}}', {
        environmentId: envId,
      });
      expect(result).toBe('env-val');
    });

    test('Global is used when no higher scope matches', () => {
      const result = variableService.resolveVariables('{{timeout}}', {});
      expect(result).toBe('5000');
    });

    test('Unmatched variable left as-is', () => {
      const result = variableService.resolveVariables('{{unknown}}', {});
      expect(result).toBe('{{unknown}}');
    });

    test('Multiple variables in one string', () => {
      const result = variableService.resolveVariables('{{host}}/api/{{timeout}}', {
        collectionId,
        environmentId: envId,
      });
      expect(result).toBe('https://col.example.com/api/5000');
    });

    test('Disabled variables are skipped', () => {
      variableService.replaceGlobal([{ key: 'disabled', value: 'val', enabled: false }]);
      const result = variableService.resolveVariables('{{disabled}}', {});
      expect(result).toBe('{{disabled}}');
    });

    test('Missing collection_id skips collection scope', () => {
      const result = variableService.resolveVariables('{{colKey}}', {
        environmentId: envId,
      });
      // colKey is collection scope only, should not be found
      expect(result).toBe('{{colKey}}');
    });

    test('Missing environment_id skips environment scope', () => {
      const result = variableService.resolveVariables('{{token}}', {
        collectionId,
      });
      expect(result).toBe('{{token}}');
    });

    test('Empty runtime_vars proceeds normally', () => {
      const result = variableService.resolveVariables('{{host}}', {
        runtimeVars: {},
        collectionId,
        environmentId: envId,
      });
      expect(result).toBe('https://col.example.com');
    });
  });

  describe('resolveAllVars', () => {
    test('returns merged map with correct priorities', () => {
      const env = envService.createEnvironment('Test');
      envService.replaceVariables(env.id!, [
        { key: 'a', value: 'env', enabled: true },
        { key: 'b', value: 'env', enabled: true },
      ]);
      variableService.replaceGlobal([
        { key: 'a', value: 'global', enabled: true },
        { key: 'c', value: 'global', enabled: true },
      ]);

      const col = collectionService.createCollection('C');
      variableService.replaceForCollection(col.id!, [
        { key: 'a', value: 'col', enabled: true },
      ]);

      const allVars = variableService.resolveAllVars({
        runtimeVars: { b: 'runtime' },
        collectionId: col.id,
        environmentId: env.id,
      });

      expect(allVars.get('a')).toBe('col');      // Collection overrides env & global
      expect(allVars.get('b')).toBe('runtime'); // Runtime overrides env
      expect(allVars.get('c')).toBe('global');  // Only global
    });
  });
});
