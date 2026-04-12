import type { Page, Locator } from '../fixtures';

export class HistoryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly panel: Locator;
  readonly searchInput: Locator;
  readonly clearBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.history-header');
    this.panel = page.locator('.history-panel');
    this.searchInput = page.locator('.history-search-input');
    this.clearBtn = page.locator('.history-clear-btn');
  }

  async expand() {
    await this.header.click();
    await this.page.locator('.history-panel.expanded').waitFor({ state: 'visible', timeout: 5_000 });
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

  async loadItem(index: number) {
    await this.page.locator('.history-item').nth(index).click();
    return this;
  }
}
