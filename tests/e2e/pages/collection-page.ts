import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class CollectionPage {
  readonly page: Page;
  readonly newCollectionBtn: Locator;
  readonly tree: Locator;
  readonly contextMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newCollectionBtn = page.locator('#btn-new-collection');
    this.tree = page.locator('#collection-tree');
    this.contextMenu = page.locator('.context-menu');
  }

  async createCollection(name: string) {
    await this.newCollectionBtn.click();
    await waitForModal(this.page);
    await this.page.locator('#modal .dialog-input').fill(name);
    await this.page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(this.page);
    await this.tree.locator('.tree-item').filter({ hasText: name }).waitFor({ state: 'visible' });
    return this;
  }

  async deleteCollection(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.click({ button: 'right' });
    await this.contextMenu.waitFor({ state: 'visible' });
    await this.contextMenu.locator('.context-menu-item').filter({ hasText: '删除' }).click();
    await this.page.locator('.modal-btn-danger').click();
    await item.waitFor({ state: 'hidden' });
    return this;
  }

  async cancelDeleteCollection(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.click({ button: 'right' });
    // 右键集合直接弹出确认对话框（无 context menu）
    await this.page.locator('#modal .modal-btn-secondary').click();
    await waitForModalClose(this.page);
    return this;
  }

  async rightClickRequest(method: string) {
    const badge = this.tree.locator(`.method-badge.method-${method}`).first();
    await badge.click({ button: 'right' });
    await this.contextMenu.waitFor({ state: 'visible' });
    return this;
  }

  async openCollectionVars(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.locator('.coll-var-btn').click();
    await waitForModal(this.page);
    return this;
  }

  async createNestedCollection(parentName: string, childName: string) {
    // 获取父集合 ID 通过 API 查询
    const collections = await this.page.evaluate(async () => {
      const res = await fetch('/api/collections');
      return res.json();
    });
    const parent = collections.find((c: any) => c.name === parentName);
    const parentId = parent?.id;

    if (!parentId) throw new Error(`Parent collection "${parentName}" not found`);

    // 通过 API 创建子集合
    const result = await this.page.evaluate(async ({ parentId, childName }) => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: childName, parent_id: parentId }),
      });
      return res.json();
    }, { parentId, childName });

    if (!result?.id) throw new Error(`Failed to create nested collection: ${JSON.stringify(result)}`);

    // 等待树刷新（子集合名称出现）
    await this.tree.locator('.tree-item').filter({ hasText: childName }).waitFor({ state: 'visible', timeout: 5000 });
    return this;
  }

  async getRequestNames(): Promise<string[]> {
    const badges = this.tree.locator('.method-badge');
    const count = await badges.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).locator('..').locator('.name').textContent();
      if (text) names.push(text);
    }
    return names;
  }
}
