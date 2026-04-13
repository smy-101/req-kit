import type { Page, Locator } from '../fixtures';

export class RunnerPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly closeBtn: Locator;
  readonly stopBtn: Locator;
  readonly runBtn: Locator;
  readonly retryCount: Locator;
  readonly retryDelay: Locator;
  readonly summary: Locator;
  readonly progressText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('.runner-panel');
    this.closeBtn = page.locator('#runner-close-btn');
    this.stopBtn = page.locator('#runner-stop-btn');
    this.runBtn = page.locator('#runner-run-btn');
    this.retryCount = page.locator('#runner-retry-count');
    this.retryDelay = page.locator('#runner-retry-delay');
    this.summary = page.locator('#runner-summary');
    this.progressText = page.locator('#runner-progress-text');
  }

  async waitForPanel() {
    await this.panel.waitFor({ state: 'visible' });
    return this;
  }

  async run() {
    await this.runBtn.click();
    return this;
  }

  async close() {
    await this.closeBtn.click();
    await this.panel.waitFor({ state: 'hidden' });
    return this;
  }

  async stop() {
    await this.stopBtn.click();
    return this;
  }

  async setRetry(count: string) {
    await this.retryCount.fill(count);
    return this;
  }

  async setRetryDelay(delay: string) {
    await this.retryDelay.fill(delay);
    return this;
  }
}
