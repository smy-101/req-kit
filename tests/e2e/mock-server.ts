/**
 * 本地 mock HTTP 服务器，模拟 httpbin.org 端点，用于 E2E 测试。
 * 使用 Bun.serve，端口 4000。
 */
const PORT = 4000;

// 最小有效 PNG（1x1 透明像素）
const MINIMAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // RGBA
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readBody(req: Request): Promise<string | undefined> {
  try {
    return await req.text();
  } catch {
    return undefined;
  }
}

function getQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const q = url.split('?')[1];
  if (!q) return params;
  for (const pair of q.split('&')) {
    const [key, val] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(val || '');
  }
  return params;
}

function getHeadersObj(req: Request): Record<string, string> {
  const h: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    // Bun 将所有请求头统一为小写，这里恢复为 Title-Case 以模拟 httpbin.org 行为
    const restored = k.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-');
    h[restored] = v;
  });
  return h;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // 健康检查
    if (path === '/' && method === 'GET') {
      return new Response('ok', { status: 200 });
    }

    // /get (GET or HEAD)
    if (path === '/get' && (method === 'GET' || method === 'HEAD')) {
      const data = {
        args: getQueryParams(url.toString()),
        headers: getHeadersObj(req),
        method: method === 'HEAD' ? 'HEAD' : 'GET',
        url: url.toString(),
      };
      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return json(data);
    }

    // /post or /post/:id
    if (path === '/post' || path.match(/^\/post\/\w+$/) ) {
      const body = await readBody(req);
      return json({
        args: getQueryParams(url.toString()),
        data: body,
        headers: getHeadersObj(req),
        method: 'POST',
        url: url.toString(),
      });
    }

    // /put
    if (path === '/put' && method === 'PUT') {
      return json({
        args: getQueryParams(url.toString()),
        headers: getHeadersObj(req),
        method: 'PUT',
        url: url.toString(),
      });
    }

    // /patch
    if (path === '/patch' && method === 'PATCH') {
      return json({
        args: getQueryParams(url.toString()),
        headers: getHeadersObj(req),
        method: 'PATCH',
        url: url.toString(),
      });
    }

    // /delete
    if (path === '/delete' && method === 'DELETE') {
      return json({
        args: getQueryParams(url.toString()),
        headers: getHeadersObj(req),
        method: 'DELETE',
        url: url.toString(),
      });
    }

    // /anything — 任意方法回显
    if (path.startsWith('/anything')) {
      const body = await readBody(req);
      return json({
        args: getQueryParams(url.toString()),
        data: body,
        headers: getHeadersObj(req),
        method,
        url: url.toString(),
      });
    }

    // /json
    if (path === '/json' && method === 'GET') {
      return json({
        slideshow: {
          author: 'Yours Truly',
          date: 'date of publication',
          slides: [
            { title: 'Wake up to WonderWidgets!', type: 'all' },
            { title: 'Overview', type: 'all', items: ['Why <em>WonderWidgets</em> are great', 'Who <em>buys</em> WonderWidgets'] },
          ],
          title: 'Sample Slide Show',
        },
      });
    }

    // /xml
    if (path === '/xml' && method === 'GET') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<slideshow title="Sample Slide Show" author="Yours Truly" date="date of publication">
  <slide type="all">
    <title>Wake up to WonderWidgets!</title>
  </slide>
  <slide type="all">
    <title>Overview</title>
    <item>Why <em>WonderWidgets</em> are great</item>
    <item>Who <em>buys</em> WonderWidgets</item>
  </slide>
</slideshow>`,
        { headers: { 'Content-Type': 'application/xml' } },
      );
    }

    // /html
    if (path === '/html' && method === 'GET') {
      return new Response(
        `<!DOCTYPE html>
