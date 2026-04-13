import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { uniqueId } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';
import { RequestPage } from './pages/request-page';
import { SaveDialogPage } from './pages/save-dialog-page';

/**
 * API 端点覆盖测试
 *
 * 这些测试覆盖后端已实现但前端没有 UI 入口的功能。
 * 通过浏览器内 fetch 直接调用 API 端点，验证端到端正确性。
 */
test.describe('集合重命名', () => {
  let coll: CollectionPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
  });

  test('通过 API 重命名集合后侧边栏更新显示', async ({ page }) => {
    const oldName = uniqueId('重命名前_');
    const newName = uniqueId('重命名后_');
    await coll.createCollection(oldName);

    // 确认旧名称存在
    await expect(coll.tree.locator('.tree-item').filter({ hasText: oldName })).toBeVisible();

    // 通过 API 获取集合 ID 并重命名
    const result = await page.evaluate(async ({ oldName, newName }) => {
      // 获取集合 ID
      const collections = await (await fetch('/api/collections')).json();
      const target = collections.find((c: any) => c.name === oldName);
      if (!target) throw new Error(`Collection "${oldName}" not found`);

      // 重命名
      const res = await fetch(`/api/collections/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      return res.json();
    }, { oldName, newName });

    expect(result.success).toBe(true);

    // 侧边栏不会因直接 API 调用自动刷新，需要重新加载页面
    await page.reload();
    await expect(coll.tree.locator('.tree-item').filter({ hasText: oldName })).not.toBeVisible();
    await expect(coll.tree.locator('.tree-item').filter({ hasText: newName })).toBeVisible();
  });

  test('重命名不存在的集合返回 404', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/collections/999999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '不存在' }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(404);
    expect(result.body.error).toBeDefined();
  });

  test('重命名集合为空名称返回错误', async ({ page }) => {
    const colName = uniqueId('空名测试_');
    await coll.createCollection(colName);

    const result = await page.evaluate(async ({ colName }) => {
      const collections = await (await fetch('/api/collections')).json();
      const target = collections.find((c: any) => c.name === colName);
      if (!target) throw new Error('Collection not found');

      const res = await fetch(`/api/collections/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      return { status: res.status, body: await res.json() };
    }, { colName });

    expect(result.status).toBe(400);
  });
});

test.describe('单条历史记录删除', () => {
  test('通过 API 删除单条历史记录', async ({ page }) => {
    await page.goto('/');

    // 清空历史
    await page.evaluate(async () => {
      await fetch('/api/history', { method: 'DELETE' });
    });

    // 发送请求创建历史
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 获取历史 ID 并删除
    const deleteResult = await page.evaluate(async () => {
      const history = await (await fetch('/api/history')).json();
      if (history.items.length === 0) throw new Error('No history items');
      const id = history.items[0].id;
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      return { status: res.status, body: await res.json(), deletedId: id };
    });

    expect(deleteResult.status).toBe(200);
    expect(deleteResult.body.success).toBe(true);

    // 验证该记录已从历史列表中消失
    const history = await page.evaluate(async (deletedId) => {
      const res = await (await fetch('/api/history')).json();
      return { items: res.items, deletedId };
    }, deleteResult.deletedId);

    expect(history.items.find((h: any) => h.id === history.deletedId)).toBeUndefined();
  });

  test('删除不存在的记录返回 404', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/history/999999', { method: 'DELETE' });
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(404);
    expect(result.body.error).toBeDefined();
  });
});

test.describe('导出单条请求为 curl', () => {
  let coll: CollectionPage;
  let rp: RequestPage;
  let saveDialog: SaveDialogPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    coll = new CollectionPage(page);
    rp = new RequestPage(page);
    saveDialog = new SaveDialogPage(page);
  });

  test('导出 GET 请求生成正确的 curl 命令', async ({ page }) => {
    const colName = uniqueId('curl导出_');
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/get?foo=bar`;
    await rp.setUrl(testUrl);
    await saveDialog.save(colName);

    // 通过 API 导出 curl
    const curlResult = await page.evaluate(async ({ colName }) => {
      const collections = await (await fetch('/api/collections')).json();
      const target = collections.find((c: any) => c.name === colName);
      if (!target || !target.requests || target.requests.length === 0) {
        throw new Error('Saved request not found');
      }
      const requestId = target.requests[0].id;
      const res = await fetch(`/api/export/requests/${requestId}/curl`);
      return { status: res.status, text: await res.text() };
    }, { colName });

    expect(curlResult.status).toBe(200);
    expect(curlResult.text).toContain('curl');
    expect(curlResult.text).toContain(testUrl);
    // GET 是 curl 的默认方法，不会添加 -X GET
    expect(curlResult.text).not.toContain('-X');
  });

  test('导出带请求体的 POST 请求包含 -d 参数', async ({ page }) => {
    const colName = uniqueId('curl导出POST_');
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/post`;
    const body = JSON.stringify({ name: 'test', value: 123 });
    await rp.selectMethod('POST');
    await rp.setUrl(testUrl);
    await rp.switchTab('body');
    await rp.fillBody(body);
    await saveDialog.save(colName);

    const curlResult = await page.evaluate(async ({ colName }) => {
      const collections = await (await fetch('/api/collections')).json();
      const target = collections.find((c: any) => c.name === colName);
      const requestId = target.requests[0].id;
      const res = await fetch(`/api/export/requests/${requestId}/curl`);
      return await res.text();
    }, { colName });

    expect(curlResult).toContain('curl');
    expect(curlResult).toContain('-X POST');
    expect(curlResult).toContain('-d');
    expect(curlResult).toContain('test');
    expect(curlResult).toContain('123');
  });

  test('导出不存在的请求返回错误', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/export/requests/999999/curl');
      return { status: res.status, body: await res.json() };
    });

    expect(result.status).toBe(404);
    expect(result.body.error).toBeDefined();
  });

  test('导出带自定义请求头的请求包含 -H 参数', async ({ page }) => {
    const colName = uniqueId('curl导出头_');
    await coll.createCollection(colName);

    const testUrl = `${MOCK_BASE_URL}/get`;
    await rp.setUrl(testUrl);
    await rp.addHeaderRow('Authorization', 'Bearer test-token');
    await rp.addHeaderRow('X-Custom', 'custom-value');
    await saveDialog.save(colName);

    const curlResult = await page.evaluate(async ({ colName }) => {
      const collections = await (await fetch('/api/collections')).json();
      const target = collections.find((c: any) => c.name === colName);
      const requestId = target.requests[0].id;
      const res = await fetch(`/api/export/requests/${requestId}/curl`);
      return await res.text();
    }, { colName });

    expect(curlResult).toContain('-H');
    expect(curlResult).toContain('Authorization: Bearer test-token');
    expect(curlResult).toContain('X-Custom: custom-value');
  });
});
