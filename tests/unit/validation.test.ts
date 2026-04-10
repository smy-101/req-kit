import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { ValidationError, parseBody, parseParam, parseQuery, getErrorMessage } from '../../src/lib/validation';
import { Hono } from 'hono';

function mockContext(overrides: Record<string, unknown> = {}) {
  const req = {
    json: async () => overrides.jsonBody,
    param: (name: string) => (overrides.params as Record<string, string>)[name],
    query: () => (overrides.query as Record<string, string>) || {},
  };
  return { req } as unknown as Parameters<typeof parseBody>[0];
}

const TestSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });

describe('ValidationError', () => {
  test('has correct name and message', () => {
    const err = new ValidationError(['field: required']);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('请求参数无效');
    expect(err.issues).toEqual(['field: required']);
  });
});

describe('parseBody', () => {
  test('returns parsed data on valid input', async () => {
    const c = mockContext({ jsonBody: { name: 'test', age: 25 } });
    const result = await parseBody(c, TestSchema);
    expect(result).toEqual({ name: 'test', age: 25 });
  });

  test('throws ValidationError on invalid JSON', async () => {
    const c = mockContext({ jsonBody: 'not json' });
    // Simulate JSON parse failure by making json throw
    const badContext = {
      req: {
        json: async () => { throw new SyntaxError('Unexpected token'); },
      },
    } as unknown as Parameters<typeof parseBody>[0];

    await expect(parseBody(badContext, TestSchema)).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError on schema validation failure', async () => {
    const c = mockContext({ jsonBody: { name: '', age: -1 } });
    await expect(parseBody(c, TestSchema)).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError with issues containing field paths', async () => {
    const c = mockContext({ jsonBody: { name: '' } });
    try {
      await parseBody(c, TestSchema);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const ve = err as ValidationError;
      expect(ve.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('parseParam', () => {
  test('returns parsed number for valid param', () => {
    const c = mockContext({ params: { id: '42' } });
    expect(parseParam(c, 'id')).toBe(42);
  });

  test('throws ValidationError for non-numeric param', () => {
    const c = mockContext({ params: { id: 'abc' } });
    expect(() => parseParam(c, 'id')).toThrow(ValidationError);
  });

  test('throws ValidationError for empty param', () => {
    const c = mockContext({ params: { id: '' } });
    expect(() => parseParam(c, 'id')).toThrow(ValidationError);
  });

  test('throws ValidationError for float-like string', () => {
    const c = mockContext({ params: { id: '3.14' } });
    expect(() => parseParam(c, 'id')).toThrow(ValidationError);
  });

  test('throws ValidationError with param name in message', () => {
    const c = mockContext({ params: { id: 'bad' } });
    try {
      parseParam(c, 'id');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const ve = err as ValidationError;
      expect(ve.issues[0]).toContain('id');
    }
  });
});

describe('parseQuery', () => {
  const QuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(20),
  });

  test('returns parsed query with defaults', () => {
    const c = mockContext({ query: {} });
    const result = parseQuery(c, QuerySchema);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  test('parses provided values', () => {
    const c = mockContext({ query: { page: '3', limit: '10' } });
    const result = parseQuery(c, QuerySchema);
    expect(result).toEqual({ page: 3, limit: 10 });
  });

  test('throws ValidationError on invalid query params', () => {
    const c = mockContext({ query: { page: 'abc', limit: '-5' } });
    expect(() => parseQuery(c, QuerySchema)).toThrow(ValidationError);
  });
});

describe('getErrorMessage', () => {
  test('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  test('returns string as-is', () => {
    expect(getErrorMessage('raw string')).toBe('raw string');
  });

  test('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('未知错误');
  });

  test('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('未知错误');
  });

  test('returns fallback for numbers', () => {
    expect(getErrorMessage(42)).toBe('未知错误');
  });

  test('extracts message from plain object with message property', () => {
    expect(getErrorMessage({ message: 'obj error' })).toBe('obj error');
  });
});
