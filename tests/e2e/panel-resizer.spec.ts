import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';

test.describe('面板拖拽调整', () => {
  test('拖拽面板分隔条调整请求面板大小', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const container = page.locator('#request-response');
    const box = await container.boundingBox();
    if (!box) throw new Error('Container bounding box not found');

    const resizer = page.locator('#panel-resizer');
    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('Resizer bounding box not found');

    const startX = resizerBox.x + resizerBox.width / 2;
    const startY = resizerBox.y + resizerBox.height / 2;
    const endY = box.y + box.height * 0.65;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.up();

    // 验证 request-panel 的 flex 值在合理范围内
    const requestPanel = page.locator('#request-panel');
    const flex = await requestPanel.evaluate(el => el.style.flex);
    expect(flex).toContain('0 0');
    // 验证百分比值合理 (应该接近 65%)
    const match = flex.match(/(\d+(?:\.\d+)?)%/);
    expect(match).not.toBeNull();
    const pct = parseFloat(match![1]);
    expect(pct).toBeGreaterThan(20);
    expect(pct).toBeLessThan(75);
  });

  test('面板最小宽度限制 20%', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const container = page.locator('#request-response');
    const box = await container.boundingBox();
    if (!box) throw new Error('Container bounding box not found');

    const resizer = page.locator('#panel-resizer');
    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('Resizer bounding box not found');

    const startX = resizerBox.x + resizerBox.width / 2;
    const startY = resizerBox.y + resizerBox.height / 2;
    // 拖到容器最顶部（尝试设置 < 20%）
    const endY = box.y + box.height * 0.05;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.up();

    const requestPanel = page.locator('#request-panel');
    const flex = await requestPanel.evaluate(el => el.style.flex);
    const match = flex.match(/(\d+(?:\.\d+)?)%/);
    expect(match).not.toBeNull();
    const pct = parseFloat(match![1]);
    expect(pct).toBeGreaterThanOrEqual(20);
  });

  test('面板最大宽度限制 75%', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    const container = page.locator('#request-response');
    const box = await container.boundingBox();
    if (!box) throw new Error('Container bounding box not found');

    const resizer = page.locator('#panel-resizer');
    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('Resizer bounding box not found');

    const startX = resizerBox.x + resizerBox.width / 2;
    const startY = resizerBox.y + resizerBox.height / 2;
    // 拖到容器最底部（尝试设置 > 75%）
    const endY = box.y + box.height * 0.95;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.up();

    const requestPanel = page.locator('#request-panel');
    const flex = await requestPanel.evaluate(el => el.style.flex);
    const match = flex.match(/(\d+(?:\.\d+)?)%/);
    expect(match).not.toBeNull();
    const pct = parseFloat(match![1]);
    expect(pct).toBeLessThanOrEqual(75);
  });

  test('拖拽后面板功能正常', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');

    // 拖拽调整面板大小
    const container = page.locator('#request-response');
    const box = await container.boundingBox();
    if (!box) throw new Error('Container bounding box not found');

    const resizer = page.locator('#panel-resizer');
    const resizerBox = await resizer.boundingBox();
    if (!resizerBox) throw new Error('Resizer bounding box not found');

    const startX = resizerBox.x + resizerBox.width / 2;
    const startY = resizerBox.y + resizerBox.height / 2;
    const endY = box.y + box.height * 0.6;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.up();

    // 调整后发送新请求，验证功能正常
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/uuid`, '200');

    // 验证格式切换功能正常
    const formatBar = page.locator('#response-format-bar');
    await expect(formatBar).toBeVisible();
    await page.locator('.format-tab[data-format="raw"]').click();
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
  });
});
