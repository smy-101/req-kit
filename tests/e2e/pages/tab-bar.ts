import type { Page, Locator } from '../fixtures';

export class TabBar {
  readonly page: Page;
  readonly addBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBtn = page.locator('.request-tab-add');
  }

  async addTab() {
    await this.addBtn.click();
    return this;
  }

  async switchToTab(index: number) {
    await this.page.locator('.request-tab').nth(index).click();
    await this.page.locator('.request-tab.active').waitFor({ state: 'visible' });
    return this;
  }

  async closeTab(index: number) {
    await this.page.locator('.request-tab-close').nth(index).click();
    return this;
  }

  async getTabCount(): Promise<number> {
    return this.page.locator('.request-tab').count();
  }

  async getActiveTabTitle(): Promise<string> {
    return this.page.locator('.request-tab.active .request-tab-title').textContent() ?? '';
  }
}
