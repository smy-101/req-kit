import { Database } from '../db/index';

export interface Cookie {
  id?: number;
  domain: string;
  path: string;
  name: string;
  value: string;
  expires_at: string | null;
  http_only: number;
  secure: number;
  same_site: string | null;
  created_at?: string;
}

export interface SetCookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires_at: string | null;
  http_only: boolean;
  secure: boolean;
  same_site: string | null;
  cookie_action: 'added' | 'updated';
}

export class CookieService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 解析单个 Set-Cookie header 值
   */
  parseSetCookie(headerValue: string, requestHost: string): Omit<Cookie, 'id' | 'created_at'> {
    const parts = headerValue.split(';').map(p => p.trim());
    const [nameValue, ...attrParts] = parts;

    const eqIdx = nameValue.indexOf('=');
    const name = eqIdx === -1 ? nameValue : nameValue.slice(0, eqIdx);
    const value = eqIdx === -1 ? '' : nameValue.slice(eqIdx + 1);

    let domain = requestHost;
    let path = '/';
    let expiresAt: string | null = null;
    let httpOnly = 0;
    let secure = 0;
    let sameSite: string | null = null;

    for (const attr of attrParts) {
      const colonIdx = attr.indexOf('=');
      const attrName = (colonIdx === -1 ? attr : attr.slice(0, colonIdx)).toLowerCase().trim();
      const attrValue = colonIdx === -1 ? '' : attr.slice(colonIdx + 1).trim();

      switch (attrName) {
        case 'domain':
          // 保留前导 . 用于子域名匹配
          domain = attrValue.startsWith('.') ? attrValue : attrValue;
          break;
        case 'path':
          if (attrValue) path = attrValue;
          break;
        case 'expires': {
          const d = new Date(attrValue);
          if (!isNaN(d.getTime())) {
            expiresAt = d.toISOString();
          }
          break;
        }
        case 'max-age': {
          const seconds = parseInt(attrValue, 10);
          if (!isNaN(seconds)) {
            if (seconds <= 0) {
              expiresAt = new Date(0).toISOString();
            } else {
              expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
            }
          }
          break;
        }
        case 'httponly':
          httpOnly = 1;
          break;
        case 'secure':
          secure = 1;
          break;
        case 'samesite':
          if (attrValue) {
            const lower = attrValue.toLowerCase();
            if (['strict', 'lax', 'none'].includes(lower)) {
              sameSite = lower;
            }
          }
          break;
      }
    }

    return { domain, path, name, value, expires_at: expiresAt, http_only: httpOnly, secure, same_site: sameSite };
  }

  /**
   * 解析并 upsert 多个 Set-Cookie header 到数据库
   * 返回每条 cookie 的 info（含 cookie_action 标记）
   */
  storeCookies(setCookieHeaders: string[], requestHost: string): SetCookieInfo[] {
    const results: SetCookieInfo[] = [];

    for (const header of setCookieHeaders) {
      if (!header || !header.trim()) continue;
      const parsed = this.parseSetCookie(header, requestHost);

      const existing = this.db.queryOne<{ id: number }>(
        'SELECT id FROM cookies WHERE domain = ? AND path = ? AND name = ?',
        [parsed.domain, parsed.path, parsed.name]
      );

      const action: 'added' | 'updated' = existing ? 'updated' : 'added';

      this.db.run(
        `INSERT INTO cookies (domain, path, name, value, expires_at, http_only, secure, same_site)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(domain, path, name) DO UPDATE SET
           value = excluded.value,
           expires_at = excluded.expires_at,
           http_only = excluded.http_only,
           secure = excluded.secure,
           same_site = excluded.same_site`,
        [parsed.domain, parsed.path, parsed.name, parsed.value, parsed.expires_at, parsed.http_only, parsed.secure, parsed.same_site]
      );

      results.push({
        name: parsed.name,
        value: parsed.value,
        domain: parsed.domain,
        path: parsed.path,
        expires_at: parsed.expires_at,
        http_only: parsed.http_only === 1,
        secure: parsed.secure === 1,
        same_site: parsed.same_site,
        cookie_action: action,
      });
    }

    return results;
  }

  /**
   * 按域名/路径/Secure/过期匹配 cookie，并懒清理过期项
   * 返回匹配的 cookie 列表（按 path 长度降序、name 字母序排列）
   */
  getMatchingCookies(url: string): Cookie[] {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return [];
    }

    const requestHost = parsedUrl.hostname.toLowerCase();
    const requestPath = parsedUrl.pathname || '/';
    const isSecure = parsedUrl.protocol === 'https:';

    // 懒清理过期 cookie
    this.db.run(
      "DELETE FROM cookies WHERE expires_at IS NOT NULL AND expires_at != '' AND datetime(expires_at) < datetime('now')"
    );

    // 获取所有未过期 cookie
    const allCookies = this.db.query<Cookie>(
      `SELECT * FROM cookies
       WHERE expires_at IS NULL OR expires_at = '' OR datetime(expires_at) >= datetime('now')`
    );

    const matched = allCookies.filter(c => {
      // Domain 匹配
      const cookieDomain = c.domain.toLowerCase().replace(/^\./, '');
      if (cookieDomain !== requestHost && !requestHost.endsWith('.' + cookieDomain)) {
        return false;
      }

      // 如果 domain 不以 . 开头且不是精确匹配，说明原 Set-Cookie 没有 Domain 属性
      // 此时只精确匹配（不匹配子域名），但我们的存储已经保留了原始 domain
      // 当 domain 不以 . 开头时，只有精确主机名匹配
      if (!c.domain.startsWith('.') && cookieDomain !== requestHost) {
        return false;
      }

      // Path 匹配：cookie-path 是 request-path 的前缀
      if (!requestPath.startsWith(c.path)) {
        return false;
      }

      // Secure 检查
      if (c.secure && !isSecure) {
        return false;
      }

      return true;
    });

    // 按 path 长度降序，再按 name 字母序排列
    matched.sort((a, b) => {
      if (b.path.length !== a.path.length) return b.path.length - a.path.length;
      return a.name.localeCompare(b.name);
    });

    return matched;
  }

  /**
   * 生成 Cookie header 值
   */
  buildCookieHeader(url: string): string | null {
    const cookies = this.getMatchingCookies(url);
    if (cookies.length === 0) return null;
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  }

  /**
   * 获取所有 cookie，支持按域名过滤
   */
  getAll(domain?: string): Cookie[] {
    if (domain) {
      const lowerDomain = domain.toLowerCase();
      return this.db.query<Cookie>(
        'SELECT * FROM cookies WHERE LOWER(domain) = ? OR LOWER(domain) = ? ORDER BY domain, path, name',
        [lowerDomain, '.' + lowerDomain]
      );
    }
    return this.db.query<Cookie>('SELECT * FROM cookies ORDER BY domain, path, name');
  }

  /**
   * 删除单条 cookie
   */
  deleteById(id: number): boolean {
    const result = this.db.run('DELETE FROM cookies WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 删除指定域名下所有 cookie
   */
  deleteByDomain(domain: string): number {
    const lowerDomain = domain.toLowerCase();
    const result = this.db.run(
      'DELETE FROM cookies WHERE LOWER(domain) = ? OR LOWER(domain) = ?',
      [lowerDomain, '.' + lowerDomain]
    );
    return result.changes;
  }

  /**
   * 清空所有 cookie
   */
  deleteAll(): number {
    const result = this.db.run('DELETE FROM cookies');
    return result.changes;
  }
}
