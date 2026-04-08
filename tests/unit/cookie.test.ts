import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from '../../src/db/index';
import { CookieService } from '../../src/services/cookie';

describe('CookieService', () => {
  let db: Database;
  let service: CookieService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    service = new CookieService(db);
  });

  describe('parseSetCookie', () => {
    test('parses simple Set-Cookie', () => {
      const result = service.parseSetCookie('sessionId=abc123', 'example.com');
      expect(result.name).toBe('sessionId');
      expect(result.value).toBe('abc123');
      expect(result.domain).toBe('example.com');
      expect(result.path).toBe('/');
      expect(result.expires_at).toBeNull();
      expect(result.http_only).toBe(0);
      expect(result.secure).toBe(0);
      expect(result.same_site).toBeNull();
    });

    test('parses Set-Cookie with all attributes', () => {
      const result = service.parseSetCookie(
        'token=xyz; Domain=.example.com; Path=/api; Max-Age=3600; HttpOnly; Secure; SameSite=Lax',
        'api.example.com'
      );
      expect(result.name).toBe('token');
      expect(result.value).toBe('xyz');
      expect(result.domain).toBe('.example.com');
      expect(result.path).toBe('/api');
      expect(result.expires_at).not.toBeNull();
      expect(result.http_only).toBe(1);
      expect(result.secure).toBe(1);
      expect(result.same_site).toBe('lax');
    });

    test('parses Expires attribute', () => {
      const result = service.parseSetCookie(
        'id=123; Expires=Wed, 09 Jun 2027 10:18:14 GMT',
        'example.com'
      );
      expect(result.name).toBe('id');
      expect(result.value).toBe('123');
      expect(result.expires_at).not.toBeNull();
      // Verify it's a valid ISO date
      const d = new Date(result.expires_at!);
      expect(d.getFullYear()).toBe(2027);
    });

    test('parses Max-Age=0 as expired', () => {
      const result = service.parseSetCookie('sess=abc; Max-Age=0', 'example.com');
      expect(result.expires_at).not.toBeNull();
      expect(new Date(result.expires_at!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('defaults domain to requestHost when no Domain attribute', () => {
      const result = service.parseSetCookie('foo=bar', 'api.test.com');
      expect(result.domain).toBe('api.test.com');
    });

    test('handles cookie with empty value', () => {
      const result = service.parseSetCookie('empty=; Path=/', 'example.com');
      expect(result.name).toBe('empty');
      expect(result.value).toBe('');
    });
  });

  describe('storeCookies', () => {
    test('stores simple cookie', () => {
      const results = service.storeCookies(['sessionId=abc123'], 'example.com');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('sessionId');
      expect(results[0].value).toBe('abc123');
      expect(results[0].cookie_action).toBe('added');
    });

    test('stores multiple Set-Cookie headers', () => {
      const results = service.storeCookies(['a=1', 'b=2'], 'example.com');
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('a');
      expect(results[1].name).toBe('b');
    });

    test('upserts existing cookie', () => {
      service.storeCookies(['token=old'], 'example.com');
      const results = service.storeCookies(['token=new'], 'example.com');
      expect(results[0].cookie_action).toBe('updated');
      expect(results[0].value).toBe('new');

      // Should still have only one cookie
      const all = service.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].value).toBe('new');
    });

    test('stores cookie with domain attribute', () => {
      const results = service.storeCookies(
        ['id=42; Domain=.example.com'],
        'api.example.com'
      );
      expect(results[0].domain).toBe('.example.com');
    });
  });

  describe('getMatchingCookies', () => {
    test('matches exact domain', () => {
      service.storeCookies(['token=abc'], 'example.com');
      const matches = service.getMatchingCookies('https://example.com/api');
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('token');
    });

    test('matches subdomain when domain starts with dot', () => {
      service.storeCookies(['session=xyz; Domain=.example.com'], 'example.com');
      const matches = service.getMatchingCookies('https://api.example.com/v1');
      expect(matches).toHaveLength(1);
    });

    test('does not match subdomain when domain is exact (no dot prefix)', () => {
      service.storeCookies(['token=abc'], 'example.com');
      const matches = service.getMatchingCookies('https://api.example.com/v1');
      expect(matches).toHaveLength(0);
    });

    test('matches by path prefix', () => {
      service.storeCookies(['id=1; Path=/api'], 'example.com');
      const matches = service.getMatchingCookies('https://example.com/api/users');
      expect(matches).toHaveLength(1);
    });

    test('does not match non-prefix path', () => {
      service.storeCookies(['id=1; Path=/api'], 'example.com');
      const matches = service.getMatchingCookies('https://example.com/other');
      expect(matches).toHaveLength(0);
    });

    test('secure cookie only matches HTTPS', () => {
      service.storeCookies(['token=abc; Secure'], 'example.com');
      const httpsMatches = service.getMatchingCookies('https://example.com/');
      const httpMatches = service.getMatchingCookies('http://example.com/');
      expect(httpsMatches).toHaveLength(1);
      expect(httpMatches).toHaveLength(0);
    });

    test('expires expired cookies and does not match them', () => {
      service.storeCookies(['old=1; Max-Age=0'], 'example.com');
      // The cookie should be expired and cleaned up
      const matches = service.getMatchingCookies('https://example.com/');
      expect(matches).toHaveLength(0);
    });

    test('sorts by path length descending then name alphabetically', () => {
      service.storeCookies([
        'b=2; Path=/',
        'a=1; Path=/api',
      ], 'example.com');
      const matches = service.getMatchingCookies('https://example.com/api/test');
      expect(matches).toHaveLength(2);
      expect(matches[0].name).toBe('a'); // longer path /api first
      expect(matches[1].name).toBe('b'); // shorter path / second
    });
  });

  describe('buildCookieHeader', () => {
    test('returns null when no matching cookies', () => {
      expect(service.buildCookieHeader('https://example.com/')).toBeNull();
    });

    test('builds cookie header string', () => {
      service.storeCookies(['a=1; Path=/api', 'b=2; Path=/'], 'example.com');
      const header = service.buildCookieHeader('https://example.com/api/test');
      expect(header).toBe('a=1; b=2');
    });
  });

  describe('CRUD methods', () => {
    test('getAll returns all cookies', () => {
      service.storeCookies(['a=1', 'b=2'], 'example.com');
      service.storeCookies(['c=3'], 'other.com');
      expect(service.getAll()).toHaveLength(3);
    });

    test('getAll filters by domain', () => {
      service.storeCookies(['a=1'], 'example.com');
      service.storeCookies(['b=2'], 'other.com');
      const filtered = service.getAll('example.com');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('a');
    });

    test('getAll matches domain with dot prefix', () => {
      service.storeCookies(['x=1; Domain=.example.com'], 'example.com');
      const filtered = service.getAll('example.com');
      expect(filtered).toHaveLength(1);
    });

    test('deleteById removes single cookie', () => {
      service.storeCookies(['a=1', 'b=2'], 'example.com');
      const all = service.getAll();
      const id = all[0].id!;
      expect(service.deleteById(id)).toBe(true);
      expect(service.getAll()).toHaveLength(1);
    });

    test('deleteById returns false for non-existent id', () => {
      expect(service.deleteById(999)).toBe(false);
    });

    test('deleteByDomain removes all cookies for domain', () => {
      service.storeCookies(['a=1', 'b=2'], 'example.com');
      service.storeCookies(['c=3'], 'other.com');
      const deleted = service.deleteByDomain('example.com');
      expect(deleted).toBe(2);
      expect(service.getAll()).toHaveLength(1);
    });

    test('deleteAll removes all cookies', () => {
      service.storeCookies(['a=1'], 'example.com');
      service.storeCookies(['b=2'], 'other.com');
      const deleted = service.deleteAll();
      expect(deleted).toBe(2);
      expect(service.getAll()).toHaveLength(0);
    });
  });
});
