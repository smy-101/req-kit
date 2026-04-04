import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createEnvironmentRoutes } from '../../src/routes/environments';
import { EnvService } from '../../src/services/environment';
import { Database } from '../../src/db/index';

function createTestApp() {
  const db = new Database(':memory:');
  db.migrate();
  const envService = new EnvService(db);
  const app = new Hono();
  app.route('/', createEnvironmentRoutes(envService));
  return app;
}

describe('Environments Routes Integration', () => {
  let app: Hono;

  beforeAll(() => {
    app = createTestApp();
  });

  test('POST /api/environments - creates environment', async () => {
    const res = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dev' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('dev');
  });

  test('GET /api/environments - lists environments', async () => {
    const res = await app.request('/api/environments');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('PUT /api/environments/:id/variables - replaces variables', async () => {
    const envRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    const env = await envRes.json();

    const varRes = await app.request(`/api/environments/${env.id}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'base_url', value: 'http://localhost:3000' },
        { key: 'token', value: 'abc123' },
      ]),
    });
    expect(varRes.status).toBe(200);
    const vars = await varRes.json();
    expect(vars.length).toBe(2);
  });

  test('DELETE /api/environments/:id - deletes environment', async () => {
    const envRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'todelete' }),
    });
    const env = await envRes.json();

    const delRes = await app.request(`/api/environments/${env.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
  });
});

describe('Environment Full Lifecycle', () => {
  let app: Hono;

  beforeAll(() => {
    app = createTestApp();
  });

  // ── 完整编辑流程验证 (task 6.2) ──
  test('full lifecycle: create → variables → switch → rename → delete', async () => {
    // 1. 新建环境
    const devRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Development' }),
    });
    expect(devRes.status).toBe(201);
    const dev = await devRes.json();

    const stagRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Staging' }),
    });
    expect(stagRes.status).toBe(201);
    const stag = await stagRes.json();

    // 2. 给 Development 编辑变量
    const varRes1 = await app.request(`/api/environments/${dev.id}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'base_url', value: 'http://localhost:3000', enabled: true },
        { key: 'token', value: 'abc123', enabled: true },
      ]),
    });
    expect(varRes1.status).toBe(200);
    const devVars = await varRes1.json();
    expect(devVars.length).toBe(2);

    // 3. 切换到 Staging，给它编辑变量
    const varRes2 = await app.request(`/api/environments/${stag.id}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'base_url', value: 'https://staging.example.com' },
      ]),
    });
    expect(varRes2.status).toBe(200);
    const stagVars = await varRes2.json();
    expect(stagVars.length).toBe(1);

    // 4. 获取全部环境，验证变量按 environment_id 正确分组
    const allRes = await app.request('/api/environments');
    const allEnvs = await allRes.json();
    const devEnv = allEnvs.find(e => e.id === dev.id);
    const stagEnv = allEnvs.find(e => e.id === stag.id);
    expect(devEnv.variables.length).toBe(2);
    expect(stagEnv.variables.length).toBe(1);
    expect(stagEnv.variables[0].key).toBe('base_url');

    // 5. 保存后继续编辑（不重建 Modal 模拟：再次 PUT 同一环境）
    const varRes3 = await app.request(`/api/environments/${dev.id}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'base_url', value: 'http://localhost:3000', enabled: true },
        { key: 'token', value: 'abc123', enabled: true },
        { key: 'new_key', value: 'new_value', enabled: true },
      ]),
    });
    expect(varRes3.status).toBe(200);
    expect((await varRes3.json()).length).toBe(3);

    // 6. 重命名环境
    const renameRes = await app.request(`/api/environments/${dev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dev-Local' }),
    });
    expect(renameRes.status).toBe(200);
    const renamed = await app.request('/api/environments');
    const renamedEnv = (await renamed.json()).find(e => e.id === dev.id);
    expect(renamedEnv.name).toBe('Dev-Local');
    expect(renamedEnv.variables.length).toBe(3); // 变量仍在

    // 7. 重命名为空名应被拒绝
    const emptyRenameRes = await app.request(`/api/environments/${dev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(emptyRenameRes.status).toBe(400);

    // 8. 删除当前选中的环境
    const delRes = await app.request(`/api/environments/${dev.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
    const afterDel = await (await app.request('/api/environments')).json();
    expect(afterDel.length).toBe(1);
    expect(afterDel[0].id).toBe(stag.id);
  });
});
