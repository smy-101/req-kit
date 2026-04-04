import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { CollectionService } from '../../src/services/collection';
import { EnvService } from '../../src/services/environment';
import { ImportExportService } from '../../src/services/import-export';
import { VariableService } from '../../src/services/variable';

describe('ImportExportService', () => {
  let db: Database;
  let collectionService: CollectionService;
  let variableService: VariableService;
  let service: ImportExportService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    collectionService = new CollectionService(db);
    const envService = new EnvService(db);
    variableService = new VariableService(db, envService);
    service = new ImportExportService(db, collectionService, variableService);
  });

  afterAll(() => {
    db.close();
  });

  describe('curl import', () => {
    test('parses simple GET curl', () => {
      const result = service.parseCurl("curl https://api.example.com/users -H 'Authorization: Bearer token123'");
      expect(result).not.toBeNull();
      expect(result!.method).toBe('GET');
      expect(result!.url).toBe('https://api.example.com/users');
      expect(result!.headers['Authorization']).toBe('Bearer token123');
    });

    test('parses POST curl with body', () => {
      const result = service.parseCurl("curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\":\"test\"}'");
      expect(result).not.toBeNull();
      expect(result!.method).toBe('POST');
      expect(result!.body).toBe('{"name":"test"}');
      expect(result!.headers['Content-Type']).toBe('application/json');
    });

    test('parses curl with --data flag', () => {
      const result = service.parseCurl("curl https://api.example.com/users --data '{\"key\":\"val\"}'");
      expect(result).not.toBeNull();
      expect(result!.method).toBe('POST');
      expect(result!.body).toBe('{"key":"val"}');
    });

    test('returns null for invalid curl', () => {
      const result = service.parseCurl('not a valid curl command');
      expect(result).toBeNull();
    });

    test('imports curl to collection', () => {
      const col = collectionService.createCollection('Test');
      const req = service.importCurl("curl https://api.example.com/users -H 'Auth: token'", col.id!);
      expect(req).not.toBeNull();
      expect(req!.method).toBe('GET');
      expect(req!.url).toBe('https://api.example.com/users');
    });
  });

  describe('Postman Collection import', () => {
    const postmanCollection = {
      info: {
        name: 'Test API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Users',
          item: [
            {
              name: 'Get Users',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                header: [{ key: 'Authorization', value: 'Bearer token' }],
              },
            },
          ],
        },
        {
          name: 'Create User',
          request: {
            method: 'POST',
            url: 'https://api.example.com/users',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: { mode: 'raw', raw: '{"name":"test"}' },
          },
        },
      ],
    };

    test('imports Postman Collection v2.1', () => {
      const id = service.importPostmanCollection(postmanCollection);
      expect(id).not.toBeNull();

      const tree = collectionService.getTree();
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('Test API');
    });

    test('rejects non-v2.1 format', () => {
      const result = service.importPostmanCollection({ info: { name: 'test' } });
      expect(result).toBeNull();
    });
  });

  describe('Postman Collection export', () => {
    test('exports collection to Postman format', () => {
      const col = collectionService.createCollection('My API');
      collectionService.addRequest(col.id!, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: JSON.stringify({ Authorization: 'Bearer token' }),
      });

      const exported = service.exportPostmanCollection(col.id!);
      expect(exported).not.toBeNull();
      expect(exported!.info.name).toBe('My API');
      expect(exported!.item.length).toBe(1);
    });

    test('returns null for non-existent collection', () => {
      const result = service.exportPostmanCollection(999);
      expect(result).toBeNull();
    });
  });

  describe('Postman Collection import with variables', () => {
    test('imports top-level variable field into collection_variables', () => {
      const postmanWithVars = {
        info: {
          name: 'API with Vars',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
        variable: [
          { key: 'apiVersion', value: 'v2' },
          { key: 'retryCount', value: '3', enabled: false },
        ],
      };

      const id = service.importPostmanCollection(postmanWithVars);
      expect(id).not.toBeNull();

      const vars = variableService.getByCollection(id!);
      expect(vars.length).toBe(2);
      expect(vars[0].key).toBe('apiVersion');
      expect(vars[0].value).toBe('v2');
      expect(vars[1].key).toBe('retryCount');
      expect(vars[1].enabled).toBe(0);
    });

    test('import works without variable field', () => {
      const postmanNoVars = {
        info: {
          name: 'No Vars',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      };

      const id = service.importPostmanCollection(postmanNoVars);
      expect(id).not.toBeNull();
      expect(variableService.getByCollection(id!).length).toBe(0);
    });
  });

  describe('Postman Collection export with variables', () => {
    test('exports collection variables in variable field', () => {
      const col = collectionService.createCollection('API');
      variableService.replaceForCollection(col.id!, [
        { key: 'apiVersion', value: 'v2', enabled: true },
        { key: 'retry', value: '3', enabled: true },
      ]);
      collectionService.addRequest(col.id!, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });

      const exported = service.exportPostmanCollection(col.id!);
      expect(exported).not.toBeNull();
      expect(exported!.variable).toBeDefined();
      expect(exported!.variable.length).toBe(2);
      expect(exported!.variable[0].key).toBe('apiVersion');
      expect(exported!.variable[0].value).toBe('v2');
    });

    test('export omits variable field when no collection variables', () => {
      const col = collectionService.createCollection('Empty');
      const exported = service.exportPostmanCollection(col.id!);
      expect(exported).not.toBeNull();
      expect(exported!.variable).toBeUndefined();
    });
  });

  describe('curl export', () => {
    test('exports GET request to curl', () => {
      const col = collectionService.createCollection('Test');
      const req = collectionService.addRequest(col.id!, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: JSON.stringify({ Authorization: 'Bearer token123' }),
      });

      const curl = service.exportCurl(req.id!);
      expect(curl).not.toBeNull();
      expect(curl).toContain('https://api.example.com/users');
      expect(curl).toContain('Authorization: Bearer token123');
    });

    test('exports POST request to curl', () => {
      const col = collectionService.createCollection('Test');
      const req = collectionService.addRequest(col.id!, {
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: JSON.stringify({ 'Content-Type': 'application/json' }),
        body: '{"name":"test"}',
      });

      const curl = service.exportCurl(req.id!);
      expect(curl).not.toBeNull();
      expect(curl).toContain('-X POST');
      expect(curl).toContain("-d '{");
    });

    test('returns null for non-existent request', () => {
      const result = service.exportCurl(999);
      expect(result).toBeNull();
    });
  });
});