<html>
<head><title>Mochi</title></head>
<body>
  <h1>Mochi</h1>
  <div>A mock server for testing HTTP requests.</div>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    // /image/png
    if (path === '/image/png' && method === 'GET') {
      return new Response(MINIMAL_PNG, {
        headers: { 'Content-Type': 'image/png' },
      });
    }

    // /uuid
    if (path === '/uuid' && method === 'GET') {
      return json({ uuid: uuid() });
    }

    // /status/:code
    const statusMatch = path.match(/^\/status\/(\d+)$/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      return json({ status: code }, code);
    }

    // /redirect/:n
    const redirectMatch = path.match(/^\/redirect\/(\d+)$/);
    if (redirectMatch) {
      const n = parseInt(redirectMatch[1], 10);
      if (n <= 0) {
        return json({ message: 'No more redirects' });
      }
      const remaining = n - 1;
      const target = remaining > 0 ? `/redirect/${remaining}` : '/get';
      return new Response(null, {
        status: 302,
        headers: { Location: target },
      });
    }

    // /delay/:seconds
    const delayMatch = path.match(/^\/delay\/(\d+(?:\.\d+)?)$/);
    if (delayMatch) {
      const seconds = parseFloat(delayMatch[1]);
      await Bun.sleep(seconds * 1000);
      return json({
        args: getQueryParams(url.toString()),
        headers: getHeadersObj(req),
        method,
        url: url.toString(),
      });
    }

    // /cookies/set
    if (path === '/cookies/set' && method === 'GET') {
      const params = getQueryParams(url.toString());
      const cookiePairs = Object.entries(params).map(([k, v]) => `${k}=${v}; Path=/`);
      const body = JSON.stringify({ cookies: params });
      // 使用 Headers 对象以支持多个 Set-Cookie 头（对象字面量不支持同键多值）
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      for (const pair of cookiePairs) {
        headers.append('Set-Cookie', pair);
      }
      return new Response(body, { headers });
    }

    // /response-headers
    if (path === '/response-headers' && method === 'GET') {
      const params = getQueryParams(url.toString());
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        headers[k] = v;
      }
      // Set-Cookie 需要特殊处理，httpbin 也用逗号分隔多个
      if (params['Set-Cookie']) {
        const cookies = params['Set-Cookie'].split(',').map(c => c.trim());
        const resp = new Response(JSON.stringify({ headers: params }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookies,
          },
        });
        return resp;
      }
      return new Response(JSON.stringify({ headers: params }), {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    }

    // /flaky — 间歇性失败端点，前 N 次返回 500，之后返回 200
// 用法: GET /flaky?fail_count=2
const flakyCounts = new Map<string, number>();
const flakyMatch = path.match(/^\/flaky$/);
if (flakyMatch && method === 'GET') {
  const params = getQueryParams(url.toString());
  const failCount = parseInt(params['fail_count'] || '1', 10);
  const key = url.toString();
  const current = flakyCounts.get(key) || 0;
  flakyCounts.set(key, current + 1);
  if (current < failCount) {
    return json({ error: 'Internal Server Error', attempt: current + 1 }, 500);
  }
  return json({ message: 'OK', attempts: current + 1 });
}

// /stream — SSE 流式响应端点
// 用法: GET /stream?count=5
const streamMatch = path.match(/^\/stream$/);
if (streamMatch && method === 'GET') {
  const params = getQueryParams(url.toString());
  const count = Math.min(Math.max(parseInt(params['count'] || '5', 10), 1), 100);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 1; i <= count; i++) {
        const event = `event: message\ndata: ${JSON.stringify({ id: i, message: `chunk ${i}` })}\n\n`;
        controller.enqueue(encoder.encode(event));
        if (i < count) await Bun.sleep(100);
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// /large-json — 600+ 行 JSON 响应，触发虚拟滚动
const largeJsonMatch = path.match(/^\/large-json$/);
if (largeJsonMatch && method === 'GET') {
  const data = { items: Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    description: `Description for item ${i + 1} with some extra text`,
    tags: [`tag-${i % 10}`, `category-${i % 5}`],
    active: i % 3 !== 0,
  }))};
  return json(data);
}

// /oversized — 超过 MAX_RESPONSE_SIZE (50KB) 的纯文本响应，用于截断测试
const oversizedMatch = path.match(/^\/oversized$/);
if (oversizedMatch && method === 'GET') {
  return new Response('x'.repeat(60000), {
    headers: { 'Content-Type': 'text/plain' },
  });
}

return json({ error: 'Not Found' }, 404);
  },
});

console.log(`Mock server running on http://localhost:${PORT}`);
