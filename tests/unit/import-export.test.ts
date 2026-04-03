import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { CollectionService } from '../../src/services/collection';
import { ImportExportService } from '../../src/services/import-export';

describe('ImportExportService', () => {
  let db: Database;
  let collectionService: CollectionService;
  let service: ImportExportService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    collectionService = new CollectionService(db);
    service = new ImportExportService(db, collectionService);
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
