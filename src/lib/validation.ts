import { z } from 'zod';
import type { Context } from 'hono';

export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super('请求参数无效');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export function parseBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  return c.req.json().then((data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new ValidationError(issues);
    }
    return result.data;
  }).catch((err: unknown) => {
    if (err instanceof ValidationError) throw err;
    // JSON 解析错误
    throw new ValidationError([getErrorMessage(err)]);
  });
}

export function parseParam(c: Context, name: string): number {
  const raw = c.req.param(name);
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || raw.includes('.')) {
    throw new ValidationError([`参数 "${name}" 不是有效的整数: "${raw}"`]);
  }
  return parsed;
}

export function parseQuery<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const raw = c.req.query();
  // Hono returns empty string for missing query params; convert to undefined for optional fields
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    data[key] = value === '' ? undefined : value;
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    throw new ValidationError(issues);
  }
  return result.data;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err !== null && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return '未知错误';
}
