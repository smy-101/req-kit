import type { Page, Locator } from '../fixtures';

export class HistoryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly panel: Locator;
  readonly searchInput: Locator;
  readonly clearBtn: Locator;
  readonly items: Locator;
  readonly emptyMsg: Locator;
  readonly methodChips: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.history-header');
    this.panel = page.locator('.history-panel');
    this.searchInput = page.locator('.history-search-input');
    this.clearBtn = page.locator('.history-clear-btn');
    this.items = page.locator('.history-item');
    this.emptyMsg = page.locator('.history-empty');
    this.methodChips = page.locator('.history-chip');
  }

  async expand() {
    await this.header.click();
    await this.page.locator('.history-panel.expanded').waitFor({ state: 'visible' });
    return this;
  }

  async collapse() {
    await this.header.click();
    await this.page.locator('.history-panel.expanded').waitFor({ state: 'hidden' });
    return this;
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    return this;
  }

  async clearAll() {
    await this.clearBtn.click();
    return this;
  }

  async clearAllWithConfirm() {
    await this.clearBtn.click();
    await this.page.locator('#modal .modal-btn-danger').click();
    await this.emptyMsg.waitFor({ state: 'visible' });
    return this;
  }

  async filterByMethod(method: string) {
    await this.methodChips.filter({ hasText: method }).click();
    return this;
  }

  async loadItem(index: number) {
    await this.items.nth(index).click();
    return this;
  }

  getItemStatus(index: number) {
    return this.items.nth(index).locator('.history-status');
  }

  getItemTime(index: number) {
    return this.items.nth(index).locator('.history-time');
  }

  getItemAgo(index: number) {
    return this.items.nth(index).locator('.history-ago');
  }
}
