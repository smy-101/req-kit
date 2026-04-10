import type { Context } from 'hono';
import { ValidationError } from './validation';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ValidationError) {
    return c.json({ error: '请求参数无效', details: err.issues }, 400);
  }
  console.error('[Unhandled]', err);
  return c.json({ error: '服务器内部错误' }, 500);
}
