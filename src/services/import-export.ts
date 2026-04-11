import { Database } from '../db/index';
import { CollectionService, SavedRequest, type Collection } from './collection';
import { VariableService } from './variable';
import { findInTree } from '../lib/tree-utils';
import type { PostmanCollection, PostmanItem, PostmanFormDataItem, PostmanVariable } from '../types/postman';

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

  parseCurl(curlCommand: string): { method: string; url: string; headers: Record<string, string>; body?: string; body_type?: string } | null {
    try {
      let method = 'GET';
      let url = '';
      const headers: Record<string, string> = {};
      let body: string | undefined;
      let bodyType: string | undefined;
      const multipartParts: { key: string; type: string; value: string; filename?: string; contentType?: string }[] = [];

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
        } else if (token === '-F' || token === '--form') {
          i++;
          if (tokens[i]) {
            const field = tokens[i];
            const eqIdx = field.indexOf('=');
            if (eqIdx > 0) {
              const key = field.slice(0, eqIdx);
              const val = field.slice(eqIdx + 1);
              if (val.startsWith('@')) {
                multipartParts.push({ key, type: 'file', value: '', filename: val.slice(1), contentType: 'application/octet-stream' });
              } else {
                multipartParts.push({ key, type: 'text', value: val });
              }
            }
            if (method === 'GET') method = 'POST';
            bodyType = 'multipart';
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

      if (bodyType === 'multipart') {
        body = JSON.stringify({ parts: multipartParts });
      }

      return { method, url, headers, body, body_type: bodyType };
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
      body_type: parsed.body_type,
    });
  }

  importPostmanCollection(json: PostmanCollection): number | null {
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
          .filter((v: PostmanVariable) => v.key)
          .map((v: PostmanVariable) => ({
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

  private importPostmanItems(items: PostmanItem[], parentId: number) {
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
        let bodyType: string | undefined;
        if (req.body?.mode === 'graphql') {
          // Postman GraphQL: { query, variables, operationName }
          const gqlObj: Record<string, string> = { query: req.body.graphql?.query || '' };
          if (req.body.graphql?.variables) gqlObj.variables = req.body.graphql.variables;
          if (req.body.graphql?.operationName) gqlObj.operationName = req.body.graphql.operationName;
          body = JSON.stringify(gqlObj);
          bodyType = 'graphql';
        } else if (req.body?.raw) {
          body = req.body.raw;
        } else if (req.body?.mode === 'formdata' && Array.isArray(req.body.formdata)) {
          const parts = req.body.formdata.map((f: PostmanFormDataItem) => {
            if (f.type === 'file') {
              return { key: f.key, type: 'file', value: '', filename: typeof f.src === 'string' ? f.src.split('/').pop() || f.src : 'file', contentType: 'application/octet-stream' };
            }
            return { key: f.key, type: 'text', value: f.value || '' };
          });
          body = JSON.stringify({ parts });
          bodyType = 'multipart';
        }

        this.collectionService.addRequest(parentId, {
          name: item.name || method,
          method,
          url,
          headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : undefined,
          body,
          body_type: bodyType,
        });
      }
    }
  }

  // --- Export ---

  exportPostmanCollection(collectionId: number): PostmanCollection | null {
    const tree = this.collectionService.getTree();
    const collection = findInTree(tree, collectionId);
    if (!collection) return null;

    // 查询集合变量
    const variables = this.variableService.getByCollection(collectionId);

    const result: PostmanCollection = {
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

  private buildPostmanItems(collection: Collection): PostmanItem[] {
    const items: PostmanItem[] = [];

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

        let bodyObj: PostmanRequest['body'] = undefined;
        if (req.body_type === 'multipart' && req.body) {
          try {
            const parsed = JSON.parse(req.body);
            const formdata = (parsed.parts || []).map((p: PostmanFormDataItem) => {
              if (p.type === 'file') {
                return { key: p.key, type: 'file', src: p.filename || 'file' };
              }
              return { key: p.key, value: p.value, type: 'text' };
            });
            bodyObj = { mode: 'formdata', formdata };
          } catch {
            bodyObj = { mode: 'raw', raw: req.body };
          }
        } else if (req.body_type === 'binary' && req.body) {
          try {
            const parsed = JSON.parse(req.body);
            bodyObj = { mode: 'file', file: { content: parsed.data } };
          } catch {
            bodyObj = { mode: 'raw', raw: req.body };
          }
        } else if (req.body_type === 'graphql' && req.body) {
          try {
            const parsed = JSON.parse(req.body);
            bodyObj = { mode: 'graphql', graphql: { query: parsed.query || '', variables: parsed.variables || '', operationName: parsed.operationName || '' } };
          } catch {
            bodyObj = { mode: 'raw', raw: req.body };
          }
        } else if (req.body) {
          bodyObj = { mode: 'raw', raw: req.body };
        }

        items.push({
          name: req.name,
          request: {
            method: req.method || 'GET',
            header: headerArray,
            url: req.url || '',
            body: bodyObj,
          },
        });
      }
    }

    return items;
  }

  exportCurl(requestId: number): string | null {
    const requests = this.db.query<SavedRequest>('SELECT * FROM saved_requests WHERE id = ?', [requestId]);
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

    if (req.body_type === 'multipart' && req.body) {
      try {
        const parsed = JSON.parse(req.body);
        if (parsed.parts) {
          for (const part of parsed.parts) {
            if (part.type === 'file') {
              curl += ` -F '${part.key}=@${part.filename || 'file'}'`;
            } else {
              curl += ` -F '${part.key}=${part.value}'`;
            }
          }
        }
      } catch {}
    } else if (req.body_type === 'binary' && req.body) {
      try {
        const parsed = JSON.parse(req.body);
        curl += ` --data-binary @${parsed.filename || 'data.bin'}`;
      } catch {}
    } else if (req.body_type === 'graphql' && req.body) {
      try {
        const parsed = JSON.parse(req.body);
        if (parsed.query) curl += ` -d '${JSON.stringify(parsed)}'`;
      } catch {}
    } else if (req.body) {
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
