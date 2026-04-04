import { Database } from '../db/index';
import { CollectionService, SavedRequest } from './collection';
import { VariableService } from './variable';

export class ImportExportService {
  private db: Database;
  private collectionService: CollectionService;
  private variableService: VariableService;

  constructor(db: Database, collectionService: CollectionService, variableService: VariableService) {
    this.db = db;
    this.collectionService = collectionService;
    this.variableService = variableService;
  }

  // --- Import ---

  parseCurl(curlCommand: string): { method: string; url: string; headers: Record<string, string>; body?: string } | null {
    try {
      let method = 'GET';
      let url = '';
      const headers: Record<string, string> = {};
      let body: string | undefined;

      // Tokenize the curl command
      const tokens = this.tokenizeCurl(curlCommand);
      if (tokens.length === 0) return null;

      // First non-curl token should be the URL or a flag
      let i = 0;
      // Skip 'curl' if present
      if (tokens[0]?.toLowerCase() === 'curl') i++;

      while (i < tokens.length) {
        const token = tokens[i];

        if (token === '-X' || token === '--request') {
          i++;
          if (tokens[i]) method = tokens[i].toUpperCase();
        } else if (token === '-H' || token === '--header') {
          i++;
          if (tokens[i]) {
            const colonIdx = tokens[i].indexOf(':');
            if (colonIdx > 0) {
              const key = tokens[i].slice(0, colonIdx).trim();
              const value = tokens[i].slice(colonIdx + 1).trim();
              headers[key] = value;
            }
          }
        } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
          i++;
          if (tokens[i]) {
            body = tokens[i];
            if (method === 'GET') method = 'POST';
          }
        } else if (!token.startsWith('-') && !url) {
          url = token;
        }
        i++;
      }

      if (!url) return null;
      // Validate URL looks like a real URL
      if (!/^https?:\/\//i.test(url)) return null;
      return { method, url, headers, body };
    } catch {
      return null;
    }
  }

  importCurl(curlCommand: string, collectionId: number): SavedRequest | null {
    const parsed = this.parseCurl(curlCommand);
    if (!parsed) return null;

    return this.collectionService.addRequest(collectionId, {
      name: `${parsed.method} ${parsed.url}`,
      method: parsed.method,
      url: parsed.url,
      headers: Object.keys(parsed.headers).length > 0 ? JSON.stringify(parsed.headers) : undefined,
      body: parsed.body,
    });
  }

  importPostmanCollection(json: any): number | null {
    try {
      if (!json.info || json.info.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json') {
        return null;
      }

      const name = json.info.name || 'Imported Collection';
      const collection = this.collectionService.createCollection(name);

      if (json.item && Array.isArray(json.item)) {
        this.importPostmanItems(json.item, collection.id!);
      }

      // 导入集合变量
      if (json.variable && Array.isArray(json.variable)) {
        const vars = json.variable
          .filter((v: any) => v.key)
          .map((v: any) => ({
            key: v.key,
            value: v.value || '',
            enabled: v.enabled !== false,
          }));
        if (vars.length > 0) {
          this.variableService.replaceForCollection(collection.id!, vars);
        }
      }

      return collection.id!;
    } catch {
      return null;
    }
  }

  private importPostmanItems(items: any[], parentId: number) {
    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        // This is a folder
        const folder = this.collectionService.createCollection(item.name || 'Folder', parentId);
        this.importPostmanItems(item.item, folder.id!);
      } else if (item.request) {
        const req = item.request;
        const method = (typeof req.method === 'string' ? req.method : 'GET').toUpperCase();
        const url = typeof req.url === 'string' ? req.url : (req.url?.raw || '');

        const headers: Record<string, string> = {};
        if (req.header && Array.isArray(req.header)) {
          for (const h of req.header) {
            if (h.key && h.value) headers[h.key] = h.value;
          }
        }

        let body: string | undefined;
        if (req.body?.raw) {
          body = req.body.raw;
        }

        this.collectionService.addRequest(parentId, {
          name: item.name || method,
          method,
          url,
          headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : undefined,
          body,
        });
      }
    }
  }

  // --- Export ---

  exportPostmanCollection(collectionId: number): any | null {
    const tree = this.collectionService.getTree();
    const collection = this.findCollectionInTree(tree, collectionId);
    if (!collection) return null;

    // 查询集合变量
    const variables = this.variableService.getByCollection(collectionId);

    const result: any = {
      info: {
        name: collection.name,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: this.buildPostmanItems(collection),
    };

    if (variables.length > 0) {
      result.variable = variables.map(v => ({
        key: v.key,
        value: v.value || '',
        enabled: v.enabled === 1,
      }));
    }

    return result;
  }

  private findCollectionInTree(tree: any[], id: number): any {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findCollectionInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private buildPostmanItems(collection: any): any[] {
    const items: any[] = [];

    if (collection.children) {
      for (const child of collection.children) {
        items.push({
          name: child.name,
          item: this.buildPostmanItems(child),
        });
      }
    }

    if (collection.requests) {
      for (const req of collection.requests) {
        const headers = req.headers ? JSON.parse(req.headers) : {};
        const headerArray = Object.entries(headers).map(([key, value]) => ({ key, value }));

        items.push({
          name: req.name,
          request: {
            method: req.method || 'GET',
            header: headerArray,
            url: req.url || '',
            body: req.body ? { mode: 'raw', raw: req.body } : undefined,
          },
        });
      }
    }

    return items;
  }

  exportCurl(requestId: number): string | null {
    const requests = this.db.query<any>('SELECT * FROM saved_requests WHERE id = ?', [requestId]);
    if (requests.length === 0) return null;

    const req = requests[0];
    let curl = `curl '${req.url || ''}'`;

    if (req.method && req.method !== 'GET') {
      curl += ` -X ${req.method}`;
    }

    if (req.headers) {
      try {
        const headers = JSON.parse(req.headers);
        for (const [key, value] of Object.entries(headers)) {
          curl += ` -H '${key}: ${value}'`;
        }
      } catch {}
    }

    if (req.body) {
      curl += ` -d '${req.body}'`;
    }

    return curl;
  }

  private tokenizeCurl(cmd: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i];

      if (inSingleQuote) {
        if (ch === "'") {
          inSingleQuote = false;
        } else {
          current += ch;
        }
      } else if (inDoubleQuote) {
        if (ch === '"') {
          inDoubleQuote = false;
        } else {
          current += ch;
        }
      } else if (ch === "'") {
        inSingleQuote = true;
      } else if (ch === '"') {
        inDoubleQuote = true;
      } else if (ch === ' ' || ch === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }

    if (current) tokens.push(current);
    return tokens;
  }
}
