import type { Page, Locator } from '../fixtures';

export class AppPage {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly sidebar: Locator;
  readonly panelResizer: Locator;
  readonly requestPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('#btn-theme-toggle');
    this.sidebar = page.locator('#sidebar');
    this.panelResizer = page.locator('#panel-resizer');
    this.requestPanel = page.locator('#request-panel');
  }

  async navigate() {
    await this.page.goto('/');
    return this;
  }

  async toggleTheme() {
    await this.themeToggle.click();
    return this;
  }

  async getTheme(): Promise<string | null> {
    return this.page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  }

  async pressShortcut(keys: string) {
    await this.page.keyboard.press(keys);
    return this;
  }
}
