import type { Page, Locator } from '../fixtures';
import { expect } from '../fixtures';

export class ResponsePage {
  readonly page: Page;
  readonly statusEl: Locator;
  readonly timeEl: Locator;
  readonly sizeEl: Locator;
  readonly formatBar: Locator;
  readonly formatContent: Locator;
  readonly searchBar: Locator;
  readonly searchInput: Locator;
  readonly searchCount: Locator;
  readonly searchNextBtn: Locator;
  readonly searchPrevBtn: Locator;
  readonly searchCloseBtn: Locator;
  readonly searchToggleBtn: Locator;
  readonly body: Locator;
  readonly headers: Locator;
  readonly cookies: Locator;
  readonly testResults: Locator;
  readonly warningEl: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusEl = page.locator('#response-status');
    this.timeEl = page.locator('#response-time');
    this.sizeEl = page.locator('#response-size');
    this.formatBar = page.locator('#response-format-bar');
    this.formatContent = page.locator('#response-format-content');
    this.searchBar = page.locator('#response-search-bar');
    this.searchInput = page.locator('#response-search-input');
    this.searchCount = page.locator('#response-search-count');
    this.searchNextBtn = page.locator('#search-next-btn');
    this.searchPrevBtn = page.locator('#search-prev-btn');
    this.searchCloseBtn = page.locator('#search-close-btn');
    this.searchToggleBtn = page.locator('#search-toggle-btn');
    this.body = page.locator('#response-body');
    this.headers = page.locator('#response-headers');
    this.cookies = page.locator('#response-cookies');
    this.testResults = page.locator('#response-test-results');
    this.warningEl = page.locator('.response-warning');
  }

  async getStatus(): Promise<string> {
    return (await this.statusEl.textContent()) ?? '';
  }

  async getTime(): Promise<string> {
    return (await this.timeEl.textContent()) ?? '';
  }

  async getSize(): Promise<string> {
    return (await this.sizeEl.textContent()) ?? '';
  }

  async waitForStatus(expectedStatus: string | RegExp, options?: { timeout?: number }) {
    await expect(this.statusEl).toContainText(expectedStatus, options);
    return this;
  }

  async switchTab(tabName: string) {
    const tab = this.page.locator(`#response-panel .tab[data-response-tab="${tabName}"]`);
    await tab.click();
    return this;
  }

  async switchFormat(format: 'pretty' | 'raw' | 'preview') {
    await this.page.locator(`.format-tab[data-format="${format}"]`).click();
    return this;
  }

  async openSearch() {
    await this.searchToggleBtn.click();
    await this.searchBar.waitFor({ state: 'visible' });
    return this;
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchCount.waitFor({ state: 'visible' });
    return this;
  }

  async closeSearch() {
    await this.searchCloseBtn.click();
    await this.searchBar.waitFor({ state: 'hidden' });
    return this;
  }

  async nextMatch() {
    await this.searchNextBtn.click();
    return this;
  }

  async prevMatch() {
    await this.searchPrevBtn.click();
    return this;
  }

  async getSearchCountText(): Promise<string> {
    return (await this.searchCount.textContent()) ?? '';
  }
}
