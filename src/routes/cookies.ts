import { Hono } from 'hono';
import { CookieService } from '../services/cookie';

export function createCookieRoutes(cookieService: CookieService) {
  const router = new Hono();

  router.get('/api/cookies', (c) => {
    const domain = c.req.query('domain');
    const cookies = cookieService.getAll(domain || undefined);
    return c.json({ cookies });
  });

  router.delete('/api/cookies/:id', (c) => {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: '无效的 cookie ID' }, 400);
    }
    const ok = cookieService.deleteById(id);
    if (!ok) {
      return c.json({ error: 'Cookie 不存在' }, 404);
    }
    return c.json({ success: true });
  });

  router.delete('/api/cookies', (c) => {
    const domain = c.req.query('domain');
    if (domain) {
      const deleted = cookieService.deleteByDomain(domain);
      return c.json({ success: true, deleted });
    }
    const deleted = cookieService.deleteAll();
    return c.json({ success: true, deleted });
  });

  return router;
}
