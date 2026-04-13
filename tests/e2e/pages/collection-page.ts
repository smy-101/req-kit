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
    await this.page.locator('#modal .dialog-input').first().fill(name);
    await this.page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(this.page);
    await this.tree.locator('.tree-item').filter({ hasText: name }).waitFor({ state: 'visible' });
    return this;
  }

  async deleteCollection(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.click({ button: 'right' });
    // 右键集合直接弹出确认对话框（无 context menu）
    await waitForModal(this.page);
    await this.page.locator('.modal-btn-danger').click();
    await waitForModalClose(this.page);
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
    await this.newCollectionBtn.click();
    await waitForModal(this.page);
    const inputs = this.page.locator('#modal .dialog-input');
    await inputs.nth(0).fill(childName);
    // 选择父集合（第二个 dialog-input 是 select）
    await inputs.nth(1).selectOption({ label: parentName });
    await this.page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(this.page);
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
