import { Hono } from 'hono';
import { z } from 'zod';
import { CookieService } from '../services/cookie';
import { parseParam, parseQuery } from '../lib/validation';

const CookieQuerySchema = z.object({
  domain: z.string().optional(),
});

export function createCookieRoutes(cookieService: CookieService) {
  const router = new Hono();

  router.get('/api/cookies', (c) => {
    const { domain } = parseQuery(c, CookieQuerySchema);
    const cookies = cookieService.getAll(domain);
    return c.json({ cookies });
  });

  router.delete('/api/cookies/:id', (c) => {
    const id = parseParam(c, 'id');
    const ok = cookieService.deleteById(id);
    if (!ok) {
      return c.json({ error: 'Cookie 不存在' }, 404);
    }
    return c.json({ success: true });
  });

  router.delete('/api/cookies', (c) => {
    const { domain } = parseQuery(c, CookieQuerySchema);
    if (domain) {
      const deleted = cookieService.deleteByDomain(domain);
      return c.json({ success: true, deleted });
    }
    const deleted = cookieService.deleteAll();
    return c.json({ success: true, deleted });
  });

  return router;
}
