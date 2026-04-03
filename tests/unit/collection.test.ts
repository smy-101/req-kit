import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { CollectionService } from '../../src/services/collection';

describe('CollectionService', () => {
  let db: Database;
  let service: CollectionService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    service = new CollectionService(db);
  });

  afterAll(() => {
    db.close();
  });

  describe('collection CRUD', () => {
    test('creates a top-level collection', () => {
      const col = service.createCollection('用户接口');
      expect(col.id).toBeDefined();
      expect(col.name).toBe('用户接口');
      expect(col.parent_id).toBeNull();
    });

    test('creates a sub-folder', () => {
      const parent = service.createCollection('用户接口');
      const child = service.createCollection('认证', parent.id);
      expect(child.parent_id).toBe(parent.id);
    });

    test('updates collection name', () => {
      const col = service.createCollection('Old Name');
      const updated = service.updateCollection(col.id!, 'New Name');
      expect(updated).toBe(true);

      const tree = service.getTree();
      expect(tree[0].name).toBe('New Name');
    });

    test('deletes collection with cascade', () => {
      const parent = service.createCollection('Parent');
      const child = service.createCollection('Child', parent.id);
      service.addRequest(parent.id!, { name: 'Req1', method: 'GET', url: 'https://api.example.com' });
      service.addRequest(child.id!, { name: 'Req2', method: 'POST', url: 'https://api.example.com' });

      const deleted = service.deleteCollection(parent.id!);
      expect(deleted).toBe(true);

      const tree = service.getTree();
      expect(tree.length).toBe(0);
    });

    test('moves collection', () => {
      const col1 = service.createCollection('Col1');
      const col2 = service.createCollection('Col2');
      const moved = service.moveCollection(col2.id!, col1.id!, 1);
      expect(moved).toBe(true);

      const tree = service.getTree();
      expect(tree[0].children!.length).toBe(1);
    });
  });

  describe('request CRUD', () => {
    test('adds request to collection', () => {
      const col = service.createCollection('Users');
      const req = service.addRequest(col.id!, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });
      expect(req.id).toBeDefined();
      expect(req.collection_id).toBe(col.id);
    });

    test('updates request', () => {
      const col = service.createCollection('Users');
      const req = service.addRequest(col.id!, {
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });

      const updated = service.updateRequest(col.id!, req.id!, { name: 'All Users', url: 'https://new.api.com/users' });
      expect(updated).toBe(true);

      const tree = service.getTree();
      expect(tree[0].requests![0].name).toBe('All Users');
    });

    test('deletes request', () => {
      const col = service.createCollection('Users');
      const req = service.addRequest(col.id!, { name: 'Req', method: 'GET' });

      const deleted = service.deleteRequest(col.id!, req.id!);
      expect(deleted).toBe(true);

      const tree = service.getTree();
      expect(tree[0].requests!.length).toBe(0);
    });
  });

  describe('tree structure', () => {
    test('builds nested tree', () => {
      const parent = service.createCollection('API');
      const child1 = service.createCollection('Users', parent.id);
      const child2 = service.createCollection('Auth', parent.id);
      service.addRequest(child1.id!, { name: 'List Users', method: 'GET' });
      service.addRequest(child2.id!, { name: 'Login', method: 'POST' });

      const tree = service.getTree();
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('API');
      expect(tree[0].children!.length).toBe(2);
      expect(tree[0].children![0].requests!.length).toBe(1);
    });
  });
});
