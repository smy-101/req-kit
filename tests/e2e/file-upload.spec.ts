import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait } from './helpers/wait';
import { RequestPage } from './pages/request-page';
import { ResponsePage } from './pages/response-page';

test.describe('Binary 文件上传', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
  });

  test('上传文本文件并发送请求', async ({ page }) => {
    const resp = new ResponsePage(page);

    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('binary');

    // 使用 FilePayload 上传文件（无需创建真实文件）
    await rp.setBinaryFile({
      name: 'test-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello from binary upload'),
    });

    // 等待文件名显示
    await expect(page.locator('.binary-filename')).toContainText('test-upload.txt');

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // mock server /post 回显请求体内容
    await expect(resp.formatContent).toContainText('hello from binary upload');
  });

  test('上传文件后显示文件名', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('binary');

    await rp.setBinaryFile({
      name: 'my-test-file.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });

    await expect(page.locator('.binary-filename')).toContainText('my-test-file.json');
    await expect(page.locator('.binary-content-type')).toContainText('application/json');
  });

  test('Binary 上传自动设置 Content-Type', async ({ page }) => {
    const resp = new ResponsePage(page);

    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('binary');

    await rp.setBinaryFile({
      name: 'data.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"test": true}'),
    });

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // mock server 回显请求头，应包含自动设置的 Content-Type
    await expect(resp.formatContent).toContainText('application/json');
  });
});

test.describe('Multipart 文件上传', () => {
  let rp: RequestPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    rp = new RequestPage(page);
  });

  test('Multipart 中混合文本字段和文件字段', async ({ page }) => {
    const resp = new ResponsePage(page);

    await rp.selectMethod('POST');
    await rp.switchTab('body');
    await rp.selectBodyType('multipart');

    // 第一行：文本字段
    const firstRow = rp.multipartRows.first();
    await firstRow.locator('.multipart-key').fill('textField');
    await firstRow.locator('.multipart-text-value').fill('text_value');

    // 添加第二行并设为文件类型
    await rp.multipartAddBtn.click();
    await rp.setMultipartRowType(1, 'file');
    await rp.multipartRows.nth(1).locator('.multipart-key').fill('fileField');
    await rp.setMultipartFile(1, {
      name: 'upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('file content here'),
    });

    await sendRequestAndWait(page, `${MOCK_BASE_URL}/post`, '200');

    // mock server 回显原始 multipart body，应包含文本字段名和文件内容
    await expect(resp.formatContent).toContainText('textField');
    await expect(resp.formatContent).toContainText('file content here');
  });

  test('Multipart 文件字段显示文件名', async ({ page }) => {
    await rp.switchTab('body');
    await rp.selectBodyType('multipart');

    // 将默认行切换为文件类型
    await rp.setMultipartRowType(0, 'file');

    await rp.setMultipartFile(0, {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });

    // 文件按钮应显示文件名
    await expect(page.locator('.multipart-file-btn')).toContainText('document.pdf');
  });
});
